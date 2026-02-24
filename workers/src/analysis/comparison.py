from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Any, Dict, List


IMPACT_SCORE = {"low": 1, "medium": 2, "high": 3}

MODE_WEIGHTS = {
    "executive": {"impact": 0.6, "confidence": 0.4},
    "technical": {"impact": 0.5, "confidence": 0.2, "feature_bias": 0.3},
    "security": {"impact": 0.5, "confidence": 0.2, "security_bias": 0.3},
    "usecase": {"impact": 0.5, "confidence": 0.3, "feature_bias": 0.2},
}


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _calibrate_confidence(sample_size: int, avg_conf: float) -> float:
    # Penalize tiny samples; stabilize once sample size grows.
    sample_factor = min(1.0, sample_size / 5)
    return round(_clamp(avg_conf * (0.6 + 0.4 * sample_factor)), 3)


def score_repo(analyses: List[Dict[str, Any]], mode: str = "executive") -> Dict[str, Any]:
    if not analyses:
        return {"score": 0.0, "confidence": 0.0, "sample_size": 0}

    weights = MODE_WEIGHTS.get(mode, MODE_WEIGHTS["executive"])

    impacts = [IMPACT_SCORE.get(a.get("impact_level", "low"), 1) for a in analyses]
    avg_conf = mean([float(a.get("confidence", 0.0)) for a in analyses])
    calibrated_conf = _calibrate_confidence(len(analyses), avg_conf)

    impact_component = (mean(impacts) / 3.0) * weights.get("impact", 0.6)
    confidence_component = calibrated_conf * weights.get("confidence", 0.4)

    security_hits = sum(1 for a in analyses if a.get("change_type") == "security")
    feature_hits = sum(1 for a in analyses if a.get("change_type") == "feature")

    security_component = (security_hits / len(analyses)) * weights.get("security_bias", 0.0)
    feature_component = (feature_hits / len(analyses)) * weights.get("feature_bias", 0.0)

    score = round((impact_component + confidence_component + security_component + feature_component) * 10, 3)

    return {
        "score": score,
        "confidence": calibrated_conf,
        "sample_size": len(analyses),
        "security_ratio": round(security_hits / len(analyses), 3),
        "feature_ratio": round(feature_hits / len(analyses), 3),
    }


def build_comparison_run(mode: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    by_repo: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in rows:
        by_repo[r["repo_url"]].append(r)

    result_rows = []
    for repo_url, analyses in by_repo.items():
        scored = score_repo(analyses, mode=mode)
        result_rows.append({"repo_url": repo_url, **scored})

    result_rows.sort(key=lambda x: x["score"], reverse=True)
    for i, row in enumerate(result_rows, start=1):
        row["rank"] = i

    return {
        "mode": mode,
        "criteriaWeights": MODE_WEIGHTS.get(mode, MODE_WEIGHTS["executive"]),
        "repositories": list(by_repo.keys()),
        "results": result_rows,
    }
