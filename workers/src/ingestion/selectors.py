from __future__ import annotations

from typing import Optional


def extract_by_markers(html: str, start_marker: str, end_marker: str) -> Optional[str]:
    start = html.find(start_marker)
    if start == -1:
        return None
    start += len(start_marker)
    end = html.find(end_marker, start)
    if end == -1:
        return None
    return html[start:end]
