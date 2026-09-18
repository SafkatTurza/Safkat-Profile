const { kv, findCredentials } = require('./_kv');

// Setup diagnostic: reports whether the Redis integration and admin password
// are wired up, and whether a write actually round-trips. Saving content and
// uploading media both end at kv().set(), so this is the one URL that says
// which half is broken.
//
// ponytail: the connection error is returned to anyone who asks. It names a
// host and an errno, never a credential — but delete this file once the
// problem is diagnosed rather than leaving it live forever.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const report = {
    redisConfigured: Boolean(findCredentials()),
    redisReachable: false,
    adminPasswordSet: Boolean(process.env.ADMIN_PASSWORD),
    error: null,
  };

  if (report.redisConfigured) {
    try {
      await kv().set('site:health', Date.now());
      await kv().get('site:health');
      report.redisReachable = true;
    } catch (e) {
      report.error = e.message;
    }
  }

  report.ready = report.redisConfigured && report.redisReachable && report.adminPasswordSet;

  return res.status(report.ready ? 200 : 503).json(report);
};
