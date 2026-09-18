/* ===========================================================================
   Standalone export.

   Turns the published site into a single .html file that opens from a
   double-click — no server, no API, no separate image files. Everything
   happens in the browser against the live site, so what gets exported is
   always exactly what visitors currently see.

   The page itself needs no special build: index.html already looks for an
   inlined <script id="snapshot"> and reads from it instead of calling the
   API when one is present.
   =========================================================================== */

import { el, icon, toast, readDataUrl } from './ui.js';

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap';

/* The page is English-only, so the Cyrillic/Greek/Vietnamese cuts Google
   serves alongside latin would be several hundred unused kilobytes. */
const KEEP_SUBSET = /^latin(-ext)?$/;

/* Local files the page can reference. Matched in both the markup and the
   content JSON, so images set in the admin are embedded too. */
const ASSET_RE = /(?:\.?\/)?assets\/[A-Za-z0-9._\-/]+\.(?:png|jpe?g|webp|gif|svg|avif|ico|pdf)/gi;
const GSTATIC_RE = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;

const fmtBytes = n =>
  n < 1024 * 1024 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(2) + ' MB';

/* ------------------------------------------------------------------ fetch */
async function getText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

async function getJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch (err) { return null; }
}

async function toDataUri(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return readDataUrl(await res.blob());
}

/** One pass over the text, so a freshly inserted data URI is never rescanned
    and `/assets/x.png` is never half-replaced via its `assets/x.png` tail. */
const swapAssets = (text, map) => text.replace(ASSET_RE, m => map.get(m) || m);

/* ------------------------------------------------------------------ fonts */
/** A <style> body with the web fonts embedded. Throws when Google cannot be
    reached, and the caller then leaves the original <link> in place so the
    file loads its fonts online exactly like the site does. */
async function inlineFonts() {
  // css2 emits one @font-face per weight per subset, each preceded by a
  // /* subset */ comment naming it.
  const css = await getText(FONT_CSS);
  const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
    .filter(m => KEEP_SUBSET.test(m[1])).map(m => m[2]);
  if (!faces.length) throw new Error('No @font-face rules found');

  const urls = [...new Set([...faces.join('\n').matchAll(GSTATIC_RE)].map(m => m[1]))];
  const files = new Map(await Promise.all(urls.map(async u => [u, await toDataUri(u)])));

  return faces.map(face =>
    face.replace(GSTATIC_RE, (whole, url) => `url(${files.get(url) || url})`)).join('\n');
}

/* ------------------------------------------------------------------- build */
async function buildStandalone({ embedFonts = true, onStep = () => {} } = {}) {
  const notes = [];

  onStep('Reading the published page…');
  let html = await getText('/index.html?standalone=' + Date.now());

  onStep('Collecting your content…');
  const [content, tools, status] = await Promise.all([
    getJson('/api/content'), getJson('/api/tools'), getJson('/api/status'),
  ]);
  if (!content) notes.push('Content could not be read, so the file falls back to the built-in text.');

  let snapshot = JSON.stringify({ content, tools: Array.isArray(tools) ? tools : [], status });

  onStep('Embedding images…');
  const wanted = new Set((html.match(ASSET_RE) || []).concat(snapshot.match(ASSET_RE) || []));
  const map = new Map();
  let missing = 0;
  for (const ref of wanted) {
    try { map.set(ref, await toDataUri('/' + ref.replace(/^[./]+/, ''))); }
    catch (err) { missing++; }   // one unreachable image is no reason to lose the export
  }
  if (missing) notes.push(`${missing} image${missing === 1 ? '' : 's'} could not be embedded and will stay online.`);
  html = swapAssets(html, map);
  snapshot = swapAssets(snapshot, map);

  if (embedFonts) {
    onStep('Embedding fonts…');
    try {
      const faces = await inlineFonts();
      html = html
        .replace(/[ \t]*<link rel="preconnect"[^>]*>\s*/g, '')
        // function replacements throughout: `$&` and friends in the inserted
        // text are literal here, not substitution patterns
        .replace(/[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/[^"]*"[^>]*>/,
          () => `<style>\n${faces}\n</style>`);
    } catch (err) {
      notes.push('Fonts could not be embedded, so the file loads them from Google when online.');
    }
  }

  onStep('Assembling the file…');
  // Inert JSON, but it still lives inside a script element: anything that could
  // close the tag early has to be escaped.
  html = html.replace('<script>', () =>
    `<script type="application/json" id="snapshot">${snapshot.replace(/</g, '\\u003c')}</script>\n<script>`);

  const slug = String((content && content.hero && content.hero.name) || '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile';
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return { blob, name: `${slug}-profile.html`, size: blob.size, notes };
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  el('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ------------------------------------------------------------------- panel */
const POINTS = [
  'The page exactly as it is published, including your photo and certificates.',
  'Works offline — no server, no login, nothing to install.',
  'A fixed snapshot: later edits in this panel will not change a copy already sent.',
];

export function exportPanel({ unsaved }) {
  const wrap = el('div.panel');
  wrap.append(el('div.panel-head', {},
    el('h1', { text: 'Share a copy' }),
    el('p', { text: 'Download your whole site as one HTML file you can email, attach or drop in a shared drive. It opens in any browser with no internet needed.' })));

  const card = el('div.card');
  card.append(el('div.card-head', {}, el('h2', { text: 'Standalone HTML file' })));

  const fontsCb = el('input', { type: 'checkbox', checked: true, 'aria-label': 'Include fonts in the file' });
  card.append(el('div.switch-row', {},
    el('label.switch', {}, fontsCb, el('span.track'), el('span.thumb')),
    el('div.txt', {},
      el('b', { text: 'Include the fonts' }),
      el('span', { text: 'Keeps the typography identical offline. Turn it off for a much smaller file that looks right whenever there is internet.' }))));

  if (unsaved) card.append(el('div.f-hint.share-gap', {}, icon('warn'),
    el('span', { text: ' You have unsaved changes. The copy is taken from your published site, so save first if you want them included.' })));

  const btn = el('button.btn.btn-primary.share-gap', { type: 'button' },
    icon('down'), el('span', { text: 'Build the file' }));
  const log = el('div.f-hint.share-gap', { hidden: true });
  const say = (name, text) => { log.innerHTML = ''; log.append(icon(name), el('span', { text: ' ' + text })); };

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    fontsCb.disabled = true;
    log.hidden = false;
    try {
      const out = await buildStandalone({ embedFonts: fontsCb.checked, onStep: msg => say('info', msg) });
      download(out.blob, out.name);
      say('ok', `${out.name} — ${fmtBytes(out.size)}. Check your downloads.`);
      out.notes.forEach(n => log.append(el('div.share-note', { text: n })));
      toast('Your standalone file is ready.', 'ok');
    } catch (err) {
      say('warn', err.message || 'The file could not be built.');
      toast('Could not build the file.', 'warn');
    } finally {
      btn.disabled = false;
      fontsCb.disabled = false;
    }
  });

  card.append(btn, log);
  wrap.append(card, el('div.card', {},
    el('div.card-head', {}, el('h2', { text: 'What your team gets' })),
    el('ul.share-points', {}, POINTS.map(t => el('li', { text: t })))));

  return wrap;
}
