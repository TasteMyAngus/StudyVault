def _get_quiz_row(cursor, quiz_id: str):
    cursor.execute('''
        SELECT q.quiz_id,
               q.mode,
               q.created_at,
               ss.studyset_id,
               ss.course_id,
               ss.name,
               ss.source_scope,
               ss.source_id
        FROM quizzes q
        JOIN study_sets ss ON q.studyset_id = ss.studyset_id
        WHERE q.quiz_id = ?
    ''', (quiz_id,))
    return cursor.fetchone()


def _get_attempt_summary_rows(cursor, quiz_id: str):
    cursor.execute('''
        SELECT qa.attempt_id,
               qa.quiz_id,
               qa.started_at,
               qa.completed_at,
               qa.score,
               SUM(CASE WHEN qr.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
               COUNT(qr.response_id) AS total_questions
        FROM quiz_attempts qa
        LEFT JOIN quiz_responses qr ON qr.attempt_id = qa.attempt_id
        WHERE qa.quiz_id = ?
        GROUP BY qa.attempt_id
        ORDER BY COALESCE(qa.completed_at, qa.started_at) DESC
    ''', (quiz_id,))
    return [dict(row) for row in cursor.fetchall()]


def _compute_quiz_overview_metrics(attempt_rows, recent_window=5):
    if not attempt_rows:
        return {
            "total_attempts": 0,
            "latest_score": None,
            "best_score": None,
            "average_score": None,
            "first_score": None,
            "improvement_from_first": None,
            "recent_average": None,
            "recent_trend": None
        }

    scores_desc = [row["score"] for row in attempt_rows if row.get("score") is not None]
    if not scores_desc:
        return {
            "total_attempts": len(attempt_rows),
            "latest_score": None,
            "best_score": None,
            "average_score": None,
            "first_score": None,
            "improvement_from_first": None,
            "recent_average": None,
            "recent_trend": None
        }

    chronological_scores = list(reversed(scores_desc))
    latest_score = scores_desc[0]
    first_score = chronological_scores[0]
    recent_scores = scores_desc[:recent_window]

    return {
        "total_attempts": len(attempt_rows),
        "latest_score": latest_score,
        "best_score": max(scores_desc),
        "average_score": sum(scores_desc) / len(scores_desc),
        "first_score": first_score,
        "improvement_from_first": latest_score - first_score,
        "recent_average": sum(recent_scores) / len(recent_scores),
        "recent_trend": (recent_scores[0] - recent_scores[-1]) if len(recent_scores) >= 2 else 0.0
    }


def _build_attempt_detail(cursor, quiz_id: str, attempt_id: str):
    cursor.execute('''
        SELECT qa.attempt_id,
               qa.quiz_id,
               qa.started_at,
               qa.completed_at,
               qa.score
        FROM quiz_attempts qa
        WHERE qa.attempt_id = ? AND qa.quiz_id = ?
    ''', (attempt_id, quiz_id))
    attempt_row = cursor.fetchone()
    if not attempt_row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    cursor.execute('''
        SELECT qq.question_id,
               qq.type,
               qq.question_text,
               qq.answer_text AS correct_answer,
               qq.source_chunk_ids_json,
               qr.user_answer,
               qr.is_correct,
               qr.feedback
        FROM quiz_responses qr
        JOIN quiz_questions qq ON qr.question_id = qq.question_id
        WHERE qr.attempt_id = ?
        ORDER BY qq.created_at ASC
    ''', (attempt_id,))

    graded_responses = []
    correct_count = 0
    for row in cursor.fetchall():
        source_chunk_ids = json.loads(row["source_chunk_ids_json"]) if row["source_chunk_ids_json"] else []
        is_correct = bool(row["is_correct"])
        if is_correct:
            correct_count += 1

        graded_responses.append({
            "question_id": row["question_id"],
            "type": row["type"],
            "question_text": row["question_text"],
            "user_answer": row["user_answer"],
            "is_correct": is_correct,
            "correct_answer": row["correct_answer"],
            "feedback": row["feedback"],
            "source_chunk_ids": source_chunk_ids,
            "source_chunks": _build_source_chunk_payload(cursor, source_chunk_ids)
        })

    return {
        "attempt": dict(attempt_row),
        "correct_count": correct_count,
        "total_questions": len(graded_responses),
        "graded_responses": graded_responses
    }


