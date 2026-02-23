from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from workers.src.common.models import NormalizedChangeEvent, ReleaseEvent


def normalize_releases(events: List[ReleaseEvent]) -> List[NormalizedChangeEvent]:
    normalized: List[NormalizedChangeEvent] = []
    now = datetime.now(timezone.utc)

    for ev in events:
        normalized.append(
            NormalizedChangeEvent(
                repo_url=ev.repo_url,
                event_type="release",
                title=ev.title,
                body=f"Release {ev.version or 'unknown'}",
                source_url=ev.source_url,
                detected_at=ev.published_at or now,
            )
        )

    return normalized
