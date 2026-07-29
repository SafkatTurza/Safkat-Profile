/* ===========================================================================
   Validation runs against the data, not the DOM, so a problem in a panel you
   have never opened is still caught before publishing.
   =========================================================================== */

import { SCHEMA } from './schema.js';
import { TOOL_FIELDS } from './fields.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const HTTP = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;
const LINK = /^(https?:\/\/[^\s.]+\.[^\s]{2,}|mailto:[^\s@]+@[^\s@]+\.[a-z]{2,}|tel:\+?[\d\s().-]{5,}|\/[^\s]*)$/i;

const dig = (o, p) => String(p).split('.').reduce((x, k) => (x == null ? x : x[k]), o);

/** Problems for one scalar field. */
function checkScalar(f, path, value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return f.req ? [{ path, msg: `${f.l} is required.` }] : [];
  const out = [];
  if (f.max && v.length > f.max) out.push({ path, msg: `${f.l} is ${v.length} characters — the limit is ${f.max}.` });
  if (f.as === 'email' && !EMAIL.test(v)) out.push({ path, msg: 'That does not look like an email address.' });
  if (f.as === 'url' && !HTTP.test(v)) out.push({ path, msg: 'Enter a full URL starting with https://' });
  if (f.as === 'link' && !LINK.test(v)) out.push({ path, msg: 'Use https://…, mailto:…, tel:… or a path starting with /' });
  return out;
}

/** Problems for one field of any type, including its nested contents. */
function checkField(f, path, root) {
  const value = dig(root, path);
  const out = [];

  if (f.t === 'strings') {
    const arr = Array.isArray(value) ? value : [];
    const filled = arr.filter(s => String(s || '').trim());
    if (f.req && !filled.length) return [{ path, msg: `Add at least one ${(f.item || 'item').toLowerCase()}.` }];
    if (arr.length !== filled.length) out.push({ path, msg: `Remove the empty ${(f.item || 'item').toLowerCase()} row${arr.length - filled.length > 1 ? 's' : ''}.` });
    if (f.max) {
      const over = filled.find(s => s.trim().length > f.max);
      if (over) out.push({ path, msg: `"${over.slice(0, 24)}…" is longer than ${f.max} characters.` });
    }
    if (f.uniq) {
      const seen = new Set();
      const dup = filled.find(s => { const k = s.trim().toLowerCase(); if (seen.has(k)) return true; seen.add(k); return false; });
      if (dup) out.push({ path, msg: `"${dup}" is listed twice.` });
    }
    return out;
  }

  if (f.t === 'images') {
    const arr = Array.isArray(value) ? value : [];
    if (f.req && !arr.length) out.push({ path, msg: 'Add at least one image.' });
    return out;
  }

  if (f.t === 'list' || f.t === 'tools') {
    const subFields = f.t === 'tools' ? TOOL_FIELDS : f.fields;
    const arr = Array.isArray(value) ? value : [];
    arr.forEach((item, i) => {
      subFields.forEach(sub => out.push(...checkField(sub, `${path}.${i}.${sub.k}`, root)));
    });
    // duplicate prevention across siblings, on whichever key identifies them
    const key = (f.sum && f.sum.t) || (f.t === 'tools' ? 'name' : null);
    if (key) {
      const seen = new Map();
      arr.forEach((item, i) => {
        const k = String((item && item[key]) || '').trim().toLowerCase();
        if (!k) return;
        if (seen.has(k)) out.push({ path: `${path}.${i}.${key}`, msg: `Already used by ${(f.item || 'item').toLowerCase()} ${seen.get(k) + 1}.` });
        else seen.set(k, i);
      });
    }
    return out;
  }

  return checkScalar(f, path, value);
}

/**
 * @returns {Array<{panel:string, path:string, msg:string}>}
 * Sections that are switched off are skipped — hidden content cannot break
 * the live page, and blocking a save on it would be infuriating.
 */
export function validateAll(root) {
  const problems = [];
  for (const panel of SCHEMA) {
    if (!panel.fields) continue;
    // A hidden section cannot break the live page, so its content is not a
    // reason to block a save — but the AI tool cards are stored separately and
    // are always published, so they are always checked.
    const off = panel.toggle && root[panel.id] && root[panel.id].enabled === false;
    for (const f of panel.fields) {
      if (off && f.t !== 'tools') continue;
      for (const p of checkField(f, f.p, root)) problems.push({ panel: panel.id, ...p });
    }
  }
  return problems;
}

/** Re-check a single path (and anything nested under it) after an edit. */
export function validatePath(root, path) {
  return validateAll(root).filter(p => p.path === path || p.path.startsWith(path + '.'));
}
