const { timingSafeEqual } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.ADMIN_PASSWORD;
  const { password } = req.body || {};

  if (!expected || typeof password !== 'string' || !password || !timingSafeEqual(password, expected)) {
    return res.status(401).json({ ok: false });
  }

  return res.status(200).json({ ok: true });
};
