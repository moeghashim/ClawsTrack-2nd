from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, HttpUrl


class RepositoryRef(BaseModel):
    url: HttpUrl
    owner: str
    name: str


class ReleaseEvent(BaseModel):
    repo_url: HttpUrl
    version: Optional[str] = None
    published_at: Optional[datetime] = None
    title: str
    notes_url: Optional[HttpUrl] = None
    source_url: HttpUrl
    is_security_relevant: bool = False


class RepositorySnapshot(BaseModel):
    repo_url: HttpUrl
    captured_at: datetime
    default_branch: Optional[str] = None
    stars: Optional[int] = None
    forks: Optional[int] = None
    open_issues: Optional[int] = None
    latest_release_tag: Optional[str] = None
    raw_payload_ref: Optional[str] = None


class NormalizedChangeEvent(BaseModel):
    repo_url: HttpUrl
    event_type: Literal["release", "commit", "changelog", "security", "other"]
    title: str
    body: str
    source_url: HttpUrl
    detected_at: datetime
