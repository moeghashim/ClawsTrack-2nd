from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Any, Dict, List


IMPACT_SCORE = {"low": 1, "medium": 2, "high": 3}


def score_repo(analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not analyses:
        return {"score": 0.0, "confidence": 0.0, "sample_size": 0}

    impacts = [IMPACT_SCORE.get(a.get("impact_level", "low"), 1) for a in analyses]
    confidences = [float(a.get("confidence", 0.0)) for a in analyses]

    base = mean(impacts)
    conf = mean(confidences)
    score = round(base * (0.5 + conf / 2), 3)

    return {
        "score": score,
        "confidence": round(conf, 3),
        "sample_size": len(analyses),
    }


def build_comparison_run(mode: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    by_repo: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in rows:
        by_repo[r["repo_url"]].append(r)

    result_rows = []
    for repo_url, analyses in by_repo.items():
        scored = score_repo(analyses)
        result_rows.append({"repo_url": repo_url, **scored})

    result_rows.sort(key=lambda x: x["score"], reverse=True)

    return {
        "mode": mode,
        "criteriaWeights": {
            "impact": 0.7,
            "confidence": 0.3,
        },
        "repositories": list(by_repo.keys()),
        "results": result_rows,
    }
