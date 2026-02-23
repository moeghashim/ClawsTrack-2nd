from __future__ import annotations

from functools import cached_property
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from workers.src.common.repo_parser import GITHUB_REPO_URL_RE


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    monitored_repos: str = Field(alias="MONITORED_REPOS")
    openai_api_key: str = Field(alias="OPENAI_API_KEY", default="")
    database_url: str = Field(alias="DATABASE_URL", default="")
    log_level: str = Field(alias="LOG_LEVEL", default="info")

    @field_validator("monitored_repos")
    @classmethod
    def validate_repos(cls, value: str) -> str:
        repos = [r.strip() for r in value.split(",") if r.strip()]
        invalid = [r for r in repos if not GITHUB_REPO_URL_RE.match(r)]
        if invalid:
            raise ValueError(f"Invalid GitHub repo URL(s): {invalid}")
        return ",".join(dict.fromkeys(repos))

    @cached_property
    def repo_urls(self) -> List[str]:
        return [r.strip() for r in self.monitored_repos.split(",") if r.strip()]


settings = Settings()
