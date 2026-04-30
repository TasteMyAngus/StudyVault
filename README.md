# StudyVault

Grounded Study Assistant with Citations (RAG)

## Quick Start

### Backend Setup

```bash
cd studyvault

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python db/schema.py

# Run API
cd backend
python main.py
```

API runs on `http://localhost:8000`

### Frontend Setup (coming next)

```bash
cd studyvault/frontend
npm install
npm start
```

UI runs on `http://localhost:3000`

---

## Project Structure

```
studyvault/
├── backend/              # FastAPI app
│   ├── main.py          # API endpoints
│   ├── config.py        # Configuration
│   ├── ingestion.py     # Parse → Chunk → Embed → Store
│   └── __init__.py
├── frontend/            # React app
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
├── db/                  # Database
│   └── schema.py        # SQLite schema initialization
├── data/                # Local storage
│   ├── uploads/         # PDF/document uploads
│   └── vector_store/    # Chroma vector database
├── requirements.txt
└── README.md
```

---

## Stack

- **Backend**: Python + FastAPI
- **Frontend**: React
- **Database**: SQLite + Chroma (vector store)
- **Embeddings**: Sentence-Transformer (all-mpnet-base-v2)
- **Document Parsing**: pypdf, python-docx, markdown

---

## Roadmap (14 weeks)

- **W0–W2**: Ingestion + DB schema (scaffolded)
- **W2–W6**: RAG Q&A + citations UI
- **W6–W10**: Study mode + quiz tracking
- **W10–W12**: Exam cram plan + daily quizzes
- **W12–W14**: Evaluation + polish

---

## Next Steps

1. Provide sample course material (PDF/slides)
2. Test ingestion pipeline with real data
3. Implement RAG retrieval + grounded generation (W2–W6)
