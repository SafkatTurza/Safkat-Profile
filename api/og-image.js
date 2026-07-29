const { kv } = require('./_kv');

const FALLBACK = '/assets/safkat-portrait.jpg';

// index.html points og:image at this URL permanently, so the picture used for
// LinkedIn/WhatsApp/Slack previews can be swapped from the admin panel without
// touching the HTML. Crawlers follow the redirect.
module.exports = async function handler(req, res) {
  let target = FALLBACK;
  try {
    const content = await kv().get('site:content');
    const custom = content && content.meta && content.meta.ogImage;
    if (custom) target = custom;
  } catch (e) {
    // fall through to the bundled portrait
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const absolute = /^https?:\/\//i.test(target) ? target : `${proto}://${host}${target.startsWith('/') ? '' : '/'}${target}`;

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Location', absolute);
  return res.status(302).end();
};
