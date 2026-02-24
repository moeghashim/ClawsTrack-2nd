# Clawstrack 2nd

Open-source repository monitoring and comparison platform built from the PRD/Plan.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy env:

```bash
cp .env.example .env
```

3. Fill required env values:
- `MONITORED_REPOS` (comma separated GitHub URLs)
- `OPENAI_API_KEY` (optional)
- `DATABASE_URL` (`sqlite:` path is supported by default)

4. Run server:

```bash
npm start
```

5. Optionally trigger one-time ingestion:

```bash
npm run ingest
```

6. Open <http://localhost:3000> for the dashboard.

## APIs

- `GET /api/health`
- `GET /api/repos`
- `GET /api/repos/:id/snapshots`
- `GET /api/comparisons`
- `POST /api/compare`
- `POST /api/admin/ingest`
- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/me`
- `POST /api/subscriptions`
- `GET /api/subscriptions`
- `GET /api/notifications`
- `GET /api/ingest-runs`

## Data storage

This implementation stores normalized JSON data at `DATABASE_URL` (default `./data/clawstrack.json`) through a tiny local persistence layer.
