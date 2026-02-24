const db = require('../db');
const { randomId } = require('../lib/utils');

async function dispatch(notification) {
  const provider = (process.env.NOTIFICATION_PROVIDER || 'console').toLowerCase();
  if (provider === 'webhook') {
    const webhook = process.env.NOTIFICATION_WEBHOOK_URL;
    if (!webhook) {
      return;
    }

    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    } catch (_error) {
      // best effort delivery
    }
    return;
  }

  if (provider === 'email') {
    // Placeholder adapter: email provider was not implemented yet, keeping logs for transparency.
    console.log('[notification][email-mock]', JSON.stringify(notification));
    return;
  }

  console.log('[notification]', JSON.stringify(notification));
}

async function createNotification({ userId, repositoryId, type, title, body, payload }) {
  const notification = {
    id: randomId('notify'),
    userId,
    repositoryId,
    type,
    title,
    body,
    payload: payload || null,
    createdAt: new Date().toISOString(),
    delivered: false,
    deliveredAt: null
  };

  db.insert('notifications', notification);
  await dispatch(notification);
  return notification;
}

function listNotificationsForUser(userId, limit = 20) {
  return db
    .list('notifications')
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Number(limit) || 20);
}

function maybeNotifyForRankingShift({ userId, repositoryId, fromRank, toRank, beforeWinner, afterWinner }) {
  if (!userId || fromRank == null || toRank == null) {
    return;
  }

  if (fromRank !== toRank) {
    return createNotification({
      userId,
      repositoryId,
      type: 'ranking_shift',
      title: `Ranking changed for ${repositoryId}`,
      body: `Ranking shifted from ${fromRank} to ${toRank}.`,
      payload: {
        beforeWinner,
        afterWinner
      }
    });
  }

  return Promise.resolve(null);
}

module.exports = {
  createNotification,
  listNotificationsForUser,
  maybeNotifyForRankingShift
};
