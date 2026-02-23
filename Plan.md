# Project Plan: OSS Project Monitor Skill

## Goal
Build a web application + reusable agent skill that monitors selected open-source repositories, analyzes updates with OpenAI, and compares projects across criteria (features, security, maturity, use-case fit).

## Phase 1 — Foundation
1. Define architecture:
   - Backend API service
   - Scraping/ingestion worker using Scrapling
   - Analysis engine using OpenAI API
   - Frontend dashboard for comparison + alerts
2. Define environment variables:
   - `MONITORED_REPOS` (comma-separated GitHub repo URLs)
   - `OPENAI_API_KEY`
   - `DATABASE_URL`
   - `SMTP_*` or notification provider settings
3. Set up data model:
   - repositories, snapshots, releases, comparisons, users, subscriptions, notifications

## Phase 2 — Data Ingestion
1. Build Scrapling-based repository monitor:
   - Pull commits, releases, security advisories/changelog signals
2. Normalize repository updates into structured events:
   - release events
   - feature events
   - bug/security-related events
3. Schedule recurring scans (e.g., cron/worker)

## Phase 3 — AI Analysis & Comparison
1. Implement OpenAI-powered analyzers:
   - release summarizer
   - feature classifier
   - security-impact classifier
   - use-case alignment scorer
2. Build comparison pipeline:
   - compare selected projects on weighted criteria
   - save explainable outputs (rationale + score)
3. Add configurable criteria levels:
   - high-level summary
   - technical depth
   - security-centric view

## Phase 4 — Product UX
1. Admin flow:
   - manage `MONITORED_REPOS` via env/deployment config
2. User flow:
   - signup/login
   - choose projects to watch
   - configure notification preferences
3. Dashboard features:
   - project cards + update timeline
   - pairwise/multi-project comparison view
   - release diff + recommendation summary

## Phase 5 — Notifications
1. Trigger notifications on:
   - new release
   - significant feature change
   - notable security updates
   - major ranking shifts
2. Delivery channels:
   - email first
   - optional webhook later

## Phase 6 — Hardening
1. Add rate limiting, retries, and idempotent ingestion
2. Add observability:
   - structured logs
   - ingestion/analysis metrics
3. Validate quality:
   - prompt evaluation set
   - regression checks for comparison consistency

## Deliverables
- Web app for monitoring and comparing OSS projects
- Skill-ready operational instructions for other agents
- Configurable repository list from environment variables
- AI-driven analyses and user notifications
