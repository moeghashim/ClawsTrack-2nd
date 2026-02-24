from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any, Dict, Iterable

import psycopg

from workers.src.common.config import settings


@contextmanager
def get_conn():
    if not settings.database_url:
        raise ValueError("DATABASE_URL is required for PostgreSQL persistence")
    with psycopg.connect(settings.database_url) as conn:
        yield conn


def _to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def upsert_repository(conn: psycopg.Connection, repo_url: str, owner: str, name: str) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into repositories (url, owner, name)
            values (%s, %s, %s)
            on conflict (url)
            do update set owner = excluded.owner, name = excluded.name, updated_at = now()
            returning id::text
            """,
            (repo_url, owner, name),
        )
        return cur.fetchone()[0]


def insert_snapshot(
    conn: psycopg.Connection,
    repository_id: str,
    snapshot: Dict[str, Any],
    dedupe_key: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into repository_snapshots
            (repository_id, captured_at, default_branch, stars, forks, open_issues, latest_release_tag, raw_payload_ref)
            values (%s, %s, %s, %s, %s, %s, %s, %s)
            on conflict do nothing
            """,
            (
                repository_id,
                snapshot.get("captured_at"),
                snapshot.get("default_branch"),
                snapshot.get("stars"),
                snapshot.get("forks"),
                snapshot.get("open_issues"),
                snapshot.get("latest_release_tag"),
                f"{snapshot.get('raw_payload_ref')}|{dedupe_key}",
            ),
        )


def upsert_release_events(
    conn: psycopg.Connection,
    repository_id: str,
    releases: Iterable[Dict[str, Any]],
) -> int:
    inserted = 0
    with conn.cursor() as cur:
        for rel in releases:
            cur.execute(
                """
                insert into release_events
                (repository_id, version, published_at, title, notes_ref, source_url, is_security_relevant)
                values (%s, %s, %s, %s, %s, %s, %s)
                on conflict do nothing
                """,
                (
                    repository_id,
                    rel.get("version"),
                    rel.get("published_at"),
                    rel.get("title"),
                    rel.get("notes_url"),
                    rel.get("source_url"),
                    rel.get("is_security_relevant", False),
                ),
            )
            inserted += cur.rowcount
    return inserted


def insert_normalized_events(
    conn: psycopg.Connection,
    repository_id: str,
    events: Iterable[Dict[str, Any]],
) -> int:
    inserted = 0
    with conn.cursor() as cur:
        for ev in events:
            cur.execute(
                """
                insert into change_analyses
                (repository_id, change_type, summary, impact_level, confidence, rationale, model)
                values (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    repository_id,
                    "other",
                    ev.get("title", "Change detected"),
                    "low",
                    0.45,
                    f"Ingestion normalized event from source {ev.get('source_url')}",
                    "ingestion-normalizer-v0",
                ),
            )
            inserted += cur.rowcount
    return inserted
