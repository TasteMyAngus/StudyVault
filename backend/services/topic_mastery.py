import sqlite3
import uuid

def _update_topic_mastery_from_attempt(cursor, course_id: str, graded_rows):
    def _ensure_topics_for_chunks(source_chunk_ids):
        source_chunk_ids = [
            str(chunk_id).strip()
            for chunk_id in (source_chunk_ids or [])
            if str(chunk_id).strip()
        ]
        if not source_chunk_ids:
            return

        placeholders = ",".join(["?"] * len(source_chunk_ids))
        cursor.execute(f'''
            SELECT c.chunk_id,
                   c.section_title,
                   d.title AS doc_title
            FROM chunks c
            JOIN document_versions dv ON c.version_id = dv.version_id
            JOIN documents d ON dv.doc_id = d.doc_id
            WHERE c.chunk_id IN ({placeholders})
        ''', source_chunk_ids)
        chunk_rows = cursor.fetchall()

        for chunk_row in chunk_rows:
            chunk_id = chunk_row["chunk_id"]

            cursor.execute('''
                SELECT topic_id
                FROM topic_chunks
                WHERE chunk_id = ?
                LIMIT 1
            ''', (chunk_id,))
            if cursor.fetchone():
                continue

            section_title = (chunk_row["section_title"] or "").strip()
            doc_title = (chunk_row["doc_title"] or "").strip() or "Document"
            topic_label = section_title if section_title else f"{doc_title} Concepts"

            cursor.execute('''
                SELECT topic_id
                FROM topics
                WHERE course_id = ? AND LOWER(label) = LOWER(?)
                LIMIT 1
            ''', (course_id, topic_label))
            topic_row = cursor.fetchone()

            if topic_row:
                topic_id = topic_row["topic_id"]
            else:
                topic_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO topics (topic_id, course_id, label)
                    VALUES (?, ?, ?)
                ''', (topic_id, course_id, topic_label))
                cursor.execute('''
                    INSERT OR IGNORE INTO topic_mastery (course_id, topic_id, mastery_score)
                    VALUES (?, ?, 0.5)
                ''', (course_id, topic_id))

            cursor.execute('''
                INSERT OR IGNORE INTO topic_chunks (topic_id, chunk_id, weight)
                VALUES (?, ?, 1.0)
            ''', (topic_id, chunk_id))

    topic_signals = {}

    for row in graded_rows:
        signal = 1.0 if row.get("is_correct") else 0.0
        explicit_topic_id = (row.get("topic_id") or "").strip() or None

        if explicit_topic_id:
            # Focus quizzes should only update the topic they were created for.
            topic_signals.setdefault(explicit_topic_id, []).append(signal)
            continue

        # Document quizzes fall back to chunk-based topic mapping.
        source_chunk_ids = [
            str(chunk_id).strip()
            for chunk_id in (row.get("source_chunk_ids") or [])
            if str(chunk_id).strip()
        ]
        if not source_chunk_ids:
            continue

        _ensure_topics_for_chunks(source_chunk_ids)

        placeholders = ",".join(["?"] * len(source_chunk_ids))
        cursor.execute(f'''
            SELECT DISTINCT topic_id
            FROM topic_chunks
            WHERE chunk_id IN ({placeholders})
        ''', source_chunk_ids)
        topic_ids = [topic_row["topic_id"] for topic_row in cursor.fetchall() if topic_row["topic_id"]]

        if not topic_ids:
            continue

        for topic_id in topic_ids:
            topic_signals.setdefault(topic_id, []).append(signal)

    for topic_id, signals in topic_signals.items():
        averaged_signal = sum(signals) / len(signals)

        cursor.execute('''
            INSERT OR IGNORE INTO topic_mastery (course_id, topic_id, mastery_score)
            VALUES (?, ?, 0.5)
        ''', (course_id, topic_id))

        cursor.execute('''
            SELECT mastery_score
            FROM topic_mastery
            WHERE course_id = ? AND topic_id = ?
        ''', (course_id, topic_id))
        mastery_row = cursor.fetchone()
        old_mastery = float(mastery_row["mastery_score"]) if mastery_row else 0.5

        new_mastery = (0.8 * old_mastery) + (0.2 * averaged_signal)
        new_mastery = max(0.0, min(1.0, new_mastery))

        cursor.execute('''
            UPDATE topic_mastery
            SET mastery_score = ?, last_updated_at = CURRENT_TIMESTAMP
            WHERE course_id = ? AND topic_id = ?
        ''', (new_mastery, course_id, topic_id))

# Deprecated. Needs cleanup.
