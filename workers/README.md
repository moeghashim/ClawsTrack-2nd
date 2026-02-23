# workers

Ingestion + analysis jobs for ClawsTrack.

## Phase 2 scope
- Scrapling-based GitHub ingestion skeleton
- Event normalization layer
- Typed analysis output schema (explainability-first)

## Setup
```bash
cd workers
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run ingestion skeleton
From repo root:
```bash
python -m workers.src.main
```

Expected behavior:
- Reads `MONITORED_REPOS` from environment
- Fetches each repository page and releases page via Scrapling
- Normalizes release events
- Persists ingestion artifacts into `workers/.data/*.jsonl`
- Emits basic run summary logs
