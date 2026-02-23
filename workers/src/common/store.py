from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel


class JsonlStore:
    """Simple persistence adapter (Phase 2.1).

    Keeps ingestion artifacts in local JSONL files so we can inspect runs before DB wiring.
    """

    def __init__(self, base_dir: str = "workers/.data") -> None:
        self.base_path = Path(base_dir)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str) -> Path:
        return self.base_path / f"{name}.jsonl"

    def append_model(self, name: str, model: BaseModel) -> None:
        self.append_raw(name, model.model_dump(mode="json"))

    def append_raw(self, name: str, row: Dict[str, Any]) -> None:
        path = self._path(name)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def read_all(self, name: str) -> List[Dict[str, Any]]:
        path = self._path(name)
        if not path.exists():
            return []
        rows: List[Dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rows.append(json.loads(line))
        return rows
