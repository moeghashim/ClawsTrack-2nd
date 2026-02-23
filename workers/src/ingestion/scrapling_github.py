from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List

from scrapling import Fetcher

from workers.src.common.models import ReleaseEvent, RepositorySnapshot
from workers.src.common.repo_parser import parse_owner_repo

RELEASE_CARD_RE = re.compile(
    r'href="(?P<href>/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+)/releases/tag/(?P<tag>[^"]+))"',
    re.IGNORECASE,
)
ISO_TS_RE = re.compile(r"datetime=\"(?P<dt>[^\"]+)\"")
META_COUNT_RE = re.compile(r"([0-9][0-9,]*)")


class GitHubScraplingIngestor:
    """Scrapling-based GitHub ingestion for snapshots + releases.

    Note: GitHub markup can change. This parser intentionally keeps resilient fallbacks.
    """

    def __init__(self) -> None:
        self.fetcher = Fetcher()

    def fetch_snapshot(self, repo_url: str) -> RepositorySnapshot:
        response = self.fetcher.get(repo_url)
        html = getattr(response, "text", "") or ""

        stars = self._extract_social_count(html, "stargazers")
        forks = self._extract_social_count(html, "forks")

        owner, name = parse_owner_repo(repo_url)
        return RepositorySnapshot(
            repo_url=repo_url,
            captured_at=datetime.now(timezone.utc),
            default_branch=self._extract_default_branch(html),
            stars=stars,
            forks=forks,
            open_issues=None,
            latest_release_tag=self._extract_latest_release_tag(html),
            raw_payload_ref=f"inline:{len(html)}chars:{owner}/{name}",
        )

    def fetch_releases(self, repo_url: str) -> List[ReleaseEvent]:
        owner, name = parse_owner_repo(repo_url)
        releases_url = repo_url.rstrip("/") + "/releases"
        response = self.fetcher.get(releases_url)
        html = getattr(response, "text", "") or ""

        events: List[ReleaseEvent] = []
        seen = set()
        for m in RELEASE_CARD_RE.finditer(html):
            tag = m.group("tag")
            href = m.group("href")
            source_url = f"https://github.com{href}"
            if source_url in seen:
                continue
            seen.add(source_url)

            event = ReleaseEvent(
                repo_url=repo_url,
                version=tag,
                published_at=self._extract_first_datetime(html),
                title=f"Release {tag}",
                notes_url=source_url,
                source_url=source_url,
                is_security_relevant=("security" in tag.lower()),
            )
            events.append(event)

        # keep this bounded for runtime and noise
        return events[:10]

    def _extract_latest_release_tag(self, html: str) -> str | None:
        m = RELEASE_CARD_RE.search(html)
        return m.group("tag") if m else None

    def _extract_first_datetime(self, html: str) -> datetime | None:
        m = ISO_TS_RE.search(html)
        if not m:
            return None
        raw = m.group("dt").replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(raw)
        except ValueError:
            return None

    def _extract_social_count(self, html: str, keyword: str) -> int | None:
        idx = html.find(keyword)
        if idx == -1:
            return None
        window = html[max(0, idx - 200): idx + 200]
        m = META_COUNT_RE.search(window)
        if not m:
            return None
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            return None

    def _extract_default_branch(self, html: str) -> str | None:
        for branch in ("main", "master", "dev"):
            if f"/tree/{branch}" in html:
                return branch
        return None
