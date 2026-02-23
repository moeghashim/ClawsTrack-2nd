from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from scrapling import Fetcher

from workers.src.common.config import GITHUB_REPO_URL_RE
from workers.src.common.models import ReleaseEvent, RepositorySnapshot


class GitHubScraplingIngestor:
    """
    Scrapling-based GitHub ingestion skeleton.

    Phase 2 target:
    - fetch releases page
    - fetch repo metadata page
    - normalize to internal models
    """

    def __init__(self) -> None:
        self.fetcher = Fetcher()

    def parse_repo(self, repo_url: str) -> Dict[str, str]:
        match = GITHUB_REPO_URL_RE.match(repo_url)
        if not match:
            raise ValueError(f"Invalid GitHub URL: {repo_url}")
        return {"owner": match.group("owner"), "name": match.group("repo")}

    def fetch_snapshot(self, repo_url: str) -> RepositorySnapshot:
        # NOTE: Keep this as Scrapling-driven page extraction by requirement.
        response = self.fetcher.get(repo_url)
        html = getattr(response, "text", "") or ""

        # TODO: Replace heuristic parsing with robust selectors once UI parsing is finalized.
        return RepositorySnapshot(
            repo_url=repo_url,
            captured_at=datetime.now(timezone.utc),
            raw_payload_ref=f"inline:{len(html)}chars",
        )

    def fetch_releases(self, repo_url: str) -> List[ReleaseEvent]:
        releases_url = repo_url.rstrip("/") + "/releases"
        response = self.fetcher.get(releases_url)
        _html = getattr(response, "text", "") or ""

        # TODO: Parse release cards/tags from releases page with Scrapling selectors.
        # Skeleton returns empty until parser rules are implemented.
        return []
