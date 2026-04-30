from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app import app

if __name__ == "__main__":
    import uvicorn
    from backend.config import API_HOST, API_PORT

    uvicorn.run(app, host=API_HOST, port=API_PORT)
