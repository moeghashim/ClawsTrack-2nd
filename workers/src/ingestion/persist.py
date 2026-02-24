from __future__ import annotations

from workers.src.common.db import (
    get_conn,
    insert_change_analyses,
    insert_comparison_run,
    insert_snapshot,
    upsert_release_events,
    upsert_repository,
)
from workers.src.common.idempotency import make_dedupe_key
from workers.src.common.repo_parser import parse_owner_repo


def persist_repo_batch(repo_url: str, snapshot: dict, releases: list[dict], analyses: list[dict]) -> dict:
    owner, name = parse_owner_repo(repo_url)
    dedupe = make_dedupe_key(repo_url, snapshot.get("captured_at", ""), snapshot.get("latest_release_tag", ""))

    with get_conn() as conn:
        repo_id = upsert_repository(conn, repo_url, owner, name)
        insert_snapshot(conn, repo_id, snapshot, dedupe)
        release_count = upsert_release_events(conn, repo_id, releases)
        analysis_count = insert_change_analyses(conn, repo_id, analyses)
        conn.commit()

    return {
        "repo_url": repo_url,
        "repository_id": repo_id,
        "releases_written": release_count,
        "analyses_written": analysis_count,
        "dedupe_key": dedupe,
    }


def persist_comparison_run(mode: str, run_payload: dict) -> None:
    with get_conn() as conn:
        insert_comparison_run(
            conn,
            mode=mode,
            criteria_weights=run_payload["criteriaWeights"],
            repositories=run_payload["repositories"],
            results=run_payload["results"],
        )
        conn.commit()
