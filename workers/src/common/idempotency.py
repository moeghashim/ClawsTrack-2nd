from __future__ import annotations

import hashlib


def make_dedupe_key(*parts: str) -> str:
    joined = "|".join([p or "" for p in parts])
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()
