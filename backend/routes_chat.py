import re
import sqlite3
import traceback
import uuid

from fastapi import APIRouter, Form, HTTPException

from .config import DB_PATH, OPENAI_MODEL
from .state import openai_client, pipeline

router = APIRouter()

@router.post("/courses/{course_id}/chat")
async def chat(course_id: str, question: str = Form(...)):
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT course_id FROM courses WHERE course_id = ?', (course_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Course not found")
        
        conversation_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO conversations (conversation_id, course_id)
            VALUES (?, ?)
        ''', (conversation_id, course_id))
        
        message_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO messages (message_id, conversation_id, role, content)
            VALUES (?, ?, ?, ?)
        ''', (message_id, conversation_id, 'user', question))
        conn.commit()
        
        question_embedding = pipeline.embedder.embed(question)
        
        similar_chunks = pipeline.vector_store.query(question_embedding, top_k=8)
        
        source_map = {}
        evidence_texts = []
        
        for rank, result in enumerate(similar_chunks, 1):
            chunk_id = result['chunk_id']
            score = result['score']
            text = result['text']
            
            cursor.execute('''
                SELECT d.title, d.doc_id, d.doc_type, c.page_start, c.page_end
                FROM chunks c
                JOIN document_versions dv ON c.version_id = dv.version_id
                JOIN documents d ON dv.doc_id = d.doc_id
                WHERE c.chunk_id = ?
            ''', (chunk_id,))
            chunk_info = cursor.fetchone()
            
            if chunk_info:
                doc_title = chunk_info['title']
                doc_id = chunk_info['doc_id']
                doc_type = chunk_info['doc_type']
                page_info = ""
                if chunk_info['page_start']:
                    if chunk_info['page_end']:
                        page_info = f" (pp. {chunk_info['page_start']}-{chunk_info['page_end']})"
                    else:
                        page_info = f" (p. {chunk_info['page_start']})"
                
                source_map[rank] = {
                    "rank": rank,
                    "document": doc_title + page_info,
                    "doc_id": doc_id,
                    "doc_type": doc_type,
                    "similarity": float(score),
                    "chunk_id": chunk_id,
                    "text": text
                }
            
            trace_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO retrieval_traces (trace_id, message_id, chunk_id, rank, score, evidence_snippet)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (trace_id, message_id, chunk_id, rank, score, text[:300]))
        
        conn.commit()
        
        answer = ""
        used_sources = set()
        
        if similar_chunks:
            # Number each source so the model can cite them directly.
            context_parts = [f"[Source {source_map[i]['rank']}] {source_map[i]['text']}" for i in sorted(source_map.keys())[:5]]
            context = "\n\n".join(context_parts)
            
            system_prompt = """You are a study assistant that answers questions based ONLY on the provided course materials.
You must:
1. Answer only using information from the provided sources
2. Cite sources using [Source X] format in your answer where X is the source number
3. Be clear and concise
4. If a question cannot be answered from the provided materials, clearly state that
5. Do not use general knowledge - only what is in the materials provided"""
            
            user_prompt = f"""Based on these course materials, answer the following question:

Question: {question}

Course Materials:
{context}

Answer only using the provided materials. Cite the source [Source X] when using information from a source. If the question cannot be answered from these materials, say so."""
            
            try:
                response = openai_client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.3,
                    max_tokens=500
                )
                answer = response.choices[0].message.content
                
                cited_sources = re.findall(r'\[Source (\d+)\]', answer)
                used_sources = set(int(src) for src in cited_sources if int(src) in source_map)
                
            except Exception as e:
                print(f"OpenAI error: {str(e)}")
                answer = "I encountered an error while generating a response. Please try again."
                used_sources = set()
        else:
            answer = "I couldn't find relevant information in the course materials to answer your question."
            used_sources = set()
        
        citations = [source_map[src_num] for src_num in sorted(used_sources)]
        
        conn.close()
        
        return {
            "course_id": course_id,
            "message_id": message_id,
            "conversation_id": conversation_id,
            "question": question,
            "answer": answer,
            "citations": citations,
            "num_sources": len(used_sources),
            "num_retrieved": len(similar_chunks)
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


