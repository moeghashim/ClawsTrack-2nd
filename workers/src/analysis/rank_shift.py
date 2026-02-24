from __future__ import annotations

from typing import Any, Dict, List


def detect_rank_shifts(previous_results: List[Dict[str, Any]], current_results: List[Dict[str, Any]], min_shift: int = 1) -> List[Dict[str, Any]]:
    prev_rank = {r["repo_url"]: int(r.get("rank", 0)) for r in previous_results}
    shifts: List[Dict[str, Any]] = []

    for row in current_results:
        repo = row["repo_url"]
        now = int(row.get("rank", 0))
        before = prev_rank.get(repo)
        if before is None or now == 0:
            continue
        delta = before - now
        if abs(delta) >= min_shift:
            shifts.append(
                {
                    "repo_url": repo,
                    "previous_rank": before,
                    "current_rank": now,
                    "delta": delta,
                }
            )

    return shifts
