const { kv } = require('./_kv');
const { isAuthorized } = require('./_auth');
const { DEFAULT_CONTENT } = require('./_defaults');

const KEY = 'site:content';

const MAX_ITEMS = 40; // per list (jobs, skills, certificates, …)
const MAX_SHORT = 300; // headings, names, labels, urls
const MAX_LONG = 2000; // paragraphs and descriptions

/** Fields rendered as HTML so a few inline tags survive; everything else is plain text. */
const RICH_FIELDS = new Set(['lead', 'body', 'summary', 'description', 'quote']);
const ALLOWED_TAGS = /&lt;(\/?)(b|strong|i|em|br)\s*\/?&gt;/gi;

function plain(v, max) {
  return String(v == null ? '' : v)
    // drop control characters but keep newlines and tabs
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * Escape everything, then let a fixed set of attribute-free inline tags back
 * through. Only the authenticated admin can write these, but the page injects
 * them with innerHTML, so they still get scrubbed on the way in.
 */
function rich(v, max) {
  return plain(v, max)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(ALLOWED_TAGS, '<$1$2>');
}

/**
 * Walk the incoming value against the shape of the default, keeping only keys
 * that exist in the default and only when the types line up. Anything unknown,
 * mistyped, or oversized is dropped rather than trusted.
 */
function sanitize(value, template, key) {
  if (typeof template === 'boolean') {
    return typeof value === 'boolean' ? value : template;
  }

  if (typeof template === 'string') {
    if (typeof value !== 'string') return template;
    const max = RICH_FIELDS.has(key) ? MAX_LONG : MAX_SHORT;
    return RICH_FIELDS.has(key) ? rich(value, max) : plain(value, max);
  }

  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return template;
    // An empty default array carries no shape, so fall back to the first
    // incoming entry's own type to decide how to clean each element.
    const shape = template.length ? template[0] : inferShape(value[0]);
    return value
      .slice(0, MAX_ITEMS)
      .map((item) => sanitize(item, shape, key))
      .filter((item) => (typeof item === 'string' ? item.length > 0 : item != null));
  }

  if (template && typeof template === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return template;
    const out = {};
    for (const k of Object.keys(template)) {
      out[k] = sanitize(value[k], template[k], k);
    }
    return out;
  }

  return template;
}

/** Shape for lists the defaults leave empty (education, projects, …). */
function inferShape(sample) {
  if (typeof sample === 'string') return '';
  if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
    const shape = {};
    for (const k of Object.keys(sample)) {
      shape[k] = Array.isArray(sample[k]) ? [''] : typeof sample[k] === 'boolean' ? false : '';
    }
    return shape;
  }
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const saved = await kv().get(KEY);
      if (!saved) return res.status(200).json(DEFAULT_CONTENT);
      // Run saved content through the same sanitizer so a document written by
      // an older version of the schema still comes back complete.
      return res.status(200).json(sanitize(saved, DEFAULT_CONTENT));
    } catch (e) {
      return res.status(200).json(DEFAULT_CONTENT);
    }
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Expected a content object' });
    }

    const clean = sanitize(body, DEFAULT_CONTENT);

    try {
      await kv().set(KEY, clean);
    } catch (e) {
      return res.status(503).json({ error: e.message });
    }
    return res.status(200).json(clean);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
