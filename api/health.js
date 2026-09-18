const { kv, findCredentials, explain } = require('./_kv');

// Setup diagnostic: reports whether the Redis integration and admin password
// are wired up, and whether a write actually round-trips. Saving content and
// uploading media both end at kv().set(), so this is the one URL that says
// which half is broken — and it answers without signing in, which matters
// when the thing that is broken is the sign-in.
//
// Upstash deletes idle databases on the free plan, so this failure recurs by
// design rather than as a one-off. That is why this stays rather than being
// deleted after the first diagnosis.
//
// It reports booleans and explain()'s fixed wording only. No hostname, no
// errno, no credential: whoever asks learns that the site is misconfigured,
// which the admin panel already tells them, and nothing more.
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
      report.error = explain(e);
    }
  }

  report.ready = report.redisConfigured && report.redisReachable && report.adminPasswordSet;

  return res.status(report.ready ? 200 : 503).json(report);
};
