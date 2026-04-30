import json
import re

from .grading import _normalize_boolean, _normalize_text, _resolve_choice_value


def _extract_json_block(text: str):
    text = (text or "").strip()
    if not text:
        return None

    fenced_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fenced_match:
        candidate = fenced_match.group(1).strip()
        if candidate:
            return candidate

    # Walk the string once so we stop at the first complete JSON block.
    def _extract_first_structure(s, open_ch, close_ch):
        start = s.find(open_ch)
        if start == -1:
            return None
        depth = 0
        in_string = False
        escape_next = False
        for i, ch in enumerate(s[start:], start):
            if escape_next:
                escape_next = False
                continue
            if ch == '\\' and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return s[start:i + 1]
        return None

    array_start = text.find('[')
    obj_start = text.find('{')

    if array_start != -1 and (obj_start == -1 or array_start < obj_start):
        result = _extract_first_structure(text, '[', ']')
        if result:
            return result

    if obj_start != -1:
        result = _extract_first_structure(text, '{', '}')
        if result:
            return result

    return None


def _parse_flashcards_payload(raw_output: str):
    json_block = _extract_json_block(raw_output)
    if not json_block:
        raise ValueError("Model did not return JSON")

    parsed = json.loads(json_block)
    if isinstance(parsed, dict):
        for key in ("cards", "flashcards", "items", "data", "results"):
            if key in parsed and isinstance(parsed[key], list):
                cards = parsed[key]
                break
        else:
            cards = next((v for v in parsed.values() if isinstance(v, list)), None)
    else:
        cards = parsed
    if not isinstance(cards, list):
        raise ValueError("JSON payload must be a list of cards")

    normalized = []
    for item in cards:
        if not isinstance(item, dict):
            continue

        front = str(item.get("front", "")).strip()
        back = str(item.get("back", "")).strip()
        source_chunk_id = item.get("source_chunk_id")
        if source_chunk_id is not None:
            source_chunk_id = str(source_chunk_id).strip() or None

        if front and back:
            normalized.append({
                "front": front,
                "back": back,
                "source_chunk_id": source_chunk_id
            })

    if not normalized:
        raise ValueError("No valid flashcards in model output")

    return normalized


def _parse_quiz_type(value):
    mapping = {
        "multiple_choice": "multiple_choice",
        "multiple-choice": "multiple_choice",
        "mcq": "multiple_choice",
        "true_false": "true_false",
        "true-false": "true_false",
        "truefalse": "true_false",
        "tf": "true_false",
        "short_answer": "short_answer",
        "short-answer": "short_answer",
        "short": "short_answer",
        "free_text": "short_answer",
    }
    token = _normalize_text(value).replace(" ", "_")
    return mapping.get(token)


def _parse_quiz_payload(raw_output: str, valid_chunk_ids, allowed_types):
    json_block = _extract_json_block(raw_output)
    if not json_block:
        raise ValueError("Model did not return JSON")

    parsed = json.loads(json_block)
    questions = parsed.get("questions") if isinstance(parsed, dict) else parsed
    if not isinstance(questions, list):
        raise ValueError("JSON payload must be a list of questions")

    normalized = []
    valid_chunk_ids = set(valid_chunk_ids or [])
    allowed_types = set(allowed_types or [])

    for item in questions:
        if not isinstance(item, dict):
            continue

        question_type = _parse_quiz_type(item.get("type"))
        if question_type not in allowed_types:
            continue

        question_text = str(item.get("question_text", "")).strip()
        answer_text = str(item.get("answer_text", "")).strip()
        if not question_text or not answer_text:
            continue

        choices = None
        if question_type == "multiple_choice":
            raw_choices = item.get("choices", [])
            if not isinstance(raw_choices, list):
                continue

            choices = [str(choice).strip() for choice in raw_choices if str(choice).strip()]
            if len(choices) < 3:
                continue

            resolved_answer = _resolve_choice_value(answer_text, choices)
            if not resolved_answer:
                continue
            answer_text = resolved_answer

        elif question_type == "true_false":
            bool_value = _normalize_boolean(answer_text)
            if bool_value is None:
                continue
            answer_text = "True" if bool_value else "False"
            choices = ["True", "False"]

        elif question_type == "short_answer":
            choices = None

        source_chunk_ids = []
        raw_source_ids = item.get("source_chunk_ids", item.get("source_chunk_id", []))
        if isinstance(raw_source_ids, str):
            raw_source_ids = [raw_source_ids]
        if isinstance(raw_source_ids, list):
            for chunk_id in raw_source_ids:
                chunk_id = str(chunk_id).strip()
                if chunk_id and chunk_id in valid_chunk_ids and chunk_id not in source_chunk_ids:
                    source_chunk_ids.append(chunk_id)

        normalized.append({
            "type": question_type,
            "question_text": question_text,
            "choices": choices,
            "answer_text": answer_text,
            "source_chunk_ids": source_chunk_ids[:3]
        })

    if not normalized:
        raise ValueError("No valid quiz questions in model output")

    return normalized
