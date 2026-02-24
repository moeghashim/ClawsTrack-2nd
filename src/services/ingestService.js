const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const db = require('../db');
const { parseMonitoredRepos, randomId } = require('../lib/utils');
const { analyzeUpdate } = require('./analysisService');
const { createNotification } = require('./notificationService');

const execFileAsync = promisify(execFile);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callScraplingFallback(url) {
  const script = path.join(process.cwd(), 'scripts', 'scrapling_bridge.py');
  try {
    const { stdout } = await execFileAsync('python3', [script, url], { timeout: 20000, maxBuffer: 2_000_000 });
    if (!stdout) {
      return '';
    }
    const parsed = JSON.parse(stdout);
    return parsed?.text || '';
  } catch (_error) {
    return '';
  }
}

async function fetchLatestRelease(repo) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'oss-monitor-agent'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GitHub releases failed for ${repo}: ${response.status}`);
  }

  return response.json();
}

async function fetchRecentCommits(repo) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'oss-monitor-agent'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=8`, { headers });
  if (!response.ok) {
    return [];
  }

  const items = await response.json();
  return Array.isArray(items) ? items.slice(0, 8).map((item) => item.commit?.message || '').filter(Boolean) : [];
}

function getOrCreateRepository(repo) {
  const existing = db.findOne('repositories', (item) => item.fullName === repo);
  if (existing) {
    return existing;
  }

  return db.insert('repositories', {
    id: randomId('repo'),
    fullName: repo,
    url: `https://github.com/${repo}`,
    createdAt: new Date().toISOString(),
    latestReleaseId: null
  });
}

async function runIngestion() {
  const repos = parseMonitoredRepos();
  const run = {
    id: randomId('run'),
    startedAt: new Date().toISOString(),
    status: 'running',
    reposScanned: repos.length,
    eventsCreated: 0,
    errors: []
  };

  db.insert('ingestRuns', run);

  const runResults = [];

  for (const repo of repos) {
    try {
      const repositoryRecord = getOrCreateRepository(repo);
      const latestRelease = await fetchLatestRelease(repo);
      if (!latestRelease) {
        continue;
      }

      const existingSnapshot = db
        .list('snapshots')
        .filter((item) => item.repositoryId === repositoryRecord.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      if (existingSnapshot && existingSnapshot.externalId === latestRelease.id) {
        continue;
      }

      const commits = await fetchRecentCommits(repo);
      const scrapedText = await callScraplingFallback(latestRelease.html_url || `https://github.com/${repo}/releases`);

      const analysis = await analyzeUpdate({
        repo: repositoryRecord.id,
        releaseTitle: latestRelease.name || latestRelease.tag_name || 'Latest release',
        releaseBody: latestRelease.body || '',
        commitsText: commits.join('\n'),
        releaseUrl: latestRelease.html_url || '',
        scrapedText
      });

      const snapshot = {
        id: randomId('snapshot'),
        repositoryId: repositoryRecord.id,
        externalId: latestRelease.id,
        title: latestRelease.name || latestRelease.tag_name || 'Release',
        tagName: latestRelease.tag_name || null,
        htmlUrl: latestRelease.html_url || `https://github.com/${repo}/releases`,
        publishedAt: latestRelease.published_at || new Date().toISOString(),
        summary: analysis.summary,
        analysisId: analysis.id,
        changeType: analysis.changeType,
        significance: analysis.significance,
        createdAt: new Date().toISOString()
      };

      db.insert('snapshots', snapshot);
      db.insert('releaseEvents', {
        id: randomId('event'),
        repositoryId: repositoryRecord.id,
        snapshotId: snapshot.id,
        externalId: latestRelease.id,
        source: 'github',
        eventType: 'release',
        releaseUrl: snapshot.htmlUrl,
        publishedAt: snapshot.publishedAt,
        createdAt: new Date().toISOString()
      });

      db.updateById('repositories', repositoryRecord.id, {
        latestReleaseId: snapshot.id,
        latestReleaseAt: snapshot.publishedAt
      });

      run.eventsCreated += 1;
      runResults.push(snapshot);

      const subscribers = db
        .list('subscriptions')
        .filter((item) => item.repositoryId === repositoryRecord.id);

      for (const sub of subscribers) {
        if (sub.enabled === false) {
          continue;
        }

        const wantsSecurity = Array.isArray(sub.criteria) && sub.criteria.includes('security');
        if (analysis.changeType === 'security' && !wantsSecurity) {
          continue;
        }

        await createNotification({
          userId: sub.userId,
          repositoryId: repositoryRecord.id,
          type: analysis.changeType,
          title: `${repositoryRecord.fullName} new update`,
          body: analysis.summary,
          payload: {
            releaseUrl: snapshot.htmlUrl,
            severity: analysis.significance,
            changeType: analysis.changeType,
            scoreSnapshot: analysis.criteria
          }
        });
      }

      await sleep(300);
    } catch (error) {
      run.errors.push(`${repo}: ${error.message}`);
    }
  }

  run.status = run.errors.length ? 'completed_with_errors' : 'completed';
  run.finishedAt = new Date().toISOString();
  run.eventsCreated = run.eventsCreated;

  db.updateById('ingestRuns', run.id, { ...run });
  return run;
}

module.exports = {
  runIngestion
};
