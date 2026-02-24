const fs = require('fs');
const path = require('path');

const defaultState = {
  repositories: [],
  snapshots: [],
  releaseEvents: [],
  analyses: [],
  comparisonRuns: [],
  users: [],
  sessions: [],
  subscriptions: [],
  notifications: [],
  ingestRuns: []
};

function parseDatabasePath() {
  const raw = process.env.DATABASE_URL || 'sqlite:./data/clawstrack.json';
  if (raw.startsWith('sqlite:')) {
    return path.resolve(process.cwd(), raw.replace(/^sqlite:/, ''));
  }
  return path.resolve(process.cwd(), raw);
}

const dbPath = parseDatabasePath();

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function loadState() {
  try {
    if (!fs.existsSync(dbPath)) {
      return clone(defaultState);
    }

    const raw = fs.readFileSync(dbPath, 'utf8').toString();
    if (!raw.trim()) {
      return clone(defaultState);
    }

    const parsed = JSON.parse(raw);
    return { ...clone(defaultState), ...parsed };
  } catch (_error) {
    return clone(defaultState);
  }
}

function persist(state) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(state, null, 2));
}

const state = loadState();

function table(name) {
  if (!state[name]) {
    state[name] = [];
  }
  return state[name];
}

function saveState() {
  persist(state);
}

function list(tableName) {
  return table(tableName);
}

function getById(tableName, id) {
  return table(tableName).find((row) => row.id === id) || null;
}

function findOne(tableName, predicate) {
  return table(tableName).find(predicate) || null;
}

function insert(tableName, row) {
  table(tableName).push(row);
  saveState();
  return row;
}

function updateById(tableName, id, updates) {
  const current = getById(tableName, id);
  if (!current) {
    return null;
  }

  Object.assign(current, updates);
  saveState();
  return current;
}

function removeById(tableName, id) {
  const records = table(tableName);
  const index = records.findIndex((row) => row.id === id);
  if (index === -1) {
    return false;
  }

  records.splice(index, 1);
  saveState();
  return true;
}

function latestBy(tableName, predicate) {
  return table(tableName)
    .filter(predicate)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

function nextId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  state,
  list,
  getById,
  findOne,
  insert,
  updateById,
  removeById,
  latestBy,
  saveState,
  nextId
};
