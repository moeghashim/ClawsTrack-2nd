from __future__ import annotations

from workers.src.common.config import settings
from workers.src.common.store import JsonlStore
from workers.src.ingestion.normalize import normalize_releases
from workers.src.ingestion.persist import persist_repo_batch
from workers.src.ingestion.scrapling_github import GitHubScraplingIngestor


def run_ingestion() -> None:
    ingestor = GitHubScraplingIngestor()
    file_store = JsonlStore()
    use_db = bool(settings.database_url)

    print(f"Starting ingestion for {len(settings.repo_urls)} repositories (db_persistence={use_db})")

    for repo_url in settings.repo_urls:
        snapshot = ingestor.fetch_snapshot(repo_url)
        releases = ingestor.fetch_releases(repo_url)
        normalized = normalize_releases(releases)

        # Always keep local artifact trail for debugging/audits.
        file_store.append_model("repository_snapshots", snapshot)
        for rel in releases:
            file_store.append_model("release_events", rel)
        for ev in normalized:
            file_store.append_model("normalized_events", ev)

        if use_db:
            result = persist_repo_batch(
                repo_url,
                snapshot.model_dump(mode="json"),
                [r.model_dump(mode="json") for r in releases],
                [e.model_dump(mode="json") for e in normalized],
            )
            print(
                "repo=%s releases_detected=%d normalized_events=%d db_releases=%d db_normalized=%d"
                % (
                    repo_url,
                    len(releases),
                    len(normalized),
                    result["releases_written"],
                    result["normalized_written"],
                )
            )
        else:
            print(
                "repo=%s snapshot_at=%s releases_detected=%d normalized_events=%d"
                % (repo_url, snapshot.captured_at.isoformat(), len(releases), len(normalized))
            )


if __name__ == "__main__":
    run_ingestion()
