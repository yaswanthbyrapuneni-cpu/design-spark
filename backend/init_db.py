from db import get_connection
from services.demo_data import DEMO_STARTUPS, OPPORTUNITIES, STARTUP


SCHEMA_SQL = """
create table if not exists startups (
  id text primary key,
  name text not null,
  district text not null default '',
  sector text not null default '',
  stage text not null default '',
  dpiit text not null default '',
  team integer not null default 0,
  description text not null default '',
  users text not null default '',
  pilot text not null default '',
  mentorship_need text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists startup_scores (
  id bigserial primary key,
  startup_id text not null references startups(id) on delete cascade,
  overall integer not null,
  band text not null,
  mentor_domain text not null,
  scores jsonb not null,
  strengths jsonb not null,
  gaps jsonb not null,
  next_steps jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists opportunities (
  id text primary key,
  title text not null,
  type text not null,
  sponsor text not null,
  sector_tags jsonb not null default '[]'::jsonb,
  stage_tags jsonb not null default '[]'::jsonb,
  deadline text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists opportunity_matches (
  id bigserial primary key,
  startup_id text not null references startups(id) on delete cascade,
  opportunity_id text not null references opportunities(id) on delete cascade,
  match integer not null,
  reasons jsonb not null,
  matched_at timestamptz not null default now(),
  unique(startup_id, opportunity_id)
);
"""


def opportunity_id(title: str) -> str:
    return (
        title.lower()
        .replace(" - ", "-")
        .replace(" ", "-")
        .replace(".", "")
        .replace("/", "-")
    )


def main() -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(SCHEMA_SQL)
            for s in DEMO_STARTUPS:
                cursor.execute(
                    """
                    insert into startups (
                      id, name, district, sector, stage, dpiit, team, description, users, pilot, mentorship_need
                    )
                    values (
                      %(id)s, %(name)s, %(district)s, %(sector)s, %(stage)s, %(dpiit)s, %(team)s,
                      %(description)s, %(users)s, %(pilot)s, %(mentorshipNeed)s
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
                    """,
                    s,
                )
            for opportunity in OPPORTUNITIES:
                cursor.execute(
                    """
                    insert into opportunities (
                      id, title, type, sponsor, sector_tags, stage_tags, deadline, description, is_active
                    )
                    values (
                      %(id)s, %(title)s, %(type)s, %(sponsor)s, %(sector_tags)s::jsonb,
                      %(stage_tags)s::jsonb, %(deadline)s, %(description)s, true
                    )
                    on conflict (id) do update set
                      title = excluded.title,
                      type = excluded.type,
                      sponsor = excluded.sponsor,
                      sector_tags = excluded.sector_tags,
                      stage_tags = excluded.stage_tags,
                      deadline = excluded.deadline,
                      description = excluded.description,
                      is_active = true
                    """,
                    {
                        "id": opportunity_id(opportunity["title"]),
                        "title": opportunity["title"],
                        "type": opportunity["type"],
                        "sponsor": opportunity["sponsor"],
                        "sector_tags": '["AgriTech"]'
                        if opportunity["type"] in {"Pilot", "Mentor"}
                        else '["All"]'
                        if opportunity["type"] == "Grant"
                        else '["AI/ML", "DeepTech"]',
                        "stage_tags": '["MVP", "Pilot", "Revenue"]'
                        if opportunity["type"] in {"Pilot", "Program"}
                        else '["All"]',
                        "deadline": opportunity["deadline"],
                        "description": "Seeded opportunity for AP InnovationOS prototype.",
                    },
                )
        connection.commit()

    print("Supabase schema initialized and demo data seeded.")


if __name__ == "__main__":
    main()
