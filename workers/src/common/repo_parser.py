from __future__ import annotations

import re
from typing import Tuple

GITHUB_REPO_URL_RE = re.compile(
    r"^https?://github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+?)(?:\.git)?/?$"
)


def parse_owner_repo(repo_url: str) -> Tuple[str, str]:
    m = GITHUB_REPO_URL_RE.match(repo_url.strip())
    if not m:
        raise ValueError(f"Invalid GitHub repository URL: {repo_url}")
    return m.group("owner"), m.group("repo")
