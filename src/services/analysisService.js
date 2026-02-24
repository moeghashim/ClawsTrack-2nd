const db = require('../db');
const { randomId, clamp, stripCodeFences, toTitleCase } = require('../lib/utils');

const DEFAULT_CRITERIA = ['features', 'security', 'maturity', 'useCaseFit'];
const BASE_CRITERIA = {
  features: 50,
  security: 45,
  maturity: 52,
  useCaseFit: 48
};

function keywordCount(text, keywords) {
  const normalized = text.toLowerCase();
  return keywords.reduce((sum, keyword) => {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
    const count = normalized.match(pattern);
    return sum + (count ? count.length : 0);
  }, 0);
}

function normalizeType(scoreText, titleText, defaultType = 'maintenance') {
  const text = `${scoreText} ${titleText}`.toLowerCase();
  if (/(security|vuln|cve|threat|exploit)/i.test(text)) return 'security';
  if (/(fix|bug|crash|regression|patch|broken)/i.test(text)) return 'fix';
  if (/(feat|feature|add|added|introduce|support|new|enhance|improve)/i.test(text)) return 'feature';
  if (/(doc|document|readme)/i.test(text)) return 'docs';
  return defaultType;
}

function heuristicAnalysis(input = {}) {
  const body = `${input.releaseTitle || ''} ${input.releaseBody || ''} ${input.commitsText || ''} ${input.scrapedText || ''}`;
  const normalized = body.toLowerCase();

  const featureSignals = keywordCount(normalized, [
    'feature',
    'feat',
    'add',
    'support',
    'enhance',
    'improve',
    'new',
    'introduce',
    'plugin',
    'api',
    'interface',
    'integration'
  ]);

  const securitySignals = keywordCount(normalized, [
    'security',
    'cve',
    'vulnerab',
    'xss',
    'csrf',
    'leak',
    'secret',
    'access',
    'auth',
    'token',
    'encrypt'
  ]);

  const stabilitySignals = keywordCount(normalized, [
    'fix',
    'bug',
    'crash',
    'error',
    'stability',
    'rollback',
    'refactor',
    'performance',
    'perf'
  ]);

  const useSignals = keywordCount(normalized, [
    'case',
    'integration',
    'deploy',
    'ci',
    'pipeline',
    'workflow',
    'api',
    'sdk',
    'template',
    'docs'
  ]);

  const featureScore = clamp(BASE_CRITERIA.features + featureSignals * 4 - stabilitySignals, 0, 100);
  const securityScore = clamp(BASE_CRITERIA.security + securitySignals * 5 + (normalized.includes('auth') ? 6 : 0), 0, 100);
  const maturityScore = clamp(BASE_CRITERIA.maturity + stabilitySignals * 2 + featureSignals - securitySignals * 0.5, 0, 100);
  const useCaseFitScore = clamp(BASE_CRITERIA.useCaseFit + useSignals * 3 + featureSignals * 0.75, 0, 100);

  const changeType = normalizeType(normalized, `${input.releaseTitle || ''}`);
  const significance = securitySignals > 2 || (changeType === 'feature' && featureSignals > 5) || stabilitySignals > 6
    ? 'high'
    : featureSignals > 3 || stabilitySignals > 3 || securitySignals > 0
      ? 'medium'
      : 'low';

  return {
    summary: `Detected ${changeType} activity with ${toTitleCase(changeType)} impact for ${input.repo || 'repository'}.`,
    changeType,
    significance,
    criteria: {
      features: {
        score: Math.round(featureScore),
        rationale: `Feature signal strength is ${featureSignals}, with ${featureSignals ? 'new additions' : 'limited'} visible changes.`
      },
      security: {
        score: Math.round(securityScore),
        rationale: `Security signal strength is ${securitySignals}, and ${securitySignals ? 'security-related content is present' : 'no explicit security mentions were detected'}.`
      },
      maturity: {
        score: Math.round(maturityScore),
        rationale: `Stability and maintenance signal count is ${stabilitySignals}, indicating ${stabilitySignals ? 'active maintenance effort' : 'minimal maintenance clues'}.`
      },
      useCaseFit: {
        score: Math.round(useCaseFitScore),
        rationale: `Integration and workflow mentions are at ${useSignals}, giving ${useSignals ? 'moderate' : 'low'} project usability signal.`
      }
    },
    confidence: 0.52,
    keywords: {
      features: featureSignals,
      security: securitySignals,
      stability: stabilitySignals,
      useCaseFit: useSignals
    }
  };
}

async function callOpenAIForAnalysis(input) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const prompt = `You are an OSS update analyst.
Summarize the repository update into strict JSON with fields:
- summary: short one sentence
- changeType: feature|fix|security|docs|maintenance
- significance: low|medium|high
- criteria: object with keys features, security, maturity, useCaseFit. Each key has numeric score 0-100 and rationale string.
- confidence: 0..1
Use the provided raw input and do not include markdown or extra text.

Input:
${JSON.stringify(input)} `;

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
          content: 'You are a precise software release analyst.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI call failed: ${response.status}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content || '';

  const parsed = JSON.parse(stripCodeFences(raw));

  DEFAULT_CRITERIA.forEach((criterion) => {
    const entry = parsed?.criteria?.[criterion];
    if (!entry || typeof entry.score !== 'number') {
      throw new Error(`Invalid AI criteria payload`);
    }
    entry.score = clamp(Math.round(entry.score), 0, 100);
  });

  return {
    source: 'openai',
    summary: parsed.summary || 'No summary returned.',
    changeType: parsed.changeType || 'maintenance',
    significance: parsed.significance || 'medium',
    confidence: clamp(Number(parsed.confidence || 0), 0, 1),
    criteria: parsed.criteria
  };
}

async function analyzeUpdate({ repo, releaseTitle, releaseBody, commitsText, releaseUrl, scrapedText }) {
  const payload = {
    repo,
    releaseTitle,
    releaseBody,
    releaseUrl,
    commitSample: commitsText,
    scrapedSample: scrapedText
  };

  let analysis;
  try {
    analysis = await callOpenAIForAnalysis(payload);
  } catch (_error) {
    analysis = null;
  }

  if (!analysis) {
    analysis = heuristicAnalysis(payload);
  }

  const now = new Date().toISOString();
  const record = {
    id: randomId('analysis'),
    repository: repo,
    source: analysis.source || 'heuristic',
    summary: analysis.summary,
    changeType: analysis.changeType,
    significance: analysis.significance,
    criteria: analysis.criteria,
    confidence: analysis.confidence,
    createdAt: now
  };

  db.insert('analyses', record);
  return record;
}

module.exports = {
  analyzeUpdate,
  heuristicAnalysis
};
