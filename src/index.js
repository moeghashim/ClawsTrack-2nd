const express = require('express');
const path = require('path');
const db = require('./db');
const { runIngestion } = require('./services/ingestService');
const { authFromHeader, register, login } = require('./services/authService');
const { runComparison } = require('./services/comparisonService');
const { listNotificationsForUser } = require('./services/notificationService');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const PORT = Number(process.env.PORT || 3000);
const STARTUP_MONITORING_DELAY_MS = Number(process.env.STARTUP_MONITORING_DELAY_MS || '0');

function requireAuth(req, res, next) {
  const auth = authFromHeader(req.headers);
  if (!auth) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  req.auth = auth;
  return next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString(), status: 'running' });
});

app.get('/api/repos', (_req, res) => {
  const repositories = db.list('repositories').map((repo) => {
    const latest = db
      .list('snapshots')
      .filter((item) => item.repositoryId === repo.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const lastAnalysis = latest ? db.getById('analyses', latest.analysisId) : null;

    return {
      id: repo.id,
      fullName: repo.fullName,
      url: repo.url,
      latestReleaseAt: repo.latestReleaseAt || null,
      latestSnapshot: latest
        ? {
            title: latest.title,
            summary: latest.summary,
            tagName: latest.tagName,
            htmlUrl: latest.htmlUrl,
            publishedAt: latest.publishedAt,
            changeType: latest.changeType,
            significance: latest.significance,
            criteria: lastAnalysis?.criteria || null,
            confidence: lastAnalysis?.confidence || 0
          }
        : null
    };
  });

  res.json({ repositories });
});

app.get('/api/repos/:id/snapshots', (req, res) => {
  const { id } = req.params;
  const repo = db.getById('repositories', id);
  if (!repo) {
    return res.status(404).json({ error: 'repository_not_found' });
  }

  const snapshots = db
    .list('snapshots')
    .filter((item) => item.repositoryId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30)
    .map((item) => ({
      ...item,
      analysis: db.getById('analyses', item.analysisId)
    }));

  res.json({ repo: { id: repo.id, fullName: repo.fullName, url: repo.url }, snapshots });
});

app.post('/api/compare', async (req, res) => {
  try {
    const { repositoryIds, mode } = req.body || {};
    const auth = authFromHeader(req.headers);

    const result = await runComparison({
      repositoryIds: Array.isArray(repositoryIds) ? repositoryIds : [],
      mode,
      userId: auth?.user?.id || null
    });

    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: error.message || 'comparison_failed' });
  }
});

app.get('/api/comparisons', (req, res) => {
  const mode = req.query.mode;
  const list = db
    .list('comparisonRuns')
    .filter((item) => (mode ? item.mode === mode : true))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  res.json({ comparisons: list });
});

app.post('/api/admin/ingest', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (process.env.ADMIN_API_KEY && adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'invalid_admin_key' });
  }

  try {
    const run = await runIngestion();
    res.json({ run });
  } catch (error) {
    res.status(500).json({ error: error.message || 'ingest_failed' });
  }
});

app.post('/api/users/register', (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const session = register({ email, password, name });
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message || 'register_failed' });
  }
});

app.post('/api/users/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const session = login({ email, password });
    res.json(session);
  } catch (error) {
    res.status(401).json({ error: error.message || 'login_failed' });
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.auth.user, session: req.auth.session });
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const userId = req.auth.user.id;
  const { repositoryId, criteria } = req.body || {};

  const repo = db.getById('repositories', repositoryId);
  if (!repo) {
    return res.status(404).json({ error: 'repository_not_found' });
  }

  const list = criteria && Array.isArray(criteria) && criteria.length ? criteria : ['all'];

  const existing = db.findOne(
    'subscriptions',
    (item) => item.userId === userId && item.repositoryId === repositoryId
  );

  if (existing) {
    existing.criteria = list;
    existing.enabled = true;
    db.saveState();
    return res.json({ subscription: existing });
  }

  const sub = {
    id: `${userId}_${repositoryId}_sub`,
    userId,
    repositoryId,
    criteria: list,
    enabled: true,
    createdAt: new Date().toISOString()
  };

  db.insert('subscriptions', sub);
  res.json({ subscription: sub });
});

app.get('/api/subscriptions', requireAuth, (req, res) => {
  const userId = req.auth.user.id;
  const list = db
    .list('subscriptions')
    .filter((item) => item.userId === userId)
    .map((item) => ({
      ...item,
      repository: db.getById('repositories', item.repositoryId)
    }));
  res.json({ subscriptions: list });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  const userId = req.auth.user.id;
  const notifications = listNotificationsForUser(userId, 50);
  res.json({ notifications });
});

app.get('/api/ingest-runs', (_req, res) => {
  const runs = db
    .list('ingestRuns')
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, 20);
  res.json({ runs });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'clawstrack-2nd',
    version: '0.1.0',
    routes: ['/api/health', '/api/repos', '/api/compare', '/api/admin/ingest', '/api/users/register', '/api/users/login']
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Clawstrack running at http://localhost:${PORT}`);
});

if (STARTUP_MONITORING_DELAY_MS > 0) {
  setTimeout(() => {
    runIngestion().catch((error) => {
      console.error('startup ingest failed', error.message);
    });
  }, STARTUP_MONITORING_DELAY_MS);
}

const intervalMs = Number(process.env.WORKER_INTERVAL_MS || '0');
if (intervalMs > 0) {
  setInterval(() => {
    runIngestion().catch((error) => {
      console.error('scheduled ingest failed', error.message);
    });
  }, intervalMs);
}
