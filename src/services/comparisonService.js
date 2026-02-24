const db = require('../db');
const { stripCodeFences, randomId, clamp } = require('../lib/utils');

const LEVEL_WEIGHTS = {
  executive: {
    features: 0.35,
    security: 0.3,
    maturity: 0.2,
    useCaseFit: 0.15
  },
  technical: {
    features: 0.3,
    security: 0.25,
    maturity: 0.3,
    useCaseFit: 0.15
  },
  security: {
    security: 0.6,
    maturity: 0.25,
    features: 0.1,
    useCaseFit: 0.05
  },
  use_case: {
    useCaseFit: 0.5,
    features: 0.3,
    maturity: 0.1,
    security: 0.1
  }
};

function weightedScore(criteria = {}, level = 'executive') {
  const weights = LEVEL_WEIGHTS[level] || LEVEL_WEIGHTS.executive;
  return Object.entries(weights).reduce((sum, [key, weight]) => {
    const score = Number(criteria[key]?.score || 0);
    return sum + score * weight;
  }, 0);
}

function summarizeSources(snapshots, analyses) {
  return snapshots.map((snapshot) => {
    const analysis = analyses.find((item) => item.id === snapshot.analysisId) || {};
    return {
      snapshotId: snapshot.id,
      repo: snapshot.repository,
      title: snapshot.title,
      releasedAt: snapshot.publishedAt,
      summary: analysis.summary || snapshot.summary,
      significance: analysis.significance || snapshot.significance,
      changeType: analysis.changeType || snapshot.changeType,
      criteria: analysis.criteria || {},
      confidence: analysis.confidence || 0,
      createdAt: snapshot.createdAt
    };
  });
}

function normalizeMode(mode) {
  if (!mode) return 'executive';
  return ['executive', 'technical', 'security', 'use_case'].includes(mode)
    ? mode
    : 'executive';
}

async function callOpenAIForComparison(payload) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You produce strict JSON recommendations for repository comparison.'
        },
        {
          role: 'user',
          content: `Create a concise explainable comparison summary for the provided repository snapshots.
Return strict JSON with keys: overallWinner, rationale, winnerJustification, alternatives, confidence.
Rationale should explain scoring trade-offs across levels and include repo recommendations.
Input: ${JSON.stringify(payload)}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI call failed: ${response.status}`);
  }

  const payloadJson = await response.json();
  const raw = payloadJson?.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(stripCodeFences(raw));

  if (!parsed.overallWinner) {
    throw new Error('Invalid comparison payload');
  }

  return parsed;
}

async function runComparison({ repositoryIds = [], mode = 'executive', userId = null }) {
  if (!Array.isArray(repositoryIds) || repositoryIds.length < 2) {
    throw new Error('comparison requires at least two repositories');
  }

  const normalizedMode = normalizeMode(mode);
  const snapshots = db.list('snapshots').filter((item) => repositoryIds.includes(item.repositoryId));
  const latestByRepo = {};

  repositoryIds.forEach((id) => {
    latestByRepo[id] = snapshots
      .filter((item) => item.repositoryId === id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  });

  const analyses = db.list('analyses');
  const repoSummaries = summarizeSources(Object.values(latestByRepo).filter(Boolean), analyses);

  if (repoSummaries.length < 2) {
    throw new Error('Not enough analyzed snapshots available yet');
  }

  const ranking = repoSummaries
    .map((summary) => {
      const total = weightedScore(summary.criteria, normalizedMode);
      return {
        repositoryId: summary.repo,
        score: clamp(Math.round(total), 0, 100),
        confidence: summary.confidence || 0,
        rationale: summary.summary,
        topChangeType: summary.changeType,
        significance: summary.significance
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const comparisonKey = repositoryIds.slice().sort().join('|');
  const prevRuns = db.list('comparisonRuns')
    .filter((run) => run.mode === normalizedMode && run.comparisonKey === comparisonKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const previousRanking = prevRuns[0]?.ranking || [];
  const enriched = ranking.map((item) => {
    const previous = previousRanking.find((prev) => prev.repositoryId === item.repositoryId);
    const previousRank = previous?.rank;
    return {
      ...item,
      trend: previousRank
        ? {
            deltaRank: previousRank - item.rank,
            previousRank,
            direction: previousRank === item.rank ? 'stable' : previousRank > item.rank ? 'up' : 'down'
          }
        : { direction: 'new' }
    };
  });

  let comparisonNarrative;
  try {
    comparisonNarrative = await callOpenAIForComparison({
      mode: normalizedMode,
      ranking: enriched,
      summaries: repoSummaries
    });
  } catch (_error) {
    comparisonNarrative = null;
  }

  const winnerId = enriched[0]?.repositoryId || null;
  const winnerRepo = db.list('repositories').find((r) => r.id === winnerId) || null;

  const result = {
    id: randomId('compare'),
    userId,
    mode: normalizedMode,
    comparisonKey,
    repositoryIds,
    ranking: enriched,
    overallWinner: winnerRepo?.fullName || winnerId,
    overallWinnerRepositoryId: winnerId,
    confidence: Math.round((enriched.reduce((sum, item) => sum + (item.confidence || 0), 0) / enriched.length) * 100) / 100,
    createdAt: new Date().toISOString(),
    summary: comparisonNarrative ? comparisonNarrative.overallWinner : `Winner by weighted ${normalizedMode} score: ${enriched[0]?.repositoryId || 'none'}`,
    rationale: {
      winnerJustification: comparisonNarrative?.winnerJustification || 'Scored highest on the configured mode weights.',
      alternatives: comparisonNarrative?.alternatives || enriched.slice(1, 3).map((entry) => ({ repositoryId: entry.repositoryId, reason: entry.rationale })),
      overallTradeoff: comparisonNarrative?.rationale || 'Feature and security deltas were the dominant contributors.'
    }
  };

  const saved = db.insert('comparisonRuns', result);

  return saved;
}

module.exports = {
  runComparison
};
