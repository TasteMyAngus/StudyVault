import json

from fastapi import HTTPException

def _load_source_chunks(cursor, course_id: str, source_type: str, source_id: str = None, source_ids=None):
    if source_type == "document":
        doc_ids = []
        if source_ids and isinstance(source_ids, list):
            doc_ids = [str(doc_id).strip() for doc_id in source_ids if str(doc_id).strip()]
        elif source_id:
            doc_ids = [source_id.strip()]

        if not doc_ids:
            raise HTTPException(status_code=400, detail="At least one document must be selected")

        placeholders = ",".join(["?"] * len(doc_ids))
        cursor.execute(f'''
            SELECT doc_id
            FROM documents
            WHERE course_id = ? AND doc_id IN ({placeholders})
        ''', [course_id] + doc_ids)
        valid_doc_ids = [row[0] for row in cursor.fetchall()]
        if len(valid_doc_ids) != len(set(doc_ids)):
            raise HTTPException(status_code=400, detail="One or more selected documents do not belong to this course")

        placeholders = ",".join(["?"] * len(valid_doc_ids))
        cursor.execute(f'''
            SELECT c.chunk_id, c.text
            FROM chunks c
            JOIN document_versions dv ON c.version_id = dv.version_id
            JOIN (
                SELECT doc_id, MAX(uploaded_at) AS latest_uploaded_at
                FROM document_versions
                WHERE doc_id IN ({placeholders})
                GROUP BY doc_id
            ) latest ON latest.doc_id = dv.doc_id AND latest.latest_uploaded_at = dv.uploaded_at
            ORDER BY dv.doc_id, c.chunk_index ASC
            LIMIT 80
        ''', valid_doc_ids)
        rows = cursor.fetchall()
    elif source_type == "topic":
        cursor.execute('''
            SELECT topic_id
            FROM topics
            WHERE topic_id = ? AND course_id = ?
        ''', (source_id, course_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Selected topic does not belong to this course")

        cursor.execute('''
            SELECT c.chunk_id, c.text
            FROM topic_chunks tc
            JOIN chunks c ON tc.chunk_id = c.chunk_id
            JOIN document_versions dv ON c.version_id = dv.version_id
            JOIN documents d ON dv.doc_id = d.doc_id
            WHERE tc.topic_id = ?
              AND d.course_id = ?
            ORDER BY c.chunk_index ASC
            LIMIT 40
        ''', (source_id, course_id))
        rows = cursor.fetchall()
    elif source_type == "chunks":
        if not source_ids:
            raise HTTPException(status_code=400, detail="focus_chunk_ids required for source_type 'chunks'")
        clean_ids = [str(cid).strip() for cid in source_ids if str(cid).strip()]
        if not clean_ids:
            raise HTTPException(status_code=400, detail="focus_chunk_ids list is empty")
        placeholders = ",".join(["?"] * len(clean_ids))
        cursor.execute(f'''
            SELECT c.chunk_id, c.text
            FROM chunks c
            JOIN document_versions dv ON c.version_id = dv.version_id
            JOIN documents d ON dv.doc_id = d.doc_id
            WHERE c.chunk_id IN ({placeholders})
              AND d.course_id = ?
            ORDER BY d.doc_id, c.chunk_index ASC
            LIMIT 40
        ''', clean_ids + [course_id])
        rows = cursor.fetchall()
    else:
        raise HTTPException(status_code=400, detail="source_type must be 'document', 'topic', or 'chunks'")

    chunks = [dict(row) for row in rows]
    if not chunks:
        raise HTTPException(status_code=400, detail="No chunks found for the selected source")

    return chunks


def _build_page_label(page_start, page_end):
    if page_start is None:
        return None
    if page_end is not None and page_end != page_start:
        return f"pp. {page_start}-{page_end}"
    return f"p. {page_start}"


def _build_source_chunk_payload(cursor, source_chunk_ids):
    source_chunk_ids = [str(chunk_id).strip() for chunk_id in (source_chunk_ids or []) if str(chunk_id).strip()]
    if not source_chunk_ids:
        return []

    placeholders = ",".join(["?"] * len(source_chunk_ids))
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
    ''', source_chunk_ids)
    source_rows = {row["chunk_id"]: dict(row) for row in cursor.fetchall()}

    payload = []
    for chunk_id in source_chunk_ids:
        row = source_rows.get(chunk_id)
        if not row:
            continue
        snippet = (row.get("text") or "").strip()
        if len(snippet) > 360:
            snippet = snippet[:360].rstrip() + "…"

        payload.append({
            "chunk_id": row["chunk_id"],
            "doc_id": row["doc_id"],
            "doc_title": row["doc_title"],
            "doc_type": row["doc_type"],
            "page_label": _build_page_label(row.get("page_start"), row.get("page_end")),
            "snippet": snippet
        })

    return payload

