# AP InnovationOS Prototype

Polished Design Spark Challenge 2026 prototype for RTIH/APIS ecosystem intelligence.

## Frontend

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Routes:

- `/`
- `/startup/onboarding`
- `/startup/readiness`
- `/startup/opportunities`
- `/startup/ai-twin`
- `/admin/dashboard`

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Endpoints:

- `GET /health`
- `POST /startup/onboard`
- `GET /startup/{startup_id}`
- `GET /startup/{startup_id}/score`
- `POST /startup/{startup_id}/score`
- `GET /startup/{startup_id}/matches`
- `GET /admin/dashboard`

The frontend uses API calls with deterministic seeded fallbacks, so the demo still works if the backend is unavailable.
