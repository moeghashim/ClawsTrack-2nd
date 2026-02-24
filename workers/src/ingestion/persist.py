from __future__ import annotations

from workers.src.common.db import (
    get_conn,
    insert_normalized_events,
    insert_snapshot,
    upsert_release_events,
    upsert_repository,
)
from workers.src.common.idempotency import make_dedupe_key
from workers.src.common.repo_parser import parse_owner_repo


def persist_repo_batch(repo_url: str, snapshot: dict, releases: list[dict], normalized: list[dict]) -> dict:
    owner, name = parse_owner_repo(repo_url)
    dedupe = make_dedupe_key(repo_url, snapshot.get("captured_at", ""), snapshot.get("latest_release_tag", ""))

    with get_conn() as conn:
        repo_id = upsert_repository(conn, repo_url, owner, name)
        insert_snapshot(conn, repo_id, snapshot, dedupe)
        release_count = upsert_release_events(conn, repo_id, releases)
        normalized_count = insert_normalized_events(conn, repo_id, normalized)
        conn.commit()

    return {
        "repo_url": repo_url,
        "repository_id": repo_id,
        "releases_written": release_count,
        "normalized_written": normalized_count,
        "dedupe_key": dedupe,
    }
