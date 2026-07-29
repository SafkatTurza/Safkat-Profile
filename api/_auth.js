function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = req.headers['x-admin-key'];
  if (typeof provided !== 'string' || !provided) return false;
  return timingSafeEqual(provided, expected);
}

module.exports = { isAuthorized, timingSafeEqual };
