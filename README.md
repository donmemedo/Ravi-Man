# Narrative Iran — web app

Companion app for the Narrative Clip lifelogging camera (one photo every 30 s → daily moments you can search).
Bilingual (فارسی RTL / English), light/dark/auto theme, fully responsive.

- `frontend/` — Next.js 16 (App Router). The browser calls `/api/*` on the same origin; Next proxies it to FastAPI.
- `backend/` — FastAPI with seeded in-memory demo data (resets on restart). Tests: `cd backend && pytest`.

## Run

```bash
docker compose up --build        # web → http://localhost:3131   API docs → http://localhost:8131/docs
```

Local dev without Docker:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn main:app --port 8131
cd frontend && npm install && npm run dev   # http://localhost:3131
```

Demo photos come from picsum.photos; if it's unreachable each moment falls back to its colour gradient.
