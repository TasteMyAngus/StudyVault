import json
import sqlite3
import traceback
import uuid

from fastapi import APIRouter, Body, Form, HTTPException

from .config import DB_PATH, OPENAI_MODEL
from .services.grading import (
    _fallback_short_answer_grade,
    _grade_objective_answer,
    _grade_short_answer_batch,
    _normalize_text,
    _resolve_choice_value,
)
from .services.payloads import (
    _parse_quiz_payload,
    _parse_quiz_type,
)
from .services.quiz_records import (
    _build_attempt_detail,
    _compute_quiz_overview_metrics,
    _get_attempt_summary_rows,
    _get_quiz_row,
)
from .services.sources import (
    _build_source_chunk_payload,
    _load_source_chunks,
)
from .services.topic_mastery import (
    _update_topic_mastery_from_attempt,
)
from .state import openai_client

router = APIRouter()

@router.get("/courses/{course_id}/quizzes")
async def get_course_quizzes(course_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    cursor.execute('''
        SELECT q.quiz_id,
               ss.studyset_id,
               ss.course_id,
               ss.name,
               ss.source_scope,
               ss.source_id,
               q.mode,
               q.created_at,
               COUNT(qq.question_id) AS question_count
        FROM quizzes q
        JOIN study_sets ss ON q.studyset_id = ss.studyset_id
        LEFT JOIN quiz_questions qq ON qq.quiz_id = q.quiz_id
        WHERE ss.course_id = ?
        GROUP BY q.quiz_id
        ORDER BY q.created_at DESC
    ''', (course_id,))

    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


@router.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT quiz_id, studyset_id FROM quizzes WHERE quiz_id = ?', (quiz_id,))
    quiz_row = cursor.fetchone()
    if not quiz_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    studyset_id = quiz_row["studyset_id"]

    try:
        # Responses have to go first because attempts still reference them.
        cursor.execute('''
            DELETE FROM quiz_responses
            WHERE attempt_id IN (
                SELECT attempt_id FROM quiz_attempts WHERE quiz_id = ?
            )
        ''', (quiz_id,))
        cursor.execute('DELETE FROM quiz_attempts WHERE quiz_id = ?', (quiz_id,))
        cursor.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', (quiz_id,))
        cursor.execute('DELETE FROM quizzes WHERE quiz_id = ?', (quiz_id,))
        # Drop the linked study set if nothing else uses it.
        cursor.execute('SELECT COUNT(*) AS cnt FROM quizzes WHERE studyset_id = ?', (studyset_id,))
        remaining = cursor.fetchone()["cnt"]
        if remaining == 0:
            cursor.execute('DELETE FROM study_sets WHERE studyset_id = ?', (studyset_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to delete quiz")

    conn.close()
    return {"deleted": quiz_id}


@router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str):
    # Return quiz questions without leaking the stored answers.
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    quiz_row = _get_quiz_row(cursor, quiz_id)
    if not quiz_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    cursor.execute('''
        SELECT question_id, quiz_id, type, question_text, choices_json, source_chunk_ids_json, topic_id, created_at
        FROM quiz_questions
        WHERE quiz_id = ?
        ORDER BY created_at ASC
    ''', (quiz_id,))

    questions = []
    for row in cursor.fetchall():
        item = dict(row)
        item["choices"] = json.loads(item["choices_json"]) if item.get("choices_json") else None
        item["source_chunk_ids"] = json.loads(item["source_chunk_ids_json"]) if item.get("source_chunk_ids_json") else []
        item["source_chunks"] = _build_source_chunk_payload(cursor, item["source_chunk_ids"])
        item.pop("choices_json", None)
        item.pop("source_chunk_ids_json", None)
        questions.append(item)

    conn.close()
    return {
        "quiz": dict(quiz_row),
        "questions": questions,
        "question_count": len(questions)
    }


@router.get("/quizzes/{quiz_id}/attempts")
async def get_quiz_attempts(quiz_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    quiz_row = _get_quiz_row(cursor, quiz_id)
    if not quiz_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempts = _get_attempt_summary_rows(cursor, quiz_id)
    summary = _compute_quiz_overview_metrics(attempts)

    conn.close()
    return {
        "quiz": dict(quiz_row),
        "attempts": attempts,
        "summary": summary
    }


@router.get("/quizzes/{quiz_id}/attempts/{attempt_id}")
async def get_quiz_attempt_detail(quiz_id: str, attempt_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    quiz_row = _get_quiz_row(cursor, quiz_id)
    if not quiz_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempt_detail = _build_attempt_detail(cursor, quiz_id, attempt_id)
    conn.close()

    return {
        "quiz": dict(quiz_row),
        **attempt_detail
    }


@router.get("/courses/{course_id}/quiz-attempts")
async def get_course_quiz_attempts(course_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    cursor.execute('''
        SELECT qa.attempt_id,
               qa.quiz_id,
               qa.started_at,
               qa.completed_at,
               qa.score,
               ss.name AS quiz_name,
               SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
               COUNT(qr.response_id) AS total_questions
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.quiz_id
        JOIN study_sets ss ON q.studyset_id = ss.studyset_id
        LEFT JOIN quiz_responses qr ON qr.attempt_id = qa.attempt_id
        WHERE ss.course_id = ?
        GROUP BY qa.attempt_id
        ORDER BY COALESCE(qa.completed_at, qa.started_at) DESC
    ''', (course_id,))

    attempts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {
        "course_id": course_id,
        "attempts": attempts
    }


@router.get("/quizzes/{quiz_id}/metrics")
async def get_quiz_metrics(quiz_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    quiz_row = _get_quiz_row(cursor, quiz_id)
    if not quiz_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempts = _get_attempt_summary_rows(cursor, quiz_id)
    summary = _compute_quiz_overview_metrics(attempts)

    cursor.execute('''
        SELECT qq.type,
               SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
               COUNT(qr.response_id) AS total_count
        FROM quiz_responses qr
        JOIN quiz_attempts qa ON qa.attempt_id = qr.attempt_id
        JOIN quiz_questions qq ON qq.question_id = qr.question_id
        WHERE qa.quiz_id = ?
        GROUP BY qq.type
    ''', (quiz_id,))
    breakdown_rows = cursor.fetchall()
    per_type_breakdown = {}
    for row in breakdown_rows:
        total_count = row["total_count"] or 0
        correct_count = row["correct_count"] or 0
        per_type_breakdown[row["type"]] = {
            "total_count": total_count,
            "correct_count": correct_count,
            "rate": (correct_count / total_count) if total_count else None
        }

    cursor.execute('''
        SELECT qq.question_id,
               qq.question_text,
               qq.type,
               qq.source_chunk_ids_json,
               SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
               COUNT(qr.response_id) AS attempt_count
        FROM quiz_questions qq
        LEFT JOIN quiz_responses qr ON qr.question_id = qq.question_id
        LEFT JOIN quiz_attempts qa ON qa.attempt_id = qr.attempt_id
        WHERE qq.quiz_id = ?
        GROUP BY qq.question_id
        ORDER BY qq.created_at ASC
    ''', (quiz_id,))
    question_rows = cursor.fetchall()

    per_question_stats = []
    for row in question_rows:
        attempt_count = row["attempt_count"] or 0
        correct_count = row["correct_count"] or 0
        source_chunk_ids = json.loads(row["source_chunk_ids_json"]) if row["source_chunk_ids_json"] else []

        cursor.execute('''
            SELECT qa.attempt_id,
                   qa.completed_at,
                   qr.is_correct
            FROM quiz_responses qr
            JOIN quiz_attempts qa ON qa.attempt_id = qr.attempt_id
            WHERE qr.question_id = ? AND qa.quiz_id = ?
            ORDER BY COALESCE(qa.completed_at, qa.started_at) DESC
            LIMIT 5
        ''', (row["question_id"], quiz_id))
        recent_rows = [
            {
                "attempt_id": recent_row["attempt_id"],
                "completed_at": recent_row["completed_at"],
                "is_correct": bool(recent_row["is_correct"])
            }
            for recent_row in cursor.fetchall()
        ]

        per_question_stats.append({
            "question_id": row["question_id"],
            "question_text": row["question_text"],
            "type": row["type"],
            "attempt_count": attempt_count,
            "correct_count": correct_count,
            "correctness_rate": (correct_count / attempt_count) if attempt_count else None,
            "recent_attempts": recent_rows,
            "source_chunk_ids": source_chunk_ids
        })

    conn.close()
    return {
        "quiz": dict(quiz_row),
        "summary": summary,
        "per_type_breakdown": per_type_breakdown,
        "per_question_stats": per_question_stats
    }


@router.get("/courses/{course_id}/quiz-metrics")
async def get_course_quiz_metrics(course_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    cursor.execute('''
        SELECT qa.attempt_id,
               qa.quiz_id,
               qa.score,
               qa.completed_at,
               ss.name AS quiz_name
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.quiz_id
        JOIN study_sets ss ON q.studyset_id = ss.studyset_id
        WHERE ss.course_id = ?
        ORDER BY COALESCE(qa.completed_at, qa.started_at) DESC
    ''', (course_id,))
    attempt_rows = [dict(row) for row in cursor.fetchall()]

    quiz_map = {}
    for row in attempt_rows:
        quiz_id = row["quiz_id"]
        if quiz_id not in quiz_map:
            quiz_map[quiz_id] = {
                "quiz_id": quiz_id,
                "quiz_name": row["quiz_name"],
                "scores": []
            }
        if row["score"] is not None:
            quiz_map[quiz_id]["scores"].append(row["score"])

    by_quiz = []
    for value in quiz_map.values():
        scores = value["scores"]
        by_quiz.append({
            "quiz_id": value["quiz_id"],
            "quiz_name": value["quiz_name"],
            "attempt_count": len(scores),
            "latest_score": scores[0] if scores else None,
            "best_score": max(scores) if scores else None,
            "average_score": (sum(scores) / len(scores)) if scores else None
        })

    overall_scores = [row["score"] for row in attempt_rows if row["score"] is not None]
    conn.close()
    return {
        "course_id": course_id,
        "summary": {
            "total_attempts": len(overall_scores),
            "latest_score": overall_scores[0] if overall_scores else None,
            "best_score": max(overall_scores) if overall_scores else None,
            "average_score": (sum(overall_scores) / len(overall_scores)) if overall_scores else None
        },
        "by_quiz": by_quiz
    }


def _get_missed_chunk_areas(cursor, course_id: str, recent_window: int = 200):
    cursor.execute('''
        SELECT qr.question_id, qq.source_chunk_ids_json, qq.question_text
        FROM quiz_responses qr
        JOIN quiz_questions qq ON qq.question_id = qr.question_id
        JOIN quiz_attempts ja ON ja.attempt_id = qr.attempt_id
        JOIN quizzes qz ON qz.quiz_id = ja.quiz_id
        JOIN study_sets ss ON ss.studyset_id = qz.studyset_id
        WHERE qr.is_correct = 0
          AND ss.course_id = ?
        ORDER BY ja.completed_at DESC
        LIMIT ?
    ''', (course_id, recent_window))
    rows = cursor.fetchall()

    chunk_miss_counts = {}
    chunk_questions = {}
    for row in rows:
        source_chunk_ids_raw = row["source_chunk_ids_json"]
        if source_chunk_ids_raw:
            try:
                chunk_ids = json.loads(source_chunk_ids_raw)
            except json.JSONDecodeError:
                chunk_ids = []
        else:
            chunk_ids = []
        for chunk_id in chunk_ids:
            if not chunk_id:
                continue
            chunk_miss_counts[chunk_id] = chunk_miss_counts.get(chunk_id, 0) + 1
            if chunk_id not in chunk_questions:
                chunk_questions[chunk_id] = []
            if len(chunk_questions[chunk_id]) < 2:
                chunk_questions[chunk_id].append(row["question_text"])

    if not chunk_miss_counts:
        return []

    all_chunk_ids = list(chunk_miss_counts.keys())
    placeholders = ",".join(["?"] * len(all_chunk_ids))
    cursor.execute(f'''
        SELECT c.chunk_id,
               c.text,
               c.page_start,
               c.page_end,
               d.doc_id,
               d.title AS doc_title,
               d.doc_type
        FROM chunks c
        JOIN document_versions dv ON c.version_id = dv.version_id
        JOIN documents d ON dv.doc_id = d.doc_id
        WHERE c.chunk_id IN ({placeholders})
          AND d.course_id = ?
    ''', all_chunk_ids + [course_id])
    chunk_doc_map = {row["chunk_id"]: dict(row) for row in cursor.fetchall()}

    doc_areas = {}
    for chunk_id, miss_count in chunk_miss_counts.items():
        doc_info = chunk_doc_map.get(chunk_id)
        if not doc_info:
            continue
        doc_id = doc_info["doc_id"]
        if doc_id not in doc_areas:
            doc_areas[doc_id] = {
                "doc_id": doc_id,
                "label": doc_info["doc_title"],
                "doc_type": doc_info["doc_type"],
                "chunk_ids": [],
                "sections": [],
                "miss_count": 0,
                "example_questions": []
            }
        doc_areas[doc_id]["chunk_ids"].append(chunk_id)
        doc_areas[doc_id]["miss_count"] += miss_count
        section_text = (doc_info.get("text") or "").strip()
        snippet = section_text[:240] + ("…" if len(section_text) > 240 else "")
        doc_areas[doc_id]["sections"].append({
            "chunk_id": chunk_id,
            "miss_count": miss_count,
            "snippet": snippet,
            "page_label": _build_page_label(doc_info.get("page_start"), doc_info.get("page_end")),
            "example_questions": chunk_questions.get(chunk_id, [])[:2]
        })
        for q in chunk_questions.get(chunk_id, []):
            if q not in doc_areas[doc_id]["example_questions"] and len(doc_areas[doc_id]["example_questions"]) < 2:
                doc_areas[doc_id]["example_questions"].append(q)

    areas = sorted(doc_areas.values(), key=lambda a: a["miss_count"], reverse=True)
    for area in areas:
        area["sections"] = sorted(area["sections"], key=lambda s: s["miss_count"], reverse=True)
        area["section_count"] = len(area["sections"])
    return areas


@router.get("/courses/{course_id}/missed-focus-areas")
async def get_missed_focus_areas(course_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")
    areas = _get_missed_chunk_areas(cursor, course_id)
    conn.close()
    return {"course_id": course_id, "areas": areas, "total_missed_areas": len(areas)}


@router.get("/courses/{course_id}/improvement-areas")
async def get_course_improvement_areas(course_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    cursor.execute('''
        SELECT t.topic_id,
               t.label,
               COALESCE(tm.mastery_score, 0.5) AS mastery_score,
               tm.last_updated_at,
             COUNT(DISTINCT tc.chunk_id) AS chunk_count
        FROM topics t
        LEFT JOIN topic_mastery tm ON tm.topic_id = t.topic_id AND tm.course_id = t.course_id
        LEFT JOIN topic_chunks tc ON tc.topic_id = t.topic_id
        WHERE t.course_id = ?
        GROUP BY t.topic_id
        ORDER BY mastery_score ASC, t.label ASC
    ''', (course_id,))
    rows = [dict(row) for row in cursor.fetchall()]

    areas = []
    for row in rows:
        mastery_score = float(row["mastery_score"]) if row["mastery_score"] is not None else 0.5
        # Only topic-scoped quizzes should mark a topic as needing work.


        cursor.execute('''
            SELECT COUNT(DISTINCT qr.response_id) AS explicit_count
            FROM quiz_responses qr
            JOIN quiz_questions qq ON qq.question_id = qr.question_id
            JOIN quizzes qz ON qz.quiz_id = qq.quiz_id
            JOIN study_sets ss ON ss.studyset_id = qz.studyset_id
            WHERE ss.course_id = ?
              AND qq.topic_id = ?
        ''', (course_id, row["topic_id"]))
        explicit_row = cursor.fetchone()
        explicit_count = int(explicit_row["explicit_count"]) if explicit_row and explicit_row["explicit_count"] is not None else 0

        # Document quizzes still count as evidence that the topic has been seen.
        cursor.execute('''
            SELECT COUNT(DISTINCT qr.response_id) AS chunk_count
            FROM quiz_responses qr
            JOIN quiz_questions qq ON qq.question_id = qr.question_id
            JOIN quizzes qz ON qz.quiz_id = qq.quiz_id
            JOIN study_sets ss ON ss.studyset_id = qz.studyset_id
            WHERE ss.course_id = ?
              AND qq.topic_id IS NULL
              AND EXISTS (
                    SELECT 1 FROM topic_chunks tc2
                    WHERE tc2.topic_id = ?
                      AND qq.source_chunk_ids_json IS NOT NULL
                      AND qq.source_chunk_ids_json LIKE '%' || tc2.chunk_id || '%'
              )
        ''', (course_id, row["topic_id"]))
        chunk_infer_row = cursor.fetchone()
        chunk_count = int(chunk_infer_row["chunk_count"]) if chunk_infer_row and chunk_infer_row["chunk_count"] is not None else 0

        is_unassessed = (explicit_count + chunk_count) == 0
        
        severity = "high"
        if mastery_score >= 0.75:
            severity = "low"
        elif mastery_score >= 0.55:
            severity = "medium"

        areas.append({
            "topic_id": row["topic_id"],
            "label": row["label"],
            "mastery_score": mastery_score,
            "last_updated_at": row.get("last_updated_at"),
            "chunk_count": row.get("chunk_count") or 0,
            "unassessed": is_unassessed,
            # Avoid marking a topic as weak just because it shared chunks with another quiz.
            "needs_improvement": mastery_score < 0.65 and explicit_count > 0,
            "severity": "unassessed" if is_unassessed else severity,
            "recommended_question_count": 10 if mastery_score < 0.55 else 7
        })

    weak_topics = [area for area in areas if area["needs_improvement"]]

    conn.close()
    return {
        "course_id": course_id,
        "areas": areas,
        "weak_topics": weak_topics,
        "summary": {
            "topic_count": len(areas),
            "weak_topic_count": len(weak_topics),
            "average_mastery": (sum(area["mastery_score"] for area in areas) / len(areas)) if areas else None
        }
    }


@router.post("/courses/{course_id}/quizzes/generate")
async def generate_quiz(
    course_id: str,
    source_type: str = Form(...),
    source_id: str = Form(""),
    source_ids_json: str = Form(None),
    focus_chunk_ids_json: str = Form(None),
    name: str = Form(None),
    question_count: int = Form(10),
    quiz_types_json: str = Form(None),
    mode: str = Form("practice")
):
    if question_count < 5 or question_count > 30:
        raise HTTPException(status_code=400, detail="question_count must be between 5 and 30")

    source_type = (source_type or "").strip().lower()
    source_id = (source_id or "").strip()
    selected_source_ids = []
    focus_chunk_ids = []
    if source_type not in {"document", "topic", "chunks"}:
        raise HTTPException(status_code=400, detail="source_type must be 'document', 'topic', or 'chunks'")
    if source_type == "topic" and not source_id:
        raise HTTPException(status_code=400, detail="source_id is required")

    if source_type == "document":
        if source_ids_json:
            try:
                parsed_ids = json.loads(source_ids_json)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="source_ids_json must be valid JSON")

            if not isinstance(parsed_ids, list):
                raise HTTPException(status_code=400, detail="source_ids_json must be a JSON list")

            selected_source_ids = [str(doc_id).strip() for doc_id in parsed_ids if str(doc_id).strip()]
        elif source_id:
            selected_source_ids = [source_id]

        if not selected_source_ids:
            raise HTTPException(status_code=400, detail="Please select at least one document")

    if source_type == "chunks":
        if focus_chunk_ids_json:
            try:
                parsed_chunks = json.loads(focus_chunk_ids_json)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="focus_chunk_ids_json must be valid JSON")
            if not isinstance(parsed_chunks, list):
                raise HTTPException(status_code=400, detail="focus_chunk_ids_json must be a JSON list")
            focus_chunk_ids = [str(cid).strip() for cid in parsed_chunks if str(cid).strip()]
        if not focus_chunk_ids:
            raise HTTPException(status_code=400, detail="focus_chunk_ids_json is required for source_type 'chunks'")

    allowed_types = ["multiple_choice", "true_false", "short_answer"]
    if quiz_types_json:
        try:
            parsed_types = json.loads(quiz_types_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="quiz_types_json must be valid JSON")

        if not isinstance(parsed_types, list):
            raise HTTPException(status_code=400, detail="quiz_types_json must be a JSON list")

        normalized_types = []
        for value in parsed_types:
            parsed_type = _parse_quiz_type(value)
            if parsed_type and parsed_type not in normalized_types:
                normalized_types.append(parsed_type)

        if not normalized_types:
            raise HTTPException(status_code=400, detail="No valid quiz types selected")
        allowed_types = normalized_types

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    source_ids_for_loader = (
        selected_source_ids if source_type == "document"
        else focus_chunk_ids if source_type == "chunks"
        else None
    )
    chunks = _load_source_chunks(
        cursor,
        course_id,
        source_type,
        source_id=source_id,
        source_ids=source_ids_for_loader
    )
    valid_chunk_ids = {chunk["chunk_id"] for chunk in chunks}

    context_chunks = chunks[:25]
    context_lines = [
        f"Chunk {index + 1} (chunk_id={item['chunk_id']}):\n{item['text']}"
        for index, item in enumerate(context_chunks)
    ]
    context = "\n\n".join(context_lines)

    focus_mode_hint = ""
    if source_type == "chunks":
        focus_mode_hint = "\nFocus Mode: These chunks cover topics the student has previously answered incorrectly. Prioritize conceptual understanding, common misconceptions, and application over surface-level recall.\n"

    system_prompt = """You are a study assistant generating grounded quiz questions from source text.
Rules:
1. Use only facts from source text.
2. Return valid JSON only.
3. Output either a JSON array or an object with key \"questions\".
4. Each question must include: type, question_text, answer_text, source_chunk_ids.
5. type must be one of: multiple_choice, true_false, short_answer.
6. For multiple_choice include a choices array of 4 options and answer_text equal to one choice.
7. For true_false, answer_text must be True or False; choices may be omitted.
8. For short_answer, keep answer_text concise (one sentence max).
9. source_chunk_ids must reference provided chunk_ids when possible.
10. Avoid duplicate questions.
"""

    user_prompt = f"""Generate {question_count} quiz questions from the source text below.
{focus_mode_hint}
Allowed Types: {allowed_types}
Source Type: {source_type}
Source ID: {source_id}
Source IDs: {selected_source_ids if source_type == 'document' else []}

If question_count allows, include at least one question per allowed type.

Source Chunks:
{context}

Return JSON only. Example format:
[
  {{
    "type": "multiple_choice",
    "question_text": "...",
    "choices": ["...", "...", "...", "..."],
    "answer_text": "...",
    "source_chunk_ids": ["<chunk_id>"]
  }}
]
"""

    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=2200
        )
        model_output = response.choices[0].message.content
        parsed_questions = _parse_quiz_payload(model_output, valid_chunk_ids, allowed_types)
    except HTTPException:
        conn.close()
        raise
    except Exception as e:
        conn.close()
        print(f"Quiz generation error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

    if not parsed_questions:
        conn.close()
        raise HTTPException(status_code=500, detail="No valid quiz questions were generated")

    parsed_questions = parsed_questions[:question_count]

    studyset_id = str(uuid.uuid4())
    quiz_id = str(uuid.uuid4())
    quiz_name = (name or "").strip() or f"{source_type.title()} Quiz"
    persisted_source_id = json.dumps(selected_source_ids) if source_type == "document" else source_id

    try:
        cursor.execute('''
            INSERT INTO study_sets (studyset_id, course_id, name, source_scope, source_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (studyset_id, course_id, quiz_name, source_type, persisted_source_id))

        cursor.execute('''
            INSERT INTO quizzes (quiz_id, studyset_id, mode)
            VALUES (?, ?, ?)
        ''', (quiz_id, studyset_id, mode))

        # Keep topic-scoped quizzes tied to their original topic.
        question_topic_id = source_id if source_type == "topic" else None

        inserted_questions = []
        for question in parsed_questions:
            question_id = str(uuid.uuid4())
            choices_json = json.dumps(question["choices"]) if question["choices"] else None
            source_chunk_ids_json = json.dumps(question["source_chunk_ids"]) if question["source_chunk_ids"] else None

            cursor.execute('''
                INSERT INTO quiz_questions (
                    question_id, quiz_id, type, question_text, choices_json, answer_text, source_chunk_ids_json, topic_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                question_id,
                quiz_id,
                question["type"],
                question["question_text"],
                choices_json,
                question["answer_text"],
                source_chunk_ids_json,
                question_topic_id
            ))

            inserted_questions.append({
                "question_id": question_id,
                "type": question["type"],
                "question_text": question["question_text"],
                "choices": question["choices"],
                "source_chunk_ids": question["source_chunk_ids"]
            })

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Quiz persistence error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to save quiz")

    conn.close()
    return {
        "quiz_id": quiz_id,
        "studyset_id": studyset_id,
        "course_id": course_id,
        "name": quiz_name,
        "mode": mode,
        "source_scope": source_type,
        "source_id": persisted_source_id,
        "source_ids": selected_source_ids if source_type == "document" else [],
        "question_count": len(inserted_questions),
        "questions": inserted_questions
    }


@router.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, payload: dict = Body(...)):
    responses = payload.get("responses") if isinstance(payload, dict) else None
    if not isinstance(responses, list):
        raise HTTPException(status_code=400, detail="responses must be a list")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    quiz_row = _get_quiz_row(cursor, quiz_id)
    if not quiz_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    cursor.execute('''
        SELECT question_id, type, question_text, choices_json, answer_text, source_chunk_ids_json, topic_id
        FROM quiz_questions
        WHERE quiz_id = ?
        ORDER BY created_at ASC
    ''', (quiz_id,))
    questions = [dict(row) for row in cursor.fetchall()]
    if not questions:
        conn.close()
        raise HTTPException(status_code=400, detail="Quiz has no questions")

    response_map = {}
    for item in responses:
        if not isinstance(item, dict):
            continue
        question_id = str(item.get("question_id", "")).strip()
        if not question_id:
            continue
        response_map[question_id] = str(item.get("user_answer", "")).strip()

    attempt_id = str(uuid.uuid4())
    cursor.execute('''
        INSERT INTO quiz_attempts (attempt_id, quiz_id)
        VALUES (?, ?)
    ''', (attempt_id, quiz_id))

    graded_rows = []
    short_answer_batch = []

    for index, question in enumerate(questions):
        question_id = question["question_id"]
        question_type = question["type"]
        user_answer = response_map.get(question_id, "")
        choices = json.loads(question["choices_json"]) if question.get("choices_json") else None
        source_chunk_ids = json.loads(question["source_chunk_ids_json"]) if question.get("source_chunk_ids_json") else []

        if question_type == "short_answer":
            short_answer_batch.append({
                "index": index,
                "question_id": question_id,
                "question_text": question["question_text"],
                "user_answer": user_answer,
                "answer_text": question["answer_text"],
            })
            graded_rows.append({
                "index": index,
                "question_id": question_id,
                "type": question_type,
                "question_text": question["question_text"],
                "user_answer": user_answer,
                "correct_answer": question["answer_text"],
                "is_correct": False,
                "feedback": "Evaluating...",
                "source_chunk_ids": source_chunk_ids,
                "topic_id": question.get("topic_id")
            })
            continue

        grade = _grade_objective_answer(user_answer, question_type, question["answer_text"], choices)
        graded_rows.append({
            "index": index,
            "question_id": question_id,
            "type": question_type,
            "question_text": question["question_text"],
            "user_answer": user_answer,
            "correct_answer": question["answer_text"],
            "is_correct": grade["is_correct"],
            "feedback": grade["feedback"],
            "source_chunk_ids": source_chunk_ids,
            "topic_id": question.get("topic_id")
        })

    short_grades = _grade_short_answer_batch(short_answer_batch)
    for row in graded_rows:
        if row["type"] != "short_answer":
            continue
        short_grade = short_grades.get(row["index"]) if isinstance(short_grades, dict) else None
        if not short_grade:
            is_correct, feedback = _fallback_short_answer_grade(row["user_answer"], row["correct_answer"])
            row["is_correct"] = is_correct
            row["feedback"] = feedback
        else:
            row["is_correct"] = bool(short_grade.get("is_correct", False))
            row["feedback"] = str(short_grade.get("feedback", "")).strip() or "Evaluated."

    correct_count = 0
    try:
        for row in graded_rows:
            if row["is_correct"]:
                correct_count += 1

            response_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO quiz_responses (response_id, attempt_id, question_id, user_answer, is_correct, feedback)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                response_id,
                attempt_id,
                row["question_id"],
                row["user_answer"],
                1 if row["is_correct"] else 0,
                row["feedback"]
            ))

        total_questions = len(graded_rows)
        score = (correct_count / total_questions) if total_questions else 0.0
        cursor.execute('''
            UPDATE quiz_attempts
            SET completed_at = CURRENT_TIMESTAMP, score = ?
            WHERE attempt_id = ?
        ''', (score, attempt_id))

        _update_topic_mastery_from_attempt(cursor, quiz_row["course_id"], graded_rows)

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Quiz submission error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to submit quiz")

    graded_responses = [
        {
            "question_id": row["question_id"],
            "type": row["type"],
            "question_text": row["question_text"],
            "user_answer": row["user_answer"],
            "is_correct": row["is_correct"],
            "correct_answer": row["correct_answer"],
            "feedback": row["feedback"],
            "source_chunk_ids": row["source_chunk_ids"],
            "source_chunks": _build_source_chunk_payload(cursor, row["source_chunk_ids"])
        }
        for row in graded_rows
    ]

    conn.close()
    return {
        "attempt_id": attempt_id,
        "quiz_id": quiz_id,
        "score": score,
        "correct_count": correct_count,
        "total_questions": len(graded_rows),
        "graded_responses": graded_responses
    }


