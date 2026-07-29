const { kv } = require('./_kv');
const { isAuthorized } = require('./_auth');

const KEY = 'site:status';
const DEFAULT_STATUS = {
  available: true,
  text: 'Open to remote project coordination & operations roles',
  updatedAt: null,
};

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const status = (await kv().get(KEY)) || DEFAULT_STATUS;
      return res.status(200).json(status);
    } catch (e) {
      return res.status(200).json(DEFAULT_STATUS);
    }
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { available, text } = req.body || {};
    if (typeof available !== 'boolean' || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Expected { available: boolean, text: string }' });
    }
    const status = { available, text: text.trim().slice(0, 160), updatedAt: Date.now() };
    try {
      await kv().set(KEY, status);
    } catch (e) {
      return res.status(503).json({ error: e.message });
    }
    return res.status(200).json(status);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
