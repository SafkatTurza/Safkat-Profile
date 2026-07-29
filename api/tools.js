const { kv } = require('./_kv');
const { isAuthorized } = require('./_auth');

const KEY = 'site:tools';
const MAX_TOOLS = 50;

function sanitizeTool(t) {
  return {
    id: String(t.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: String(t.name || '').trim().slice(0, 80),
    description: String(t.description || '').trim().slice(0, 220),
    url: String(t.url || '').trim().slice(0, 300),
    tag: String(t.tag || '').trim().slice(0, 40),
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const tools = (await kv().get(KEY)) || [];
      return res.status(200).json(tools);
    } catch (e) {
      return res.status(200).json([]);
    }
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Expected an array of tools' });
    }
    const tools = req.body
      .slice(0, MAX_TOOLS)
      .map(sanitizeTool)
      .filter((t) => t.name && t.url);
    try {
      await kv().set(KEY, tools);
    } catch (e) {
      return res.status(503).json({ error: e.message });
    }
    return res.status(200).json(tools);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
