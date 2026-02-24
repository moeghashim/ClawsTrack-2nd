const crypto = require('crypto');

function normalizeRepoInput(value) {
  if (!value || !value.trim()) return null;

  const trimmed = value.trim();

  if (trimmed.includes('github.com')) {
    try {
      const parsed = new URL(trimmed);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        const repo = `${segments[0]}/${segments[1]}`;
        return repo.toLowerCase();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  const plain = trimmed.replace(/^https?:\/\//, '');
  const pieces = plain.split('/').filter(Boolean);
  if (pieces.length >= 2 && pieces[0] === 'github.com') {
    return `${pieces[1]}/${pieces[2]}`.toLowerCase();
  }
  if (/^[\w.-]+\/[\w.-]+$/.test(plain)) {
    return plain.toLowerCase();
  }
  return null;
}

function parseMonitoredRepos(raw = process.env.MONITORED_REPOS || '') {
  return raw
    .split(',')
    .map((value) => normalizeRepoInput(value))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
}

function randomId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stripCodeFences(text = '') {
  return String(text)
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();
}

function toTitleCase(value = '') {
  return String(value)
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

module.exports = {
  normalizeRepoInput,
  parseMonitoredRepos,
  randomId,
  clamp,
  stripCodeFences,
  toTitleCase
};
