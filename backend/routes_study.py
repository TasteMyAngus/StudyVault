import json
import sqlite3
import traceback
import uuid

from fastapi import APIRouter, Form, HTTPException

from .config import DB_PATH, OPENAI_MODEL
from .services.payloads import _parse_flashcards_payload
from .services.sources import _load_source_chunks
from .state import openai_client

router = APIRouter()

@router.get("/courses/{course_id}/study-sets")
async def get_study_sets(course_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    cursor.execute('''
        SELECT ss.studyset_id,
               ss.course_id,
               ss.name,
               ss.source_scope,
               ss.source_id,
               ss.created_at,
               COUNT(fc.card_id) AS card_count
        FROM study_sets ss
        LEFT JOIN flashcards fc ON fc.studyset_id = ss.studyset_id
        WHERE ss.course_id = ?
        GROUP BY ss.studyset_id
        ORDER BY ss.created_at DESC
    ''', (course_id,))

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.get("/study-sets/{studyset_id}/flashcards")
async def get_study_set_flashcards(studyset_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('''
        SELECT studyset_id, course_id, name, source_scope, source_id, created_at
        FROM study_sets
        WHERE studyset_id = ?
    ''', (studyset_id,))
    study_set_row = cursor.fetchone()
    if not study_set_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Study set not found")

    cursor.execute('''
        SELECT card_id, studyset_id, front, back, difficulty, source_chunk_id, created_at
        FROM flashcards
        WHERE studyset_id = ?
        ORDER BY created_at ASC
    ''', (studyset_id,))
    flashcards = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {
        "study_set": dict(study_set_row),
        "flashcards": flashcards,
        "count": len(flashcards)
    }


@router.post("/courses/{course_id}/study-sets/generate")
async def generate_study_set(
    course_id: str,
    source_type: str = Form(...),
    source_id: str = Form(...),
    source_ids_json: str = Form(None),
    name: str = Form(None),
    card_count: int = Form(10)
):
    if card_count < 5 or card_count > 30:
        raise HTTPException(status_code=400, detail="card_count must be between 5 and 30")

    source_type = (source_type or "").strip().lower()
    source_id = (source_id or "").strip()
    selected_source_ids = []
    if source_type not in {"document", "topic"}:
        raise HTTPException(status_code=400, detail="source_type must be 'document' or 'topic'")
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

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    chunks = _load_source_chunks(
        cursor,
        course_id,
        source_type,
        source_id=source_id,
        source_ids=selected_source_ids if source_type == "document" else None
    )
    context_chunks = chunks[:25]
    context_lines = [
        f"Chunk {index + 1} (chunk_id={item['chunk_id']}):\n{item['text']}"
        for index, item in enumerate(context_chunks)
    ]
    context = "\n\n".join(context_lines)

    system_prompt = """You are a study assistant that creates high-quality flashcards only from provided source text.
Rules:
1. Use only facts from the source text.
2. Return valid JSON only — a plain JSON array, no wrapper object.
3. Each card must include: front, back, source_chunk_id.
4. source_chunk_id must match one of the provided chunk_id values.
5. Keep fronts concise and backs clear and exam-useful.
6. Avoid duplicate cards.
"""

    user_prompt = f"""Generate {card_count} flashcards from the source text below.

Source Type: {source_type}
Source ID: {source_id}
Source IDs: {selected_source_ids if source_type == 'document' else []}

Source Chunks:
{context}

Return JSON only. Example format:
[
  {{"front": "What is ...?", "back": "...", "source_chunk_id": "<chunk_id>"}}
]
"""

    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1800
        )
        model_output = response.choices[0].message.content
        print(f"[DEBUG flashcard raw output]:\n{model_output[:500]}")
        parsed_cards = _parse_flashcards_payload(model_output)
    except HTTPException:
        conn.close()
        raise
    except Exception as e:
        conn.close()
        print(f"Study set generation error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate flashcards")

    valid_chunk_ids = {chunk["chunk_id"] for chunk in chunks}
    filtered_cards = []
    for card in parsed_cards:
        source_chunk_id = card["source_chunk_id"]
        if source_chunk_id not in valid_chunk_ids:
            source_chunk_id = None
        filtered_cards.append({
            "front": card["front"],
            "back": card["back"],
            "source_chunk_id": source_chunk_id
        })

    if not filtered_cards:
        conn.close()
        raise HTTPException(status_code=500, detail="No valid flashcards were generated")

    studyset_id = str(uuid.uuid4())
    studyset_name = (name or "").strip() or f"{source_type.title()} Study Set"
    persisted_source_id = json.dumps(selected_source_ids) if source_type == "document" else source_id

    try:
        cursor.execute('''
            INSERT INTO study_sets (studyset_id, course_id, name, source_scope, source_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (studyset_id, course_id, studyset_name, source_type, persisted_source_id))

        inserted_cards = []
        for card in filtered_cards[:card_count]:
            card_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO flashcards (card_id, studyset_id, front, back, difficulty, source_chunk_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (card_id, studyset_id, card["front"], card["back"], 2, card["source_chunk_id"]))
            inserted_cards.append({
                "card_id": card_id,
                "front": card["front"],
                "back": card["back"],
                "source_chunk_id": card["source_chunk_id"]
            })

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Study set persistence error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to save study set")

    conn.close()
    return {
        "studyset_id": studyset_id,
        "course_id": course_id,
        "name": studyset_name,
        "source_scope": source_type,
        "source_id": persisted_source_id,
        "source_ids": selected_source_ids if source_type == "document" else [],
        "card_count": len(inserted_cards),
        "flashcards": inserted_cards
    }


@router.delete("/study-sets/{studyset_id}")
async def delete_study_set(studyset_id: str):
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('SELECT studyset_id FROM study_sets WHERE studyset_id = ?', (studyset_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Study set not found")

    try:
        cursor.execute('DELETE FROM flashcards WHERE studyset_id = ?', (studyset_id,))
        cursor.execute('DELETE FROM study_sets WHERE studyset_id = ?', (studyset_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to delete study set")

    conn.close()
    return {"deleted": studyset_id}


