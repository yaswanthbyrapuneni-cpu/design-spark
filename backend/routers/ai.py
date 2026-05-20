from fastapi import APIRouter, HTTPException
from psycopg.types.json import Jsonb

from db import get_connection
from routers.startup import _current_startup, _match_opportunities, _get_opportunities_db
from services.ai_scoring import score_startup, chat_with_twin, generate_pitch, match_mentor
from services.demo_data import MENTORS, OPPORTUNITIES, READINESS

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_latest_score(startup_id: str) -> dict:
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "select * from startup_scores where startup_id = %s order by created_at desc limit 1",
                    (startup_id,),
                )
                row = cursor.fetchone()
        if row:
            return {
                "overall": row["overall"],
                "pilot_band": row["band"],
                "mentor_domain": row["mentor_domain"],
                "scores": row["scores"],
                "strengths": row["strengths"],
                "gaps": row["gaps"],
                "next_steps": row["next_steps"],
            }
    except Exception:
        pass
    return READINESS


def _save_score_db(startup_id: str, score: dict) -> None:
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into startup_scores (
                      startup_id, overall, band, mentor_domain, scores, strengths, gaps, next_steps
                    )
                    values (
                      %(startup_id)s, %(overall)s, %(pilot_band)s, %(mentor_domain)s,
                      %(scores)s::jsonb, %(strengths)s::jsonb, %(gaps)s::jsonb, %(next_steps)s::jsonb
                    )
                    """,
                    {
                        "startup_id": startup_id,
                        "overall": score["overall"],
                        "pilot_band": score.get("pilot_band", "Emerging"),
                        "mentor_domain": score.get("mentor_domain", ""),
                        "scores": Jsonb([
                            {"label": "Innovation", "value": score.get("innovation", 60), "color": "#0f6e56"},
                            {"label": "Market", "value": score.get("market", 55), "color": "#ba7517"},
                            {"label": "Technology", "value": score.get("technology", 60), "color": "#534ab7"},
                            {"label": "Pilot", "value": score.get("pilot", 55), "color": "#0f6e56"},
                            {"label": "Funding", "value": score.get("funding", 55), "color": "#d85a30"},
                        ]),
                        "strengths": Jsonb(score.get("strengths", [])),
                        "gaps": Jsonb(score.get("gaps", [])),
                        "next_steps": Jsonb(score.get("next_steps", [])),
                    },
                )
            connection.commit()
    except Exception:
        pass


def _format_score_for_frontend(score: dict) -> dict:
    """Normalize AI score dict to the shape the frontend expects."""
    return {
        "overall": score.get("overall", 70),
        "band": score.get("pilot_band", score.get("band", "Emerging")),
        "mentorDomain": score.get("mentor_domain", "Startup and government pilots"),
        "scores": score.get("scores") or [
            {"label": "Innovation", "value": score.get("innovation", 60), "color": "#0f6e56"},
            {"label": "Market", "value": score.get("market", 55), "color": "#ba7517"},
            {"label": "Technology", "value": score.get("technology", 60), "color": "#534ab7"},
            {"label": "Pilot", "value": score.get("pilot", 55), "color": "#0f6e56"},
            {"label": "Funding", "value": score.get("funding", 55), "color": "#d85a30"},
        ],
        "strengths": score.get("strengths", []),
        "gaps": score.get("gaps", []),
        "nextSteps": score.get("next_steps", score.get("nextSteps", [])),
        "source": score.get("source", "ai"),
    }


@router.post("/score")
def ai_score(payload: dict) -> dict:
    startup_id = payload.get("startup_id", "demo-startup-1")
    profile = _current_startup(startup_id)
    score = score_startup(profile)
    _save_score_db(startup_id, score)
    return {**_format_score_for_frontend(score), "startup_id": startup_id}


@router.post("/match")
def ai_match(payload: dict) -> list:
    startup_id = payload.get("startup_id", "demo-startup-1")
    profile = _current_startup(startup_id)
    try:
        matches = _match_opportunities(profile, _get_opportunities_db())
    except Exception:
        matches = _match_opportunities(profile, OPPORTUNITIES)
    return [{**item, "startup_id": startup_id} for item in matches]


@router.post("/learning")
def ai_learning(payload: dict) -> list:
    startup_id = payload.get("startup_id", "demo-startup-1")
    gaps = payload.get("gaps", [])
    profile = _current_startup(startup_id)

    if not gaps:
        score = score_startup(profile)
        gaps = score.get("gaps", [])

    modules = []
    gap_module_map = {
        "pilot": ("Government Pilot GTM Playbook", 45),
        "fund": ("Investor Pitch & Grant Writing", 40),
        "market": ("Market Sizing for AP Sectors", 35),
        "tech": ("Technical Architecture for Pilots", 50),
        "dpiit": ("DPIIT Recognition Fast Track", 30),
        "user": ("Customer Discovery in Rural AP", 35),
        "validation": ("Field Validation Evidence Pack", 35),
        "gtm": ("GTM Strategy for Government Sales", 40),
        "mentor": ("Working with APIS Mentors", 25),
    }

    used_titles = set()
    for gap in gaps[:4]:
        gap_lower = gap.lower()
        for keyword, (title, duration) in gap_module_map.items():
            if keyword in gap_lower and title not in used_titles:
                modules.append({
                    "startup_id": startup_id,
                    "title": title,
                    "duration_mins": duration,
                    "status": "Recommended",
                    "gap": gap,
                })
                used_titles.add(title)
                break
        else:
            title = f"Addressing: {gap[:40]}"
            if title not in used_titles:
                modules.append({
                    "startup_id": startup_id,
                    "title": title,
                    "duration_mins": 30,
                    "status": "Recommended",
                    "gap": gap,
                })
                used_titles.add(title)

    if not modules:
        modules = [
            {"startup_id": startup_id, "title": "Government Pilot GTM Playbook", "duration_mins": 45, "status": "Recommended", "gap": "General pilot readiness"},
            {"startup_id": startup_id, "title": "Field Validation Evidence Pack", "duration_mins": 35, "status": "Recommended", "gap": "Evidence documentation"},
        ]

    return modules


@router.post("/pitch")
def ai_pitch(payload: dict) -> dict:
    startup_id = payload.get("startup_id", "demo-startup-1")
    profile = _current_startup(startup_id)
    score = _get_latest_score(startup_id)
    return {**generate_pitch(profile, score), "startup_id": startup_id}


@router.post("/mentor-match")
def ai_mentor_match(payload: dict) -> list:
    startup_id = payload.get("startup_id", "demo-startup-1")
    profile = _current_startup(startup_id)
    score = _get_latest_score(startup_id)
    return match_mentor(profile, score, MENTORS)


@router.post("/chat")
def ai_chat(payload: dict) -> dict:
    startup_id = payload.get("startup_id", "demo-startup-1")
    message = str(payload.get("message", "")).strip()
    history = payload.get("history", [])

    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    profile = _current_startup(startup_id)
    score_raw = _get_latest_score(startup_id)
    score = _format_score_for_frontend(score_raw)

    try:
        matches_raw = _match_opportunities(profile, _get_opportunities_db())
    except Exception:
        matches_raw = _match_opportunities(profile, OPPORTUNITIES)

    reply = chat_with_twin(
        startup_name=profile.get("name", "your startup"),
        profile=profile,
        score=score,
        matches=matches_raw[:4],
        message=message,
        history=history,
    )

    return {"reply": reply, "startup_id": startup_id}
