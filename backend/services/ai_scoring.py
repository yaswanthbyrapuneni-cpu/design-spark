"""
AI scoring service — Gemini primary, Claude fallback, deterministic fallback.
Works out of the box without API keys; add keys to .env to enable real AI.
"""

import json
import os

import httpx

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)
CLAUDE_URL = "https://api.anthropic.com/v1/messages"


SCORE_SCHEMA = {
    "overall": 0,
    "innovation": 0,
    "market": 0,
    "technology": 0,
    "pilot": 0,
    "funding": 0,
    "pilot_band": "",
    "strengths": [],
    "gaps": [],
    "next_steps": [],
    "mentor_domain": "",
}

SCORE_PROMPT = """You are an AI readiness assessor for the Andhra Pradesh Innovation Society (APIS).
Analyze this startup and return ONLY valid JSON, no markdown, no explanation.

Startup profile: {profile}

Return exactly this JSON structure (integer scores 0-100):
{{
  "overall": <int>,
  "innovation": <int>,
  "market": <int>,
  "technology": <int>,
  "pilot": <int>,
  "funding": <int>,
  "pilot_band": "<Not Ready|Emerging|Near Ready|Ready>",
  "strengths": ["<str>", "<str>", "<str>"],
  "gaps": ["<str>", "<str>", "<str>"],
  "next_steps": ["<str>", "<str>", "<str>"],
  "mentor_domain": "<str>"
}}"""

CHAT_SYSTEM = """You are the AI Startup Twin for {name}, an intelligent advisor with deep knowledge of this startup.

Startup profile: {profile}
Latest readiness score: {score}
Matched opportunities: {matches}

Answer as a knowledgeable advisor who knows this startup intimately.
Be specific, actionable, and grounded in their actual data.
Keep responses concise (3-5 sentences max)."""


def _parse_json_from_text(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    raise ValueError("No JSON found in response")


def _call_gemini(prompt: str) -> str:
    response = httpx.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]


def _call_claude(system: str, user: str) -> str:
    response = httpx.post(
        CLAUDE_URL,
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["content"][0]["text"]


def _deterministic_score(profile: dict) -> dict:
    """Heuristic scoring — used when no API keys are configured."""
    stage = str(profile.get("stage", "")).lower()
    sector = str(profile.get("sector", "")).lower()
    pilot_text = str(profile.get("pilot", "")).lower()
    team = int(profile.get("team") or 0)

    def has_text(key: str) -> bool:
        return bool(str(profile.get(key, "")).strip())

    innovation = 56
    market = 50
    technology = 52
    pilot_score = 45
    funding = 48

    if has_text("description"):
        innovation += 12
        technology += 8
    if any(k in sector for k in ["agri", "health", "gov", "ed", "deep", "ai"]):
        innovation += 10
        market += 8
    if stage in {"prototype", "mvp", "pilot", "revenue"}:
        technology += 16
    if stage in {"mvp", "pilot", "revenue"}:
        pilot_score += 16
    if stage in {"pilot", "revenue"}:
        market += 10
        funding += 8
    if has_text("users"):
        market += 12
    if has_text("dpiit"):
        funding += 12
        pilot_score += 8
    if "yes" in pilot_text or "seeking" in pilot_text:
        pilot_score += 16
    if team >= 3:
        technology += 6
        funding += 4
    if has_text("mentorshipNeed"):
        funding += 4
        market += 4

    innovation = min(96, innovation)
    market = min(94, market)
    technology = min(96, technology)
    pilot_score = min(96, pilot_score)
    funding = min(92, funding)
    overall = round((innovation + market + technology + pilot_score + funding) / 5)

    band = (
        "Ready" if overall >= 80
        else "Near Ready" if overall >= 68
        else "Emerging" if overall >= 55
        else "Not Ready"
    )

    strengths, gaps, next_steps = [], [], []

    if has_text("description"):
        strengths.append("Clear startup problem and solution narrative")
    else:
        gaps.append("Problem and solution narrative needs detail")
        next_steps.append("Write a sharper problem, user, and solution note")
    if has_text("users"):
        strengths.append("Defined target user segment")
    else:
        gaps.append("Target users are not specific enough")
        next_steps.append("Identify priority users and district context")
    if stage in {"mvp", "pilot", "revenue"}:
        strengths.append("Product maturity is strong enough for pilot conversation")
    else:
        gaps.append("Prototype maturity needs more evidence")
        next_steps.append("Prepare MVP screenshots and field workflow")
    if has_text("dpiit"):
        strengths.append("DPIIT recognition improves grant and pilot eligibility")
    else:
        gaps.append("DPIIT recognition is missing")
        next_steps.append("Complete DPIIT recognition or add eligibility proof")
    if "yes" in pilot_text or "seeking" in pilot_text:
        strengths.append("Pilot intent is clearly aligned")
        next_steps.append("Prepare a district-level pilot validation plan")
    else:
        gaps.append("Pilot intent needs to be clearer")
        next_steps.append("Define the pilot ask, geography, users, and success metrics")

    if not gaps:
        gaps.append("Funding and scale narrative can be sharper for public-sector review")
    while len(next_steps) < 3:
        next_steps.append("Package evidence for RTIH/APIS review")

    return {
        "overall": overall,
        "innovation": innovation,
        "market": market,
        "technology": technology,
        "pilot": pilot_score,
        "funding": funding,
        "pilot_band": band,
        "strengths": strengths[:3],
        "gaps": gaps[:3],
        "next_steps": next_steps[:3],
        "mentor_domain": f"{profile.get('sector', 'Startup')} and government pilots",
        "source": "deterministic",
    }


PITCH_PROMPT = """You are a startup pitch coach for Andhra Pradesh Innovation Society (APIS) and RTIH.
Generate a compelling 60-second elevator pitch for this startup targeting government evaluators.

Startup profile: {profile}
Readiness: overall {overall}/100, band: {band}

Return ONLY valid JSON (no markdown):{{
  "hook": "<powerful opening sentence, 15-20 words, mention AP or the district>",
  "problem": "<specific problem in AP ecosystem, 1-2 sentences, 30-40 words>",
  "solution": "<what the startup does and how, 1-2 sentences, 30-40 words>",
  "traction": "<MVP/pilot/team evidence, 1 sentence, 20-30 words>",
  "ask": "<specific ask from APIS/RTIH, 1 sentence, 15-20 words>",
  "full_pitch": "<complete 60-second pitch as one flowing paragraph, 100-130 words>"
}}"""

MENTOR_MATCH_PROMPT = """You are a mentor-startup matching system for RTIH/APIS Innovation OS.
Match the best mentors for this startup based on their profile and readiness gaps.

Startup: {profile}
Top gaps: {gaps}

Available mentors: {mentors}

Return ONLY a valid JSON array of top 3 matches (no markdown):
[{{"id": "<mentor id>", "match_score": <int 65-96>, "match_reasons": ["<reason 1>", "<reason 2>"]}}]
Order by match_score descending."""


def _deterministic_pitch(profile: dict, score: dict) -> dict:
    name = profile.get("name", "Our Startup")
    sector = profile.get("sector", "Technology")
    stage = profile.get("stage", "MVP")
    district = profile.get("district", "Andhra Pradesh")
    description = str(profile.get("description", ""))
    users = str(profile.get("users", "communities in Andhra Pradesh"))
    pilot = str(profile.get("pilot", ""))
    team = int(profile.get("team") or 0)
    overall = score.get("overall", 70)
    band = score.get("pilot_band", score.get("band", "Near Ready"))

    hook = f"In Andhra Pradesh's {sector} ecosystem, {name} is solving a problem that affects millions — and we are {stage.lower()} ready to pilot."
    problem = f"{description[:100]}..." if description else f"AP's {sector.lower()} sector struggles with fragmented access and limited digital infrastructure for scale."
    solution = f"{name} delivers {sector.lower()} technology designed for AP's specific user context and government workflows."
    traction = f"We are at {stage} stage with a team of {team}, serving {users[:80]}."
    wants_pilot = "seeking" in pilot.lower() or ("yes" in pilot.lower() and "no" not in pilot.lower()[:3])
    ask = "We are actively seeking a district-level pilot partnership with RTIH/APIS to validate at scale." if wants_pilot else "We are looking to engage with APIS ecosystem mentors and explore pilot opportunities."
    full_pitch = f"{hook} {problem} {solution} {traction} Our readiness score is {overall}/100 ({band}) on the AP InnovationOS platform. {ask}"

    return {"hook": hook, "problem": problem, "solution": solution, "traction": traction, "ask": ask, "full_pitch": full_pitch, "source": "deterministic"}


def _heuristic_mentor_match(profile: dict, mentors: list) -> list:
    sector = str(profile.get("sector", "")).lower()
    stage = str(profile.get("stage", "")).lower()
    mentorship_need = str(profile.get("mentorshipNeed", "")).lower()
    results = []
    for mentor in mentors:
        score = 50
        reasons: list[str] = []
        mentor_sectors = [s.lower() for s in mentor.get("sectors", [])]
        mentor_stages = [s.lower() for s in mentor.get("stages", [])]
        if sector in mentor_sectors or "all" in mentor_sectors:
            score += 28
            reasons.append("Sector expertise match")
        if stage in mentor_stages:
            score += 15
            reasons.append("Stage experience aligned")
        for expertise in mentor.get("expertise", []):
            if any(word in mentorship_need for word in expertise.lower().split()):
                score += 12
                reasons.append("Mentorship need aligned")
                break
        results.append({**mentor, "match_score": min(96, score), "match_reasons": reasons or ["General ecosystem expertise"]})
    return sorted(results, key=lambda m: m["match_score"], reverse=True)[:3]


def generate_pitch(profile: dict, score: dict) -> dict:
    """Generate a structured 60-second pitch using Gemini → deterministic fallback."""
    overall = score.get("overall", 70)
    band = score.get("pilot_band", score.get("band", "Emerging"))
    prompt = PITCH_PROMPT.format(profile=json.dumps(profile, ensure_ascii=False), overall=overall, band=band)

    if GEMINI_API_KEY:
        try:
            raw = _call_gemini(prompt)
            result = _parse_json_from_text(raw)
            result["source"] = "gemini"
            return result
        except Exception:
            pass

    if ANTHROPIC_API_KEY:
        try:
            raw = _call_claude(system="You are an AP startup pitch coach. Return only valid JSON.", user=prompt)
            result = _parse_json_from_text(raw)
            result["source"] = "claude"
            return result
        except Exception:
            pass

    return _deterministic_pitch(profile, score)


def match_mentor(profile: dict, score: dict, mentors: list) -> list:
    """Match top mentors for a startup using Gemini → heuristic fallback."""
    gaps = score.get("gaps", score.get("next_steps", []))
    prompt = MENTOR_MATCH_PROMPT.format(
        profile=json.dumps(profile, ensure_ascii=False),
        gaps=json.dumps(gaps[:3], ensure_ascii=False),
        mentors=json.dumps([{"id": m["id"], "name": m["name"], "domain": m["domain"], "expertise": m["expertise"], "sectors": m["sectors"]} for m in mentors], ensure_ascii=False),
    )

    if GEMINI_API_KEY:
        try:
            raw = _call_gemini(prompt)
            match_list = json.loads(raw.strip().lstrip("```json").rstrip("```").strip())
            mentor_map = {m["id"]: m for m in mentors}
            result = []
            for item in match_list[:3]:
                mentor = mentor_map.get(item["id"])
                if mentor:
                    result.append({**mentor, "match_score": item["match_score"], "match_reasons": item["match_reasons"]})
            if result:
                return result
        except Exception:
            pass

    if ANTHROPIC_API_KEY:
        try:
            raw = _call_claude(system="You are a mentor-startup matcher. Return only valid JSON array.", user=prompt)
            match_list = _parse_json_from_text(raw)
            mentor_map = {m["id"]: m for m in mentors}
            result = []
            for item in match_list[:3]:
                mentor = mentor_map.get(item["id"])
                if mentor:
                    result.append({**mentor, "match_score": item["match_score"], "match_reasons": item["match_reasons"]})
            if result:
                return result
        except Exception:
            pass

    return _heuristic_mentor_match(profile, mentors)


def score_startup(profile: dict) -> dict:
    """Score a startup using Gemini → Claude → deterministic fallback."""
    prompt = SCORE_PROMPT.format(profile=json.dumps(profile, ensure_ascii=False))

    if GEMINI_API_KEY:
        try:
            raw = _call_gemini(prompt)
            result = _parse_json_from_text(raw)
            result["source"] = "gemini"
            result.setdefault("pilot_band", result.get("band", "Emerging"))
            return result
        except Exception:
            pass

    if ANTHROPIC_API_KEY:
        try:
            raw = _call_claude(
                system="You are an AP startup readiness assessor. Return only valid JSON.",
                user=prompt,
            )
            result = _parse_json_from_text(raw)
            result["source"] = "claude"
            result.setdefault("pilot_band", result.get("band", "Emerging"))
            return result
        except Exception:
            pass

    return _deterministic_score(profile)


def chat_with_twin(
    startup_name: str,
    profile: dict,
    score: dict,
    matches: list,
    message: str,
    history: list[dict],
) -> str:
    """Single-turn AI Twin response using Gemini → Claude → canned fallback."""
    system = CHAT_SYSTEM.format(
        name=startup_name,
        profile=json.dumps(profile, ensure_ascii=False),
        score=json.dumps(score, ensure_ascii=False),
        matches=json.dumps(matches[:3], ensure_ascii=False),
    )
    messages = history[-6:] + [{"role": "user", "content": message}]

    if GEMINI_API_KEY:
        try:
            parts = [{"text": system + "\n\n"}]
            for msg in messages:
                role_prefix = "User: " if msg["role"] == "user" else "Assistant: "
                parts.append({"text": role_prefix + msg["content"] + "\n"})
            raw = _call_gemini("".join(p["text"] for p in parts))
            return raw.strip()
        except Exception:
            pass

    if ANTHROPIC_API_KEY:
        try:
            return _call_claude(system=system, user=message).strip()
        except Exception:
            pass

    # Canned contextual fallback
    msg_lower = message.lower()
    if any(k in msg_lower for k in ["gap", "weakness", "missing", "improve"]):
        gaps = score.get("gaps", ["pilot validation evidence"])
        return (
            f"Your top gap is: {gaps[0]}. "
            "Focus on this before the next mentor review. "
            "The learning path on your dashboard has targeted modules to help."
        )
    if any(k in msg_lower for k in ["opportunity", "pilot", "grant", "apply"]):
        top = matches[0] if matches else {}
        return (
            f"Your best match is '{top.get('title', 'AP Smart Agriculture Pilot 2026')}' "
            f"at {top.get('match', 96)}%. Prepare your pilot validation evidence and "
            "GTM note before applying."
        )
    if any(k in msg_lower for k in ["score", "readiness", "band", "overall"]):
        return (
            f"Your readiness score is {score.get('overall', 74)}/100 — {score.get('pilot_band', 'Near Ready')}. "
            f"Strengths: {', '.join(score.get('strengths', [])[:2])}. "
            "Check your full report for the improvement roadmap."
        )
    return (
        f"Based on {startup_name}'s profile, I recommend focusing on your top next step: "
        f"{score.get('next_steps', ['Prepare pilot documentation'])[0]}. "
        "Would you like details on opportunities or the learning path?"
    )
