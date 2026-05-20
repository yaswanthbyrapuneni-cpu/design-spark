from fastapi import APIRouter
from psycopg.types.json import Jsonb

from db import get_connection
from services.demo_data import DEMO_STARTUPS, OPPORTUNITIES, READINESS, STARTUP

router = APIRouter(prefix="/startup", tags=["startup"])

STARTUP_STORE: dict[str, dict] = {s["id"]: s.copy() for s in DEMO_STARTUPS}


def _row_to_startup(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "district": row["district"],
        "sector": row["sector"],
        "stage": row["stage"],
        "dpiit": row["dpiit"],
        "team": row["team"],
        "description": row["description"],
        "users": row["users"],
        "pilot": row["pilot"],
        "mentorshipNeed": row["mentorship_need"],
    }


def _startup_to_db(profile: dict) -> dict:
    return {
        "id": profile.get("id", STARTUP["id"]),
        "name": profile.get("name", ""),
        "district": profile.get("district", ""),
        "sector": profile.get("sector", ""),
        "stage": profile.get("stage", ""),
        "dpiit": profile.get("dpiit", ""),
        "team": int(profile.get("team") or 0),
        "description": profile.get("description", ""),
        "users": profile.get("users", ""),
        "pilot": profile.get("pilot", ""),
        "mentorship_need": profile.get("mentorshipNeed", ""),
    }


def _save_startup_db(profile: dict) -> dict:
    db_profile = _startup_to_db(profile)
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                insert into startups (
                  id, name, district, sector, stage, dpiit, team, description, users, pilot, mentorship_need
                )
                values (
                  %(id)s, %(name)s, %(district)s, %(sector)s, %(stage)s, %(dpiit)s, %(team)s,
                  %(description)s, %(users)s, %(pilot)s, %(mentorship_need)s
                )
                on conflict (id) do update set
                  name = excluded.name,
                  district = excluded.district,
                  sector = excluded.sector,
                  stage = excluded.stage,
                  dpiit = excluded.dpiit,
                  team = excluded.team,
                  description = excluded.description,
                  users = excluded.users,
                  pilot = excluded.pilot,
                  mentorship_need = excluded.mentorship_need,
                  updated_at = now()
                returning *
                """,
                db_profile,
            )
            row = cursor.fetchone()
        connection.commit()
    return _row_to_startup(row)


def _get_startup_db(startup_id: str) -> dict | None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("select * from startups where id = %s", (startup_id,))
            row = cursor.fetchone()
    return _row_to_startup(row) if row else None


def list_startups() -> list[dict]:
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("select * from startups order by updated_at desc")
                rows = cursor.fetchall()
        return [_row_to_startup(row) for row in rows]
    except Exception:
        return list(STARTUP_STORE.values())  # falls back to all 5 demo startups


def _save_score_db(startup_id: str, score: dict) -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                insert into startup_scores (
                  startup_id, overall, band, mentor_domain, scores, strengths, gaps, next_steps
                )
                values (
                  %(startup_id)s, %(overall)s, %(band)s, %(mentorDomain)s, %(scores)s::jsonb,
                  %(strengths)s::jsonb, %(gaps)s::jsonb, %(nextSteps)s::jsonb
                )
                """,
                {
                    **score,
                    "startup_id": startup_id,
                    "scores": Jsonb(score["scores"]),
                    "strengths": Jsonb(score["strengths"]),
                    "gaps": Jsonb(score["gaps"]),
                    "nextSteps": Jsonb(score["nextSteps"]),
                },
            )
        connection.commit()


def _get_opportunities_db() -> list[dict]:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("select * from opportunities where is_active = true order by created_at")
            rows = cursor.fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "type": row["type"],
            "sponsor": row["sponsor"],
            "deadline": row["deadline"],
            "sector_tags": row["sector_tags"],
            "stage_tags": row["stage_tags"],
        }
        for row in rows
    ]


def _save_matches_db(startup_id: str, matches: list[dict]) -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            for item in matches:
                opportunity_id = item.get("id") or item["title"].lower().replace(" ", "-")
                cursor.execute(
                    """
                    insert into opportunity_matches (startup_id, opportunity_id, match, reasons)
                    values (%s, %s, %s, %s::jsonb)
                    on conflict (startup_id, opportunity_id) do update set
                      match = excluded.match,
                      reasons = excluded.reasons,
                      matched_at = now()
                    """,
                    (startup_id, opportunity_id, item["match"], Jsonb(item["reasons"])),
                )
        connection.commit()


def _current_startup(startup_id: str) -> dict:
    try:
        profile = _get_startup_db(startup_id)
        if profile:
            STARTUP_STORE[startup_id] = profile
            return profile
    except Exception:
        pass
    return STARTUP_STORE.get(startup_id, STARTUP_STORE[STARTUP["id"]])


def _has_text(value: object) -> bool:
    return isinstance(value, str) and len(value.strip()) > 0


def _wants_pilot(value: object) -> bool:
    text = str(value or "").strip().lower()
    return ("yes" in text or "seeking" in text or "actively" in text) and not text.startswith("no")


def _score_startup(profile: dict) -> dict:
    stage = str(profile.get("stage", "")).lower()
    sector = str(profile.get("sector", "")).lower()
    pilot = str(profile.get("pilot", "")).lower()
    team = int(profile.get("team") or 0)

    innovation = 56
    market = 50
    technology = 52
    pilot_score = 45
    funding = 48

    if _has_text(profile.get("description")):
        innovation += 12
        technology += 8
    if any(keyword in sector for keyword in ["agri", "health", "gov", "ed", "deep", "ai"]):
        innovation += 10
        market += 8
    if stage in {"prototype", "mvp", "pilot", "revenue"}:
        technology += 16
    if stage in {"mvp", "pilot", "revenue"}:
        pilot_score += 16
    if stage in {"pilot", "revenue"}:
        market += 10
        funding += 8
    if _has_text(profile.get("users")):
        market += 12
    if _has_text(profile.get("dpiit")):
        funding += 12
        pilot_score += 8
    if _wants_pilot(pilot):
        pilot_score += 16
    if team >= 3:
        technology += 6
        funding += 4
    if _has_text(profile.get("mentorshipNeed")):
        funding += 4
        market += 4

    scores = [
        {"label": "Innovation", "value": min(96, innovation), "color": "#0f6e56"},
        {"label": "Market", "value": min(94, market), "color": "#ba7517"},
        {"label": "Technology", "value": min(96, technology), "color": "#534ab7"},
        {"label": "Pilot", "value": min(96, pilot_score), "color": "#0f6e56"},
        {"label": "Funding", "value": min(92, funding), "color": "#d85a30"},
    ]
    overall = round(sum(item["value"] for item in scores) / len(scores))
    band = "Ready" if overall >= 80 else "Near Ready" if overall >= 68 else "Emerging"

    strengths = []
    gaps = []
    next_steps = []

    if _has_text(profile.get("description")):
        strengths.append("Clear startup problem and solution narrative")
    else:
        gaps.append("Problem and solution narrative needs detail")
        next_steps.append("Write a sharper problem, user, and solution note")

    if _has_text(profile.get("users")):
        strengths.append("Defined target user segment")
    else:
        gaps.append("Target users are not specific enough")
        next_steps.append("Identify priority users and district context")

    if stage in {"mvp", "pilot", "revenue"}:
        strengths.append("Product maturity is strong enough for pilot conversation")
    else:
        gaps.append("Prototype maturity needs more evidence")
        next_steps.append("Prepare MVP screenshots and field workflow")

    if _has_text(profile.get("dpiit")):
        strengths.append("DPIIT recognition improves grant and pilot eligibility")
    else:
        gaps.append("DPIIT recognition is missing")
        next_steps.append("Complete DPIIT recognition or add eligibility proof")

    if _wants_pilot(pilot):
        strengths.append("Pilot intent is clearly aligned")
        next_steps.append("Prepare a district-level pilot validation plan")
    else:
        gaps.append("Pilot intent needs to be clearer")
        next_steps.append("Define the pilot ask, geography, users, and success metrics")

    if not gaps:
        gaps.append("Funding and scale narrative can be sharper for public-sector review")
    if len(next_steps) < 3:
        next_steps.extend(["Meet a domain mentor", "Package evidence for RTIH/APIS review"])

    return {
        "overall": overall,
        "band": band,
        "mentorDomain": f"{profile.get('sector', 'Startup')} and government pilots",
        "scores": scores,
        "strengths": strengths[:4],
        "gaps": gaps[:4],
        "nextSteps": next_steps[:4],
    }


def _match_opportunities(profile: dict, opportunity_source: list[dict] | None = None) -> list[dict]:
    sector = str(profile.get("sector", "")).lower()
    stage = str(profile.get("stage", "")).lower()
    pilot = str(profile.get("pilot", "")).lower()
    dpiit = _has_text(profile.get("dpiit"))
    matches = []

    for opportunity in opportunity_source or OPPORTUNITIES:
        score = 20
        reasons = []
        title = opportunity["title"].lower()
        kind = opportunity["type"].lower()
        sector_tags = [str(tag).lower() for tag in opportunity.get("sector_tags", [])]
        stage_tags = [str(tag).lower() for tag in opportunity.get("stage_tags", [])]

        if "all" in sector_tags or "all" in stage_tags or opportunity["type"] in {"Grant", "Program"}:
            score += 15
            reasons.append("Broad eligibility")
        if sector and (sector in title or sector in sector_tags or "agri" in sector and "agritech" in sector_tags):
            score += 38
            reasons.append("Sector fit")
        if stage and (stage in stage_tags or "all" in stage_tags):
            score += 12
            reasons.append("Stage fit")
        if kind == "pilot" and _wants_pilot(pilot):
            score += 18
            reasons.append("Pilot interest aligned")
        if kind == "mentor" and _has_text(profile.get("mentorshipNeed")):
            score += 20
            reasons.append("Mentorship need aligned")
        if stage in {"mvp", "pilot", "revenue"} and "Stage fit" not in reasons:
            score += 12
            reasons.append("Stage fit")
        if dpiit:
            score += 12
            reasons.append("DPIIT-recognized startup")
        if kind == "grant" and not dpiit:
            score -= 10
            reasons.append("DPIIT proof recommended")

        if not reasons:
            reasons.append("General ecosystem relevance")

        matches.append({**opportunity, "match": max(35, min(score, 98)), "reasons": reasons[:3]})

    return sorted(matches, key=lambda item: item["match"], reverse=True)


@router.post("/onboard")
def onboard_startup(payload: dict) -> dict:
    startup_id = payload.get("id") or STARTUP["id"]
    profile = {**STARTUP, **payload, "id": startup_id}
    STARTUP_STORE[startup_id] = profile
    try:
        return _save_startup_db(profile)
    except Exception:
        return profile


@router.get("/{startup_id}")
def get_startup(startup_id: str) -> dict:
    return _current_startup(startup_id)


@router.get("/{startup_id}/score")
def get_score(startup_id: str) -> dict:
    return {**_score_startup(_current_startup(startup_id)), "startup_id": startup_id}


@router.post("/{startup_id}/score")
def generate_score(startup_id: str, payload: dict | None = None) -> dict:
    profile = {**_current_startup(startup_id), **(payload or {}), "id": startup_id}
    STARTUP_STORE[startup_id] = profile
    score = _score_startup(profile)
    try:
        _save_startup_db(profile)
        _save_score_db(startup_id, score)
    except Exception:
        pass
    return {**score, "startup_id": startup_id, "source": "deterministic-profile-score"}


@router.get("/{startup_id}/matches")
def get_matches(startup_id: str) -> list[dict]:
    profile = _current_startup(startup_id)
    try:
        matches = _match_opportunities(profile, _get_opportunities_db())
        _save_matches_db(startup_id, matches)
    except Exception:
        matches = _match_opportunities(profile)
    return [{**item, "startup_id": startup_id} for item in matches]


COLLABORATION_MATRIX: dict[str, list[str]] = {
    "agritech": ["healthtech", "cleantech", "govtech"],
    "healthtech": ["agritech", "edtech", "govtech"],
    "edtech": ["healthtech", "govtech", "fintech"],
    "govtech": ["agritech", "edtech", "healthtech", "cleantech"],
    "cleantech": ["agritech", "govtech"],
    "fintech": ["edtech", "govtech"],
    "deeptech": ["agritech", "healthtech", "cleantech"],
}


@router.get("/{startup_id}/collaborators")
def get_collaborators(startup_id: str) -> list[dict]:
    profile = _current_startup(startup_id)
    all_startups = list_startups()
    sector = str(profile.get("sector", "")).lower()
    adjacent = COLLABORATION_MATRIX.get(sector, [])
    result = []
    for s in all_startups:
        if s["id"] == startup_id:
            continue
        s_sector = str(s.get("sector", "")).lower()
        if s_sector == sector:
            angle = f"Both working in {profile['sector']} — potential co-development or shared market entry"
            rel = "Same sector"
            score = 82
        elif s_sector in adjacent:
            angle = f"{profile['sector']} meets {s['sector']} — integration opportunity for broader AP impact"
            rel = "Adjacent sector"
            score = 72
        else:
            angle = "Cross-sector collaboration for AP ecosystem innovation and DPI coverage"
            rel = "Ecosystem partner"
            score = 56
        result.append({**s, "collaboration_angle": angle, "relationship": rel, "collab_score": score})
    return sorted(result, key=lambda c: c["collab_score"], reverse=True)


@router.get("/{startup_id}/learning")
def get_learning_path(startup_id: str) -> list[dict]:
    score = _score_startup(_current_startup(startup_id))
    return [
        {
            "startup_id": startup_id,
            "title": "Government Pilot GTM Playbook",
            "duration_mins": 45,
            "status": "recommended",
            "gap": score["gaps"][0],
        },
        {
            "startup_id": startup_id,
            "title": "Field Validation Evidence Pack",
            "duration_mins": 35,
            "status": "recommended",
            "gap": score["gaps"][-1],
        },
    ]
