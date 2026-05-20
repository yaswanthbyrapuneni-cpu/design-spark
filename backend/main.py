import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin, ai, auth, mentor, startup

app = FastAPI(title="AP InnovationOS API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5173")

_origins = [frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"]
_extra = os.getenv("EXTRA_ORIGINS", "")
if _extra:
    _origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.(vercel\.app|railway\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(startup.router)
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(mentor.router)
app.include_router(ai.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ap-innovationos-api"}
