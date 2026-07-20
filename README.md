# Microcosm

Microcosm is an AI-native Knowledge Operating System for capturing, organizing, retrieving, and growing personal knowledge.

## Project Structure

```text
client/      React + TypeScript frontend
server/      Node.js product backend
ai-service/  Python FastAPI AI/RAG service
docs/        Product and engineering documentation
```

## Current Foundation

- React + TypeScript + Vite client
- Portfolio-inspired Microcosm shell
- Tiptap editor foundation
- Node.js Express product backend
- Python FastAPI AI service
- Health checks for backend services

## Run Locally

### Client

```bash
cd client
npm install
npm run dev
```

Default URL:

```text
http://127.0.0.1:5173/
```

### Node Product Backend

```bash
cd server
npm install
npm run dev
```

Default URL:

```text
http://127.0.0.1:5000/api/v1/health
```

If port `5000` is busy on Windows, run:

```powershell
$env:PORT=5001; node src/index.js
```

### Python AI Service

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Health URL:

```text
http://127.0.0.1:8000/internal/v1/health/
```

## Next Build Steps

1. Build auth module in Node.
2. Add MongoDB connection.
3. Implement workspace/notebook/section/page models.
4. Connect frontend shell to real APIs.
5. Add Cloudinary image upload.
6. Add Python RAG indexing and Qdrant integration.
