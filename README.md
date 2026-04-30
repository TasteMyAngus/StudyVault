# StudyVault

StudyVault is a grounded study assistant built around course materials instead of general-purpose model responses. Students can upload lecture notes, slides, readings, and other class documents, then use those files for citation-backed chat, flashcard generation, quiz generation, and progress tracking.

The project combines document ingestion, vector retrieval, grounded generation, and study workflow features in one local application. The backend is written in Python with FastAPI, the frontend is a React single-page app, and SQLite stores metadata, quiz history, and study artifacts.

## Overview

StudyVault is designed around one constraint: answers and generated study material should come from uploaded course content. Instead of treating AI as a general tutor, the system uses the student’s own files as the source of truth.

The application supports:

- course workspaces
- document upload and ingestion
- grounded chat with citations
- document viewing and source review
- topic creation and topic-based study scopes
- flashcard generation
- quiz generation
- quiz grading and review
- topic mastery and weak-area tracking

## Core Features

### 1. Course Management

Each course acts as its own workspace. Documents, study sets, quizzes, attempts, topics, and mastery data are stored under that course.

Supported actions:

- create a course
- list courses
- view a course
- delete a course and related data

### 2. Document Upload and Ingestion

Users can upload course files into a selected course. The backend saves the file locally, creates a document record, extracts text, chunks the content, generates embeddings, and stores retrieval metadata.

Supported file types:

- PDF
- DOCX
- PPTX
- TXT
- MD

Ingestion pipeline:

1. Save the uploaded file to `data/uploads`
2. Parse the file into page or slide level text
3. Split the content into chunks
4. Generate embeddings with `all-mpnet-base-v2`
5. Store chunk metadata in SQLite
6. Add vectors to the in-memory FAISS index

### 3. Grounded Chat

The chat feature answers questions using retrieved document chunks from the selected course.

Chat flow:

1. Embed the user’s question
2. Retrieve the most relevant chunks from the FAISS index
3. Build a constrained prompt using those chunks
4. Generate an answer with source tags
5. Return only the citations that were actually used in the answer
6. Record retrieval traces in SQLite

Each answer includes citations so the user can inspect the supporting source text.

### 4. Document Viewer

The frontend can open document content directly from the backend. This supports citation review and general browsing.

Current behavior:

- DOCX is rendered into basic HTML-like structure
- TXT and MD are returned as plain text
- PDF text is extracted page by page and returned as plain text

### 5. Topics

Topics are used to organize study content and track performance at a more focused level than the full course.

Supported topic features:

- list topics for a course
- create a topic manually
- attach selected documents to a topic
- auto-create topics from chunk section titles when available

### 6. Study Sets and Flashcards

StudyVault can generate flashcards from either:

- selected documents
- a selected topic

Flashcards are stored in SQLite and can be reopened later. Each card can include a `source_chunk_id` so generated content stays tied to the underlying course material.

### 7. Quizzes

StudyVault can generate quizzes from:

- selected documents
- a selected topic
- selected chunks, used for focus or missed-question review

Supported question types:

- multiple choice
- true/false
- short answer

Supported quiz features:

- generate and save quizzes
- reopen saved quizzes
- submit answers
- grade responses
- review past attempts
- see course-wide and quiz-specific metrics

### 8. Progress Tracking

The platform keeps track of quiz attempts and uses that data to identify weak areas.

Tracking features include:

- quiz attempt history
- quiz-level metrics
- course-level metrics
- missed focus areas
- topic mastery updates
- improvement area summaries

Topic mastery is updated after quiz submission. Topic-scoped quizzes affect only the topic they were created for, while broader document quizzes can still contribute to chunk-based topic mapping.

## Stack

### Backend

- Python
- FastAPI
- SQLite
- FAISS
- sentence-transformers
- OpenAI API

### Frontend

- React 18
- react-scripts
- CSS modules by file, primarily `App.css`

### Parsing and File Handling

- `pypdf`
- `python-docx`
- `python-pptx`
- `markdown`

## Project Structure

```text
StudyVault/
├── backend/
│   ├── app.py                  # FastAPI app creation and startup wiring
│   ├── config.py               # Environment-backed configuration
│   ├── ingestion.py            # Document parsing, chunking, embeddings, vector store
│   ├── main.py                 # Thin entrypoint for running the API
│   ├── routes_chat.py          # Chat endpoint
│   ├── routes_general.py       # Courses, topics, documents, health, root
│   ├── routes_quiz.py          # Quizzes, attempts, metrics, focus areas
│   ├── routes_study.py         # Study sets and flashcards
│   ├── state.py                # Shared OpenAI client and ingestion pipeline
│   └── services/
│       ├── grading.py          # Grading and answer normalization
│       ├── payloads.py         # Model output parsing
│       ├── quiz_records.py     # Quiz record and metric helpers
│       ├── sources.py          # Source chunk loading and citation shaping
│       └── topic_mastery.py    # Topic mastery update logic
├── db/
│   ├── schema.py               # SQLite schema setup
│   └── studyvault.db           # Local database
├── data/
│   ├── uploads/                # Uploaded course files
│   └── vector_store/           # Reserved vector store directory
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx             # Main application UI
│       ├── App.css             # Main styling
│       ├── index.js
│       ├── index.css
│       └── components/
│           ├── SettingsUI.tsx
│           └── SettingsUI.css
├── requirements.txt
├── .env
└── README.md
```

## Backend Architecture

The backend is now split by responsibility instead of keeping all routes and helpers in one file.

### App Layer

- `backend/app.py` creates the FastAPI app, enables CORS, registers routers, and rebuilds the vector index at startup.
- `backend/main.py` exists only to run the app with `uvicorn`.

### Route Layer

- `routes_general.py` contains course, topic, and document routes
- `routes_study.py` contains study set and flashcard routes
- `routes_quiz.py` contains quiz generation, grading, metrics, and focus routes
- `routes_chat.py` contains the grounded chat route

### Service Layer

- `payloads.py` parses model JSON output for flashcards and quizzes
- `grading.py` handles answer normalization and grading logic
- `sources.py` loads source-scoped chunks and builds citation payloads
- `quiz_records.py` builds attempt summaries and metric views
- `topic_mastery.py` updates topic mastery after quiz submission

### State Layer

`backend/state.py` owns the shared `OpenAI` client and the `IngestionPipeline` instance used across the backend.

## Data Model

SQLite stores application metadata and study state. The main tables are:

- `courses`
- `documents`
- `document_versions`
- `chunks`
- `embeddings`
- `conversations`
- `messages`
- `retrieval_traces`
- `study_sets`
- `flashcards`
- `quizzes`
- `quiz_questions`
- `quiz_attempts`
- `quiz_responses`
- `topics`
- `topic_chunks`
- `topic_mastery`

In general:

- files live on disk
- metadata lives in SQLite
- vectors live in FAISS at runtime

## Configuration

All exported backend config values are read from environment variables through `.env`.

Current config values in `backend/config.py`:

- `BASE_DIR`
- `DATA_DIR`
- `DB_DIR`
- `UPLOADS_DIR`
- `VECTOR_STORE_DIR`
- `API_HOST`
- `API_PORT`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_API_URL`
- `OPENAI_TIMEOUT`
- `EMBEDDING_MODEL`
- `EMBEDDINGS_DIMENSION`
- `RETRIEVAL_TOP_K`
- `SIMILARITY_THRESHOLD`
- `CHUNK_SIZE`
- `CHUNK_OVERLAP_PERCENT`
- `DB_PATH`

## Setup and Startup

Local install steps, run commands, and backend startup behavior are documented in [STARTUP.md](C:/Users/jwill/Documents/localGitRepo/StudyVault/STARTUP.md).

## API Surface

### General

- `GET /`
- `GET /health`

### Courses

- `GET /courses`
- `POST /courses`
- `GET /courses/{course_id}`
- `DELETE /courses/{course_id}`

### Documents

- `GET /courses/{course_id}/documents`
- `POST /courses/{course_id}/documents`
- `GET /documents/{doc_id}/content`

### Topics

- `GET /courses/{course_id}/topics`
- `POST /courses/{course_id}/topics`
- `POST /courses/{course_id}/topics/{topic_id}/attach-documents`
- `POST /courses/{course_id}/topics/auto`

### Study Sets

- `GET /courses/{course_id}/study-sets`
- `GET /study-sets/{studyset_id}/flashcards`
- `POST /courses/{course_id}/study-sets/generate`
- `DELETE /study-sets/{studyset_id}`

### Quizzes

- `GET /courses/{course_id}/quizzes`
- `DELETE /quizzes/{quiz_id}`
- `GET /quizzes/{quiz_id}`
- `GET /quizzes/{quiz_id}/attempts`
- `GET /quizzes/{quiz_id}/attempts/{attempt_id}`
- `GET /courses/{course_id}/quiz-attempts`
- `GET /quizzes/{quiz_id}/metrics`
- `GET /courses/{course_id}/quiz-metrics`
- `GET /courses/{course_id}/missed-focus-areas`
- `GET /courses/{course_id}/improvement-areas`
- `POST /courses/{course_id}/quizzes/generate`
- `POST /quizzes/{quiz_id}/submit`

### Chat

- `POST /courses/{course_id}/chat`

## Frontend Notes

The current frontend is centered around `frontend/src/App.jsx`, which holds most of the application state and view logic in one file. The main sections in the UI are:

- materials
- chat
- study sets
- quizzes
- tracking

The styling in `App.css` defines the current StudyVault visual theme:

- indigo to purple gradient background
- white card surfaces
- pale blue active states
- rounded panels and controls

## Current Constraints

The project is functional, but there are a few architectural constraints worth knowing:

- the main frontend UI is still concentrated in a single React component
- retrieval depends on rebuilding the in-memory FAISS index at startup
- some generated or auxiliary files exist in the repo root and are not part of the runtime application
- `frontend/src/components/SettingsUI.tsx` exists in the source tree but is not part of the main app entry flow

## Development Notes

If you are changing the backend:

- router modules should stay thin
- service modules should hold cross-route business logic
- `config.py` should continue reading exported settings from environment variables
- database schema changes belong in `db/schema.py`

If you are changing the frontend:

- `App.jsx` is the main integration point
- `App.css` defines most of the current application theme
- any larger frontend refactor should likely begin by splitting `App.jsx` into feature-level components

## Summary

StudyVault is a course-material-based study platform that combines:

- local document ingestion
- vector retrieval
- grounded chat with citations
- flashcard generation
- quiz generation and grading
- progress tracking and weak-area analysis

Its core value is not just answer generation, but keeping study workflows tied to the student’s own source material.

