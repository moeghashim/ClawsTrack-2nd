# Logical Data Model (Phase 1)

## Entities

### Repository
- id (uuid)
- url (unique)
- owner
- name
- isActive
- createdAt / updatedAt

### RepositorySnapshot
- id (uuid)
- repositoryId (fk)
- capturedAt
- defaultBranch
- stars
- forks
- openIssues
- latestReleaseTag
- rawPayloadRef

### ReleaseEvent
- id (uuid)
- repositoryId (fk)
- version
- publishedAt
- title
- notesRef
- sourceUrl
- isSecurityRelevant (bool)

### ChangeAnalysis
- id (uuid)
- repositoryId (fk)
- snapshotId (fk nullable)
- releaseEventId (fk nullable)
- changeType (feature|fix|security|docs|maintenance|other)
- summary
- impactLevel (low|medium|high)
- confidence (0-1)
- rationale
- model
- createdAt

### ComparisonRun
- id (uuid)
- mode (executive|technical|security|usecase)
- criteriaWeights (jsonb)
- repositories (jsonb)
- results (jsonb)
- createdByUserId (fk nullable)
- createdAt

### User
- id (uuid)
- email (unique)
- passwordHash
- role (admin|user)
- createdAt

### Subscription
- id (uuid)
- userId (fk)
- repositoryId (fk nullable)
- criteria (jsonb)
- minSeverity
- channel (email|webhook)
- isActive

### NotificationLog
- id (uuid)
- subscriptionId (fk)
- eventType
- payload (jsonb)
- status (queued|sent|failed)
- sentAt
- error
