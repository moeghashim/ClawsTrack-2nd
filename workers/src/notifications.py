from __future__ import annotations

from typing import Dict, List


def build_rank_shift_notifications(shifts: List[Dict]) -> List[Dict]:
    notifications = []
    for s in shifts:
        direction = "up" if s["delta"] > 0 else "down"
        notifications.append(
            {
                "event_type": "ranking_shift",
                "repo_url": s["repo_url"],
                "message": f"Ranking shift: {s['repo_url']} moved {direction} from #{s['previous_rank']} to #{s['current_rank']}",
                "severity": "high" if abs(s["delta"]) >= 2 else "medium",
            }
        )
    return notifications
