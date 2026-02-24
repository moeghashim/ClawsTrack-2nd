from __future__ import annotations

import json
from typing import Optional

import httpx

from workers.src.analysis.prompts import ANALYZE_CHANGE_SYSTEM, build_change_user_prompt
from workers.src.analysis.schema import ChangeAnalysisResult


class OpenAIAnalyzer:
    def __init__(self, api_key: str, model: str = "gpt-4.1-mini") -> None:
        self.api_key = api_key
        self.model = model

    def analyze_change(self, title: str, body: str, source_url: str) -> ChangeAnalysisResult:
        if not self.api_key:
            return self._fallback(title, source_url)

        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": ANALYZE_CHANGE_SYSTEM},
                {
                    "role": "user",
                    "content": build_change_user_prompt(title, body, source_url),
                },
            ],
            "temperature": 0.2,
        }

        with httpx.Client(timeout=45.0) as client:
            resp = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        parsed["model"] = parsed.get("model") or self.model
        return ChangeAnalysisResult.model_validate(parsed)

    def _fallback(self, title: str, source_url: str) -> ChangeAnalysisResult:
        lower = title.lower()
        change_type = "security" if "security" in lower else "other"
        return ChangeAnalysisResult(
            change_type=change_type,
            summary=f"Detected update: {title}",
            impact_level="medium" if change_type == "security" else "low",
            confidence=0.35,
            rationale=f"Fallback heuristic (no API key). Source: {source_url}",
            model="fallback-heuristic-v1",
        )
