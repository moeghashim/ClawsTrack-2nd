from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChangeAnalysisResult(BaseModel):
    change_type: Literal["feature", "fix", "security", "docs", "maintenance", "other"]
    summary: str = Field(min_length=10)
    impact_level: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=10)
    model: str
