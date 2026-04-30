import json
import re

from ..config import OPENAI_MODEL
from ..state import openai_client


def _normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def _normalize_boolean(value):
    token = _normalize_text(value)
    if token in {"true", "t", "yes", "y", "1"}:
        return True
    if token in {"false", "f", "no", "n", "0"}:
        return False
    return None


def _resolve_choice_value(value, choices):
    if value is None:
        return None

    token = str(value).strip()
    if not token:
        return None

    if not isinstance(choices, list) or not choices:
        return token

    if token.isdigit():
        idx = int(token)
        if 0 <= idx < len(choices):
            return choices[idx]
        if 1 <= idx <= len(choices):
            return choices[idx - 1]

    if len(token) == 1 and token.upper() in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        idx = ord(token.upper()) - ord("A")
        if 0 <= idx < len(choices):
            return choices[idx]

    normalized_token = _normalize_text(token)
    for choice in choices:
        if _normalize_text(choice) == normalized_token:
            return choice

    return None


def _grade_objective_answer(user_answer, question_type: str, answer_text: str, choices=None):
    if question_type == "multiple_choice":
        resolved_user = _resolve_choice_value(user_answer, choices or [])
        resolved_answer = _resolve_choice_value(answer_text, choices or []) or answer_text
        if not resolved_user:
            return {
                "is_correct": False,
                "feedback": "No answer selected."
            }
        is_correct = _normalize_text(resolved_user) == _normalize_text(resolved_answer)
        return {
            "is_correct": is_correct,
            "feedback": "Correct." if is_correct else "Incorrect."
        }

    bool_user = _normalize_boolean(user_answer)
    bool_answer = _normalize_boolean(answer_text)
    if bool_user is None:
        return {
            "is_correct": False,
            "feedback": "Please answer True or False."
        }
    is_correct = bool_user == bool_answer
    return {
        "is_correct": is_correct,
        "feedback": "Correct." if is_correct else "Incorrect."
    }


def _fallback_short_answer_grade(user_answer, answer_text):
    normalized_user = _normalize_text(user_answer)
    normalized_answer = _normalize_text(answer_text)
    if not normalized_user:
        return False, "No answer provided."

    if normalized_user == normalized_answer:
        return True, "Correct."

    user_terms = {token for token in re.findall(r"[a-z0-9]+", normalized_user) if len(token) > 2}
    answer_terms = {token for token in re.findall(r"[a-z0-9]+", normalized_answer) if len(token) > 2}
    if not answer_terms:
        return False, "Incorrect."

    overlap = len(user_terms.intersection(answer_terms))
    ratio = overlap / max(1, len(answer_terms))
    is_correct = ratio >= 0.5 and overlap >= 2
    return is_correct, "Partially matches expected answer." if is_correct else "Does not match expected answer."


def _grade_short_answer_batch(items):
    if not items:
        return {}

    rubric_rows = []
    for item in items:
        rubric_rows.append({
            "index": item["index"],
            "question_text": item["question_text"],
            "expected_answer": item["answer_text"],
            "user_answer": item["user_answer"]
        })

    system_prompt = """You are grading short-answer quiz responses.
Rules:
1. Grade based on semantic correctness against expected_answer.
2. Be strict but fair with concise student phrasing.
3. Return valid JSON only as array with items:
   {\"index\": number, \"is_correct\": boolean, \"feedback\": string}
4. Keep feedback under 20 words.
"""

    user_prompt = f"""Grade the following responses:
{json.dumps(rubric_rows, ensure_ascii=False)}
"""

    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            max_tokens=1200
        )
        output = response.choices[0].message.content
        from .payloads import _extract_json_block
        json_block = _extract_json_block(output)
        parsed = json.loads(json_block) if json_block else []
        grades = parsed.get("grades") if isinstance(parsed, dict) else parsed
        if not isinstance(grades, list):
            grades = []

        result = {}
        for grade in grades:
            if not isinstance(grade, dict):
                continue
            idx = grade.get("index")
            if not isinstance(idx, int):
                continue
            result[idx] = {
                "is_correct": bool(grade.get("is_correct", False)),
                "feedback": str(grade.get("feedback", "")).strip() or "Evaluated."
            }
        return result
    except Exception:
        fallback = {}
        for item in items:
            is_correct, feedback = _fallback_short_answer_grade(item["user_answer"], item["answer_text"])
            fallback[item["index"]] = {
                "is_correct": is_correct,
                "feedback": feedback
            }
        return fallback
