import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(os.environ["BASE_DIR"])
DATA_DIR = Path(os.environ["DATA_DIR"])
DB_DIR = Path(os.environ["DB_DIR"])
UPLOADS_DIR = Path(os.environ["UPLOADS_DIR"])
VECTOR_STORE_DIR = Path(os.environ["VECTOR_STORE_DIR"])

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)

API_HOST = os.environ["API_HOST"]
API_PORT = int(os.environ["API_PORT"])

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
OPENAI_MODEL = os.environ["OPENAI_MODEL"]
OPENAI_API_URL = os.environ["OPENAI_API_URL"]
OPENAI_TIMEOUT = int(os.environ["OPENAI_TIMEOUT"])

EMBEDDING_MODEL = os.environ["EMBEDDING_MODEL"]
EMBEDDINGS_DIMENSION = int(os.environ["EMBEDDINGS_DIMENSION"])

RETRIEVAL_TOP_K = int(os.environ["RETRIEVAL_TOP_K"])
SIMILARITY_THRESHOLD = float(os.environ["SIMILARITY_THRESHOLD"])

CHUNK_SIZE = int(os.environ["CHUNK_SIZE"])
CHUNK_OVERLAP_PERCENT = float(os.environ["CHUNK_OVERLAP_PERCENT"])

DB_PATH = Path(os.environ["DB_PATH"])

print(f"Config loaded: DATA_DIR={DATA_DIR}, DB_PATH={DB_PATH}")

