from fastapi import APIRouter

from services.demo_data import ADMIN_DASHBOARD, COHORTS
from routers.startup import _score_startup, list_startups

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def get_dashboard() -> dict:
    startup_rows = []
    sector_counts: dict[str, int] = {}
    stage_counts: dict[str, int] = {}
    district_counts: dict[str, int] = {}
    pilot_ready = 0

    startups = list_startups()

    for profile in startups:
        score = _score_startup(profile)
        pilot_ready += 1 if score["overall"] >= 68 else 0
        sector = profile.get("sector", "Other")
        stage = profile.get("stage", "Unknown")
        district = profile.get("district", "Unknown")
        sector_counts[sector] = sector_counts.get(sector, 0) + 1
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
        district_counts[district] = district_counts.get(district, 0) + 1
        startup_rows.append([profile.get("name", "Unnamed Startup"), sector, district, str(score["overall"]), score["band"]])

    dynamic = {
        **ADMIN_DASHBOARD,
        "metrics": {
            **ADMIN_DASHBOARD["metrics"],
            "totalStartups": max(ADMIN_DASHBOARD["metrics"]["totalStartups"], len(startups)),
            "pilotReady": max(ADMIN_DASHBOARD["metrics"]["pilotReady"], pilot_ready),
        },
        "pilotQueue": startup_rows + ADMIN_DASHBOARD["pilotQueue"][1:],
    }

    if len(startups) > 1:
        dynamic["sectors"] = [
            {"name": name, "value": count, "color": ["#0f6e56", "#534ab7", "#d85a30", "#2673d9", "#ba7517"][index % 5]}
            for index, (name, count) in enumerate(sector_counts.items())
        ]
        dynamic["stages"] = [{"stage": name, "startups": count} for name, count in stage_counts.items()]
        dynamic["districts"] = [
            {"name": name, "count": count, "growth": "+new"} for name, count in district_counts.items()
        ]

    return dynamic


@router.get("/districts")
def get_districts() -> list[dict]:
    return ADMIN_DASHBOARD["districts"]


@router.get("/pilot-ready")
def get_pilot_ready() -> list[dict]:
    keys = ["startup", "sector", "district", "score", "status"]
    return [dict(zip(keys, row, strict=True)) for row in get_dashboard()["pilotQueue"]]


@router.get("/cohorts")
def get_cohorts() -> list[dict]:
    return COHORTS


@router.get("/startups")
def get_startups() -> list[dict]:
    startups = list_startups()
    result = []
    for profile in startups:
        score = _score_startup(profile)
        result.append({**profile, "score": score["overall"], "band": score["band"]})
    return result
