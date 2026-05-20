from fastapi import APIRouter

from routers.startup import _score_startup, list_startups

router = APIRouter(prefix="/mentor", tags=["mentor"])

DEMO_SESSIONS = [
    {
        "id": "s1",
        "startup": "AgriSense AI",
        "startup_id": "demo-startup-1",
        "session_date": "2026-05-18",
        "duration_mins": 60,
        "topic": "Pilot evidence review",
        "notes": "Discussed district-level pilot plan for Vizag farmers. Team to prepare validation doc.",
        "action_items": ["Prepare pilot validation document", "Share farmer feedback survey results"],
        "status": "Completed",
    },
    {
        "id": "s2",
        "startup": "AgriSense AI",
        "startup_id": "demo-startup-1",
        "session_date": "2026-05-22",
        "duration_mins": 45,
        "topic": "GTM strategy review",
        "notes": "",
        "action_items": ["Present GTM deck", "Identify government contacts"],
        "status": "Scheduled",
    },
    {
        "id": "s3",
        "startup": "SkillBridge Rural",
        "startup_id": "demo-startup-2",
        "session_date": "2026-05-19",
        "duration_mins": 50,
        "topic": "Learning path review",
        "notes": "Team needs to complete EdTech market sizing module.",
        "action_items": ["Complete market sizing module", "Register for NASSCOM cohort"],
        "status": "Scheduled",
    },
    {
        "id": "s4",
        "startup": "MedReach AP",
        "startup_id": "demo-startup-3",
        "session_date": "2026-05-15",
        "duration_mins": 60,
        "topic": "Readiness score walkthrough",
        "notes": "Strong technical team, needs funding narrative.",
        "action_items": ["Improve pitch deck funding slide", "Apply for DPIIT recognition"],
        "status": "Completed",
    },
]


@router.get("/dashboard")
def mentor_dashboard() -> dict:
    startups = list_startups()
    assigned = []

    for profile in startups[:4]:
        score = _score_startup(profile)
        assigned.append(
            {
                "startup": profile["name"],
                "sector": profile["sector"],
                "district": profile["district"],
                "score": score["overall"],
                "band": score["band"],
                "topGap": score["gaps"][0],
                "nextAction": score["nextSteps"][0],
            }
        )

    if not assigned:
        assigned.append(
            {
                "startup": "AgriSense AI",
                "sector": "AgriTech",
                "district": "Visakhapatnam",
                "score": 77,
                "band": "Near Ready",
                "topGap": "Funding and scale narrative can be sharper for public-sector review",
                "nextAction": "Prepare a district-level pilot validation plan",
            }
        )

    return {
        "mentor": {
            "name": "Dr. Venkat Rao",
            "domain": "AgriTech, GTM, public-sector pilots",
            "availability": "6 slots this week",
        },
        "metrics": {
            "assignedStartups": len(assigned),
            "sessionsThisWeek": 7,
            "openActions": 11,
            "pilotReviews": 3,
        },
        "assigned": assigned,
        "sessions": DEMO_SESSIONS[:3],
    }


@router.get("/sessions")
def get_all_sessions() -> list[dict]:
    return DEMO_SESSIONS


@router.put("/sessions/{session_id}")
def update_session(session_id: str, payload: dict) -> dict:
    for session in DEMO_SESSIONS:
        if session["id"] == session_id:
            if "notes" in payload:
                session["notes"] = payload["notes"]
            if "action_items" in payload:
                session["action_items"] = payload["action_items"]
            if "status" in payload:
                session["status"] = payload["status"]
            return session
    return {"error": "session not found"}
