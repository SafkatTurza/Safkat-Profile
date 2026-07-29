const { kv } = require('./_kv');
const { isAuthorized } = require('./_auth');

const PREFIX = 'site:media:';
const ALLOWED = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
// Upstash's free plan caps a single command at 1 MB. Base64 inflates by ~33%,
// so keep the decoded payload comfortably under that.
const MAX_BYTES = 700 * 1024;

function newId() {
  let s = '';
  for (let i = 0; i < 20; i++) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const id = String((req.query && req.query.id) || '');
    if (!/^[a-z0-9]{1,40}$/.test(id)) {
      return res.status(400).json({ error: 'Bad id' });
    }
    let rec;
    try {
      rec = await kv().get(PREFIX + id);
    } catch (e) {
      return res.status(503).json({ error: e.message });
    }
    if (!rec || !rec.b64) return res.status(404).json({ error: 'Not found' });

    // Ids are random and content never changes under one, so this is safe to
    // cache forever on Vercel's CDN and in the browser.
    res.setHeader('Content-Type', rec.mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(Buffer.from(rec.b64, 'base64'));
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

    const data = (req.body || {}).data;
    if (typeof data !== 'string') {
      return res.status(400).json({ error: 'Expected { data: "data:<mime>;base64,<...>" }' });
    }
    const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(data);
    if (!m) return res.status(400).json({ error: 'Expected a base64 data URL' });

    const mime = m[1].toLowerCase();
    if (!ALLOWED.includes(mime)) {
      return res.status(415).json({ error: `Unsupported file type: ${mime}` });
    }

    let buf;
    try {
      buf = Buffer.from(m[2], 'base64');
    } catch (e) {
      return res.status(400).json({ error: 'Could not decode the file' });
    }
    if (!buf.length) return res.status(400).json({ error: 'Empty file' });
    if (buf.length > MAX_BYTES) {
      return res.status(413).json({
        error: `File is ${Math.round(buf.length / 1024)} KB — the limit is ${MAX_BYTES / 1024} KB.`,
      });
    }

    const id = newId();
    try {
      await kv().set(PREFIX + id, { mime, b64: buf.toString('base64') });
    } catch (e) {
      return res.status(503).json({ error: e.message });
    }
    return res.status(200).json({ id, url: `/api/media?id=${id}`, bytes: buf.length });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
