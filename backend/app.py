import sqlite3
import traceback

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import DB_PATH
from .routes_chat import router as chat_router
from .routes_general import router as general_router
from .routes_quiz import router as quiz_router
from .routes_study import router as study_router
from .state import pipeline

app = FastAPI(title="StudyVault API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def startup_event():
    from db.schema import init_db
    init_db()
    print("Database initialized")
    
    # Rebuild the in-memory index from stored chunks on startup.
    print("Rebuilding vector store from database...")
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.chunk_id, c.text, c.page_start, c.page_end, d.title
            FROM chunks c
            JOIN document_versions dv ON c.version_id = dv.version_id
            JOIN documents d ON dv.doc_id = d.doc_id
        ''')
        
        rows = cursor.fetchall()
        
        for row in rows:
            chunk_id = row['chunk_id']
            text = row['text']
            
            try:
                embedding = pipeline.embedder.embed(text)
                pipeline.vector_store.add(
                    chunk_id=chunk_id,
                    embedding=embedding,
                    metadata={
                        "doc_title": row['title'],
                        "page_start": row['page_start'],
                        "page_end": row['page_end']
                    },
                    text=text
                )
            except Exception as e:
                print(f"Error embedding chunk {chunk_id}: {str(e)}")
        
        conn.close()
        print(f"Vector store rebuilt with {pipeline.vector_store.next_id} chunks")
    except Exception as e:
        print(f"Error rebuilding vector store: {str(e)}")
        traceback.print_exc()


app.add_event_handler("startup", startup_event)
app.include_router(general_router)
app.include_router(study_router)
app.include_router(quiz_router)
app.include_router(chat_router)
