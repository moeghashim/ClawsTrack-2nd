const crypto = require('crypto');
const db = require('../db');
const { randomId } = require('../lib/utils');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function createSession(userId) {
  const now = Date.now();
  const ttl = Number(process.env.SESSION_TTL_MS || 604800000);
  return {
    id: randomId('session'),
    userId,
    token: randomId('tok'),
    expiresAt: new Date(now + ttl).toISOString(),
    createdAt: new Date(now).toISOString()
  };
}

function getActiveSession(token) {
  if (!token) return null;

  const session = db.findOne('sessions', (item) => item.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt) <= new Date()) {
    db.removeById('sessions', session.id);
    return null;
  }

  return session;
}

function authFromHeader(headers = {}) {
  const auth = headers.authorization || headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return null;
  }
  const token = auth.slice('Bearer '.length).trim();
  const session = getActiveSession(token);
  if (!session) return null;

  const user = db.getById('users', session.userId);
  if (!user) return null;

  return { user, session };
}

function register({ email, password, name }) {
  if (!email || !password) {
    throw new Error('email and password are required');
  }

  const existing = db.findOne('users', (item) => item.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('user already exists');
  }

  const salt = randomId('salt');
  const row = {
    id: randomId('user'),
    email,
    name: name || email,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString()
  };

  db.insert('users', row);
  const session = createSession(row.id);
  db.insert('sessions', session);

  return { user: { id: row.id, email, name: row.name }, token: session.token };
}

function login({ email, password }) {
  const user = db.findOne('users', (item) => item.email.toLowerCase() === String(email).toLowerCase());
  if (!user) {
    throw new Error('invalid credentials');
  }

  const candidate = hashPassword(password, user.passwordSalt);
  if (candidate !== user.passwordHash) {
    throw new Error('invalid credentials');
  }

  const session = createSession(user.id);
  db.insert('sessions', session);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    token: session.token
  };
}

module.exports = {
  register,
  login,
  authFromHeader
};
