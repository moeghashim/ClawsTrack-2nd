# Architecture (Phase 1)

## Services

### 1) Backend API (`backend/`)
Responsibilities:
- Auth (signup/login/session)
- CRUD for repositories, subscriptions, and comparison requests
- Read APIs for snapshots, analyses, and historical trends
- Trigger ad-hoc comparison runs

### 2) Ingestion & Analysis Workers (`workers/`)
Responsibilities:
- Read `MONITORED_REPOS`
- Fetch update signals via Scrapling
- Normalize updates into canonical event records
- Run OpenAI analysis pipelines
- Persist explainable outputs (scores + rationale + confidence)
- Trigger notifications on meaningful deltas

### 3) Frontend (`frontend/`)
Responsibilities:
- Dashboard (project cards + timelines)
- Comparison views (2+ repos, multiple depth modes)
- Subscription/notification preferences

### 4) Skill Package (`skill/`)
Responsibilities:
- Reusable operating instructions for other agents
- Prompt templates and output schemas
- Runbook for incremental ingestion/comparison workflows

## Data Flow (high level)
1. Worker scheduler triggers ingestion run
2. Ingestion extracts updates from monitored repositories
3. Normalization writes event records + snapshots
4. Analysis engine scores/classifies and stores rationale
5. Comparison service computes rankings/trends
6. Notification service emits alerts for subscribed users
7. Frontend/API serve latest and historical insights

## Design Principles
- Idempotent ingestion jobs
- Explainability first (no score without reason)
- Historical persistence for longitudinal comparison
- Clear separation: raw scraped data vs AI interpretation
