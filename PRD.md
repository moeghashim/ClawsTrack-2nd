# PRD — Open-Source Project Monitor & Comparison Skill

## 1) Product Summary
A web platform that monitors selected open-source GitHub repositories, analyzes changes using OpenAI, and helps users compare projects before deciding which one to adopt.
The system is also packaged as a reusable **skill-oriented project** so other agents can run and extend the workflow.

## 2) Problem Statement
Developers and teams struggle to evaluate competing OSS projects continuously. Manual tracking of releases, security updates, and feature progress across multiple repos is time-consuming and inconsistent.

## 3) Goals
- Track updates for admin-defined repositories.
- Provide AI-generated comparison insights (features, security, use-case alignment, etc.).
- Allow users to sign up and receive notifications.
- Enable multi-level comparisons (high-level to deep technical/security).
- Make the project consumable by other agents as a repeatable skill/workflow.

## 4) Non-Goals (Initial Version)
- Real-time streaming from every GitHub event.
- Full static code analysis of each repository.
- Auto-deployment actions based on recommendations.

## 5) Users & Personas
1. **Admin**
   - Configures monitored repositories via environment variables.
2. **Engineer/Tech Lead**
   - Compares OSS alternatives for adoption decisions.
3. **Researcher/Analyst**
   - Tracks change velocity, security posture, and feature evolution.

## 6) Core Requirements

### 6.1 Repository Monitoring
- Input source: `MONITORED_REPOS` env variable containing GitHub repository URLs.
- Collect:
  - releases
  - changelog-related updates
  - commit trends / update metadata
  - security-relevant change signals (when available)
- Scraping implementation must use: `https://github.com/D4Vinci/Scrapling`.

### 6.2 AI Analysis (OpenAI)
- Use OpenAI API to:
  - summarize updates
  - classify change type (feature/fix/security/docs/etc.)
  - estimate impact and relevance by use case
  - compare repositories against selected criteria
- Comparison output must include:
  - criterion scores
  - concise rationale per score
  - confidence indicator

### 6.3 Comparison Experience
- Support comparing 2+ projects.
- Support different comparison levels:
  - executive summary
  - technical depth
  - security-centric
  - use-case fit
- Show historical trend snapshots for each project.

### 6.4 User Accounts & Notifications
- Users can sign up/login.
- Users can subscribe to projects and criteria.
- Notify on:
  - new release
  - significant feature/security changes
  - major comparative ranking shifts

## 7) Functional Flows

### 7.1 Admin Setup
1. Set `MONITORED_REPOS` in env.
2. Start ingestion worker.
3. Verify repositories appear in dashboard.

### 7.2 User Comparison
1. User selects projects and comparison mode.
2. System loads latest analyzed snapshots.
3. UI renders side-by-side scores + rationale.
4. User optionally subscribes to updates.

### 7.3 Update Notification
1. Worker detects meaningful change.
2. Analysis service updates comparison deltas.
3. Notification service sends user alerts.

## 8) Data & Storage (Logical)
- `Repository`
- `RepositorySnapshot`
- `ReleaseEvent`
- `ChangeAnalysis`
- `ComparisonRun`
- `User`
- `Subscription`
- `NotificationLog`

## 9) Quality Attributes
- Reliability: retries + idempotent ingestion.
- Explainability: every score has rationale.
- Auditability: retain historical analyses.
- Security: protect API keys and user data.
- Performance: asynchronous ingestion and analysis jobs.

## 10) API/Service Boundaries (Proposed)
- **Ingestion Service**: Scrapling extraction + normalization
- **Analysis Service**: OpenAI prompts, scoring, and rationale generation
- **Comparison Service**: multi-repo scoring and ranking
- **Web API**: auth, projects, comparisons, subscriptions
- **Notification Service**: email/webhook dispatch

## 11) Success Metrics
- Time-to-insight: < 2 minutes to produce updated comparison after new release ingestion.
- Analysis coverage: >= 95% of monitored release events produce classification + summary.
- User engagement: % of users configuring at least one subscription.
- Decision utility: user-reported usefulness of comparison outputs.

## 12) Risks & Mitigations
- **Rate limits / scraping failures** → retries, backoff, partial processing.
- **LLM inconsistency** → standardized prompts, schema validation, confidence scoring.
- **Noisy change data** → filtering + significance thresholds.
- **Security signal ambiguity** → explicit confidence + source references where available.

## 13) Milestones
1. M1: Baseline ingestion + storage
2. M2: AI analysis pipeline + schema-validated outputs
3. M3: Comparison dashboard + auth
4. M4: Notification workflows
5. M5: Skill packaging and agent-facing documentation
