from __future__ import annotations

from workers.src.common.config import settings
from workers.src.common.store import JsonlStore
from workers.src.ingestion.normalize import normalize_releases
from workers.src.ingestion.scrapling_github import GitHubScraplingIngestor


def run_ingestion() -> None:
    ingestor = GitHubScraplingIngestor()
    store = JsonlStore()
    print(f"Starting ingestion for {len(settings.repo_urls)} repositories")

    for repo_url in settings.repo_urls:
        snapshot = ingestor.fetch_snapshot(repo_url)
        releases = ingestor.fetch_releases(repo_url)
        normalized = normalize_releases(releases)

        store.append_model("repository_snapshots", snapshot)
        for rel in releases:
            store.append_model("release_events", rel)
        for ev in normalized:
            store.append_model("normalized_events", ev)

        print(
            "repo=%s snapshot_at=%s releases_detected=%d normalized_events=%d"
            % (repo_url, snapshot.captured_at.isoformat(), len(releases), len(normalized))
        )


if __name__ == "__main__":
    run_ingestion()
