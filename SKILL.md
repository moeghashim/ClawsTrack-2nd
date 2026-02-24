# Clawstrack Skill: OSS Monitoring Workflow

This repository can be reused by agents as a repeatable skill workflow.

## Inputs

- `MONITORED_REPOS`: Comma-separated GitHub repository URLs.
- `OPENAI_API_KEY`: Optional for richer analysis.
- `DATABASE_URL`: Storage path, e.g. `sqlite:./data/clawstrack.json`.
- `NOTIFICATION_PROVIDER`: `console` or `webhook`.
- `NOTIFICATION_WEBHOOK_URL`: Delivery endpoint when provider is `webhook`.

## Core flow

1. Ingestion worker reads repos from `MONITORED_REPOS` and queries GitHub release + commit signals.
2. Optional Scrapling step runs through `scripts/scrapling_bridge.py`.
3. `analysisService` produces explainable scoring and rationale.
4. Data is stored as JSON-backed tables in `DATABASE_URL`.
5. Comparison runs generate weighted criterion totals and ranked outputs.
6. User-facing notifications are created when repo watchers are matched.

## Outputs

- `repositories`
- `snapshots`
- `releaseEvents`
- `analyses`
- `comparisonRuns`
- `users`
- `subscriptions`
- `notifications`

## Extending by other agents

- Replace data access in `src/db.js` with Postgres/SQLite for production.
- Swap notification handler in `src/services/notificationService.js` with email/chat provider.
- Add richer workers in `src/services/ingestService.js` with additional data sources.
