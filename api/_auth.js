const { timingSafeEqual: constantTimeCompare } = require('crypto');

function timingSafeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && constantTimeCompare(x, y);
}

function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = req.headers['x-admin-key'];
  if (typeof provided !== 'string' || !provided) return false;
  return timingSafeEqual(provided, expected);
}

module.exports = { isAuthorized, timingSafeEqual };
