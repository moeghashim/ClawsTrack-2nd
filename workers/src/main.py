from __future__ import annotations

from workers.src.common.config import settings
from workers.src.ingestion.scrapling_github import GitHubScraplingIngestor


def run_ingestion() -> None:
    ingestor = GitHubScraplingIngestor()
    print(f"Starting ingestion for {len(settings.repo_urls)} repositories")

    for repo_url in settings.repo_urls:
        snapshot = ingestor.fetch_snapshot(repo_url)
        releases = ingestor.fetch_releases(repo_url)
        print(
            f"repo={repo_url} snapshot_at={snapshot.captured_at.isoformat()} releases_detected={len(releases)}"
        )


if __name__ == "__main__":
    run_ingestion()
