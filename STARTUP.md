# StudyVault Startup Guide

This file contains the setup and startup steps for running StudyVault locally.

## Installation

### Backend Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

## Running the Project

### Start the Backend

From the repository root:

```bash
venv\Scripts\activate
cd backend
python main.py
```

The API runs on:

```text
http://localhost:8000
```

### Start the Frontend

In a separate terminal:

```bash
cd frontend
npm start
```

The frontend runs on:

```text
http://localhost:3000
```

The frontend uses the proxy defined in `frontend/package.json` to reach the backend.

## Backend Startup Behavior

On backend startup, StudyVault:

1. initializes the SQLite schema
2. reads stored chunks from the database
3. regenerates embeddings for those chunks
4. rebuilds the in-memory FAISS index

This keeps retrieval working across restarts even though the vector store itself is not persisted directly as a standalone FAISS file.
