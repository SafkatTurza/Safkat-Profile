const { kv, findCredentials } = require('./_kv');

// Setup diagnostic: reports whether the Redis integration and admin password
// are wired up, without exposing any secret values.
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
