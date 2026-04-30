from openai import OpenAI

from .config import OPENAI_API_KEY
from .ingestion import IngestionPipeline

openai_client = OpenAI(api_key=OPENAI_API_KEY)
pipeline = IngestionPipeline()
