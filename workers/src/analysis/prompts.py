from __future__ import annotations

ANALYZE_CHANGE_SYSTEM = """You analyze open-source repository updates.
Return strict JSON only.
Focus on explainability and practical impact.
"""


def build_change_user_prompt(event_title: str, event_body: str, source_url: str) -> str:
    return f"""
Event title: {event_title}
Event body: {event_body}
Source URL: {source_url}

Classify this change into one of:
- feature
- fix
- security
- docs
- maintenance
- other

Return JSON object with keys exactly:
- change_type
- summary
- impact_level (low|medium|high)
- confidence (0..1)
- rationale
- model
""".strip()
