# AGENTS.md

## Purpose
This repository hosts a **skill-oriented project** for monitoring and comparing open-source GitHub repositories.
Agents should prioritize reusable workflows so the project can be consumed by other agents.

## Project Objectives
1. Monitor GitHub repositories listed in environment variables.
2. Use `Scrapling` for update extraction and normalization.
3. Use OpenAI API to analyze updates and generate comparisons.
4. Provide a website where users can:
   - compare projects by features, security, and use-case fit
   - subscribe for update/comparison notifications

## Non-Negotiable Constraints
- Repository targets must come from environment configuration (`MONITORED_REPOS`).
- Analysis must be explainable (store reasons, not only scores).
- New features should be designed for both:
  - direct user value in the web app
  - reusability by downstream agents/skills

## Suggested Architecture
- `backend/`: API, auth, data access
- `workers/`: scraping + analysis jobs
- `frontend/`: dashboard + comparison UI
- `skill/`: reusable skill instructions/templates for agents

## Environment Variables
At minimum support:
- `MONITORED_REPOS`
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `NOTIFICATION_PROVIDER` and provider-specific settings

## Engineering Guidelines
- Keep modules small and testable.
- Prefer typed interfaces for analysis outputs.
- Separate raw scraped data from AI-derived interpretations.
- Preserve historical snapshots for longitudinal comparisons.
- Add clear fallback behavior when API calls fail.

## Done Criteria for Features
A feature is complete only if:
1. It works with repositories defined in environment variables.
2. It includes persisted outputs suitable for comparisons.
3. It is represented in the web UI where relevant.
4. It is documented for agent reuse (skill orientation).
