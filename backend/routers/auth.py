from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])

DEMO_USERS = {
    "startup": {
        "email": "startup@demo.com",
        "name": "Aarav Reddy",
        "role": "startup",
        "defaultRoute": "/startup/dashboard",
    },
    "mentor": {
        "email": "mentor@demo.com",
        "name": "Dr. Venkat Rao",
        "role": "mentor",
        "defaultRoute": "/mentor/dashboard",
    },
    "admin": {
        "email": "admin@demo.com",
        "name": "APIS Program Lead",
        "role": "admin",
        "defaultRoute": "/admin/dashboard",
    },
}


@router.post("/demo-login")
def demo_login(payload: dict) -> dict:
    role = str(payload.get("role", "startup")).lower()
    return DEMO_USERS.get(role, DEMO_USERS["startup"])


@router.get("/demo-users")
def demo_users() -> list[dict]:
    return list(DEMO_USERS.values())
