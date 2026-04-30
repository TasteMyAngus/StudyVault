import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "studyvault.db"

def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS courses (
            course_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            term TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            doc_id TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            title TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS document_versions (
            version_id TEXT PRIMARY KEY,
            doc_id TEXT NOT NULL,
            version_label TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source_notes TEXT,
            FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chunks (
            chunk_id TEXT PRIMARY KEY,
            version_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            text TEXT NOT NULL,
            page_start INTEGER,
            page_end INTEGER,
            section_title TEXT,
            char_start INTEGER,
            char_end INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (version_id) REFERENCES document_versions(version_id)
        )
    ''')
    
    # Each row points a chunk at its vector-store entry.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS embeddings (
            chunk_id TEXT PRIMARY KEY,
            embedding_ref TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chunk_id) REFERENCES chunks(chunk_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            conversation_id TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            message_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS retrieval_traces (
            trace_id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL,
            chunk_id TEXT NOT NULL,
            rank INTEGER NOT NULL,
            score REAL NOT NULL,
            used_in_answer INTEGER DEFAULT 0,
            evidence_snippet TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (message_id) REFERENCES messages(message_id),
            FOREIGN KEY (chunk_id) REFERENCES chunks(chunk_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS study_sets (
            studyset_id TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            name TEXT NOT NULL,
            source_scope TEXT NOT NULL,
            source_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS flashcards (
            card_id TEXT PRIMARY KEY,
            studyset_id TEXT NOT NULL,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            difficulty INTEGER DEFAULT 2,
            source_chunk_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (studyset_id) REFERENCES study_sets(studyset_id),
            FOREIGN KEY (source_chunk_id) REFERENCES chunks(chunk_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quizzes (
            quiz_id TEXT PRIMARY KEY,
            studyset_id TEXT NOT NULL,
            mode TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (studyset_id) REFERENCES study_sets(studyset_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_questions (
            question_id TEXT PRIMARY KEY,
            quiz_id TEXT NOT NULL,
            type TEXT NOT NULL,
            question_text TEXT NOT NULL,
            choices_json TEXT,
            answer_text TEXT NOT NULL,
            source_chunk_ids_json TEXT,
            topic_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            attempt_id TEXT PRIMARY KEY,
            quiz_id TEXT NOT NULL,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            score REAL,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_responses (
            response_id TEXT PRIMARY KEY,
            attempt_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            user_answer TEXT NOT NULL,
            is_correct INTEGER DEFAULT 0,
            feedback TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(attempt_id),
            FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topics (
            topic_id TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            label TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(course_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topic_chunks (
            topic_id TEXT NOT NULL,
            chunk_id TEXT NOT NULL,
            weight REAL DEFAULT 1.0,
            PRIMARY KEY (topic_id, chunk_id),
            FOREIGN KEY (topic_id) REFERENCES topics(topic_id),
            FOREIGN KEY (chunk_id) REFERENCES chunks(chunk_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topic_mastery (
            course_id TEXT NOT NULL,
            topic_id TEXT NOT NULL,
            mastery_score REAL DEFAULT 0.5,
            last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (course_id, topic_id),
            FOREIGN KEY (course_id) REFERENCES courses(course_id),
            FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

if __name__ == "__main__":
    init_db()
