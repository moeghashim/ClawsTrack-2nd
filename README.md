# ClawsTrack-2nd

OSS Project Monitor & Comparison platform.

## Phase 1 (Foundation) status
- ✅ Repository scaffolded with core modules:
  - `backend/` API + auth + data access
  - `workers/` scraping + analysis jobs
  - `frontend/` dashboard UI
  - `skill/` reusable agent instructions/templates
- ✅ Environment variable contract defined in `.env.example`
- ✅ Initial logical data model drafted in `docs/data-model.md` and `docs/schema.sql`

## Structure
- `backend/` - API service and domain models
- `workers/` - ingestion/analysis/notification workers
- `frontend/` - web UI
- `skill/` - agent-facing reusable instructions
- `docs/` - architecture and data model docs
- `config/` - app-level typed config contract

## Quick start
1. Copy `.env.example` to `.env`
2. Fill required keys (`OPENAI_API_KEY`, `DATABASE_URL`, `MONITORED_REPOS`)
3. Implement services incrementally from `Plan.md`
