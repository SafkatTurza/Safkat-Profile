/* ===========================================================================
   Admin application: auth, state, routing, saving.

   State lives in three stores because the API does — content, tool cards and
   availability — but the person editing sees one Save button and one save
   state. Only the stores that actually changed are sent.
   =========================================================================== */

import { SCHEMA, GROUPS, SECTION_ORDER, ITEM_PATH, PANEL_BY_ID } from './schema.js';
import { $, el, icon, toast, confirmDialog } from './ui.js';
import { field } from './fields.js';
import { validateAll } from './validate.js';
import { exportPanel } from './export.js';

const DRAFT_KEY = 'st-admin-draft';
const KEY_KEY = 'st-admin-key';

/* -------------------------------------------------------------- utilities */
const dig = (o, p) => String(p).split('.').reduce((x, k) => (x == null ? x : x[k]), o);

function setPath(root, path, value) {
  const keys = String(path).split('.');
  const last = keys.pop();
  let cur = root;
  for (const k of keys) {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(k) ? [] : {};
    cur = cur[k];
  }
  cur[last] = value;
}

const snap = v => JSON.stringify(v);

/* ------------------------------------------------------------------- state */
const state = { content: null, tools: [], status: null };
const base = { content: '', tools: '', status: '' };

const openLists = new Set();      // which repeatable rows are expanded
const registry = new Map();       // path -> field handle, for the live panel
let current = 'overview';
let saving = false;
let draftTimer = null;

/** The content document doubles as the root for tool paths, so one set of
    path helpers covers both stores. Non-enumerable, so it never serialises. */
function linkTools() {
  Object.defineProperty(state.content, '__tools', {
    get: () => state.tools,
    set: v => { state.tools = v; },
    enumerable: false, configurable: true,
  });
}

const model = () => state.content;
const get = p => dig(model(), p);
const set = (p, v) => { setPath(model(), p, v); markDirty(); };

function dirtyStores() {
  const out = [];
  if (snap(state.content) !== base.content) out.push('content');
  if (snap(state.tools) !== base.tools) out.push('tools');
  if (snap(state.status) !== base.status) out.push('status');
  return out;
}

/* --------------------------------------------------------------- transport */
const adminKey = () => sessionStorage.getItem(KEY_KEY) || '';

async function apiGet(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error('Request failed: ' + res.status);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) { signOut(); throw new Error('Session expired — please sign in again.'); }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed: ' + res.status);
  }
  return res.json();
}

/* ------------------------------------------------------------- save state */
function setSaveState(s, label) {
  $('#saveState').dataset.s = s;
  $('#saveLabel').textContent = label;
  // whether Save can be pressed follows the data, not the label, so the green
  // "Saved" confirmation never leaves a live button behind
  $('#saveBtn').disabled = s === 'saving' || !state.content || !dirtyStores().length;
  $('#revertBtn').disabled = s === 'saving' || !state.content || !dirtyStores().length;
}

function markDirty() {
  const n = dirtyStores().length;
  setSaveState(n ? 'dirty' : 'clean', n ? 'Unsaved changes' : 'All changes saved');
  clearTimeout(draftTimer);
  draftTimer = setTimeout(writeDraft, 700);
  renderNav();
}

function writeDraft() {
  try {
    if (!dirtyStores().length) { localStorage.removeItem(DRAFT_KEY); return; }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      at: Date.now(), content: state.content, tools: state.tools, status: state.status,
    }));
  } catch (e) { /* private mode or quota — the draft is a convenience, not a promise */ }
}

function clearDraft() {
  clearTimeout(draftTimer);
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
}

/* ----------------------------------------------------------------- errors */
function paintErrors(problems) {
  const byPath = new Map();
  for (const p of problems) if (!byPath.has(p.path)) byPath.set(p.path, p.msg);
  for (const [path, handle] of registry) handle.show(byPath.get(path) || '');
  // an item card highlights when any field inside it is wrong
  for (const node of document.querySelectorAll('.item')) {
    node.classList.toggle('bad', !!node.querySelector('.f-err:not([hidden])'));
  }
}

const ctx = {
  get, set,
  dirty: markDirty,
  post: apiPost,
  openLists,
  register: (path, handle) => registry.set(path, handle),
  revalidate: () => paintErrors(validateAll(model())),
};

/* -------------------------------------------------------------- navigation */
function countFor(id) {
  if (id === 'aitools') return state.tools.length;
  const p = ITEM_PATH[id];
  if (!p) return null;
  const v = get(p);
  return Array.isArray(v) ? v.length : 0;
}

const isOn = id => !(dig(model(), id + '.enabled') === false);

function renderNav() {
  const nav = $('#nav');
  const problems = validateAll(model());
  const bad = new Set(problems.map(p => p.panel));
  nav.innerHTML = '';

  for (const group of GROUPS) {
    const panels = SCHEMA.filter(p => p.group === group);
    if (!panels.length) continue;
    nav.append(el('div.sb-group', { text: group }));
    for (const p of panels) {
      const n = countFor(p.id);
      const item = el('button.nav-item', {
        type: 'button', 'data-panel': p.id,
        'aria-current': p.id === current ? 'true' : 'false',
        onclick: () => { go(p.id); closeSidebar(); },
      }, icon(p.icon), el('span.t', { text: p.title }));

      if (bad.has(p.id)) item.append(el('span.nav-warn', { title: 'Needs attention' }));
      else if (n != null) item.append(el('span.nav-count', { text: String(n) }));
      if (p.toggle && !isOn(p.id)) item.append(el('span.nav-off', { title: 'Hidden on your site' }));
      nav.append(item);
    }
  }
}

function go(id, opts = {}) {
  if (!PANEL_BY_ID[id]) id = 'overview';
  current = id;
  registry.clear();
  const host = $('#panelHost');
  host.innerHTML = '';
  host.append(buildPanel(PANEL_BY_ID[id]));
  $('#tbTitle').textContent = PANEL_BY_ID[id].title;
  history.replaceState(null, '', '#' + id);
  renderNav();
  paintErrors(validateAll(model()));
  if (!opts.keepScroll) $('#panelScroll').scrollTo({ top: 0 });
}

/* ------------------------------------------------------------ panel bodies */
function sectionToggleCard(p) {
  const on = isOn(p.id);
  const cb = el('input', { type: 'checkbox', checked: on, 'aria-label': 'Show this section on the site' });
  const card = el('div.card');
  const warn = el('div.f-hint', { hidden: true });

  const refreshWarn = () => {
    const n = countFor(p.id);
    const show = isOn(p.id) && n === 0;
    warn.hidden = !show;
    if (show) warn.textContent = `This section is switched on but has nothing in it yet, so it still will not appear on your site.`;
  };

  cb.addEventListener('change', () => {
    set(p.id + '.enabled', cb.checked);
    refreshWarn();
    toast(cb.checked ? `${p.title} will be shown — save to publish.` : `${p.title} will be hidden — save to publish.`, 'info', 2600);
  });

  card.append(el('div.switch-row', {},
    el('label.switch', {}, cb, el('span.track'), el('span.thumb')),
    el('div.txt', {},
      el('b', { text: 'Show this section' }),
      el('span', { text: 'Sections hide themselves automatically while they are empty.' }))));
  card.append(warn);
  refreshWarn();

  card.append(el('div.fields', { style: { marginTop: '18px' } },
    field({ l: 'Menu label', t: 'text', max: 30, half: 1, h: 'How this section is named in the navigation.' },
      p.id + '.navLabel', ctx)));
  return card;
}

function buildPanel(p) {
  if (p.custom === 'overview') return overviewPanel();
  if (p.custom === 'availability') return availabilityPanel(p);
  if (p.custom === 'export') return exportPanel({ hasUnsaved: () => dirtyStores().length > 0 });

  const wrap = el('div.panel');
  wrap.append(el('div.panel-head', {},
    el('h1', { text: p.title }),
    p.hint ? el('p', { text: p.hint }) : null));

  if (p.toggle) wrap.append(sectionToggleCard(p));

  // scalar fields share a settings card; each repeatable gets its own card so
  // long lists never bury the settings above them
  const scalars = el('div.fields');
  let hasScalars = false;
  const cards = [];

  for (const f of p.fields) {
    if (['list', 'strings', 'images', 'tools'].includes(f.t)) {
      const count = (Array.isArray(get(f.p)) ? get(f.p) : []).length;
      const card = el('div.card');
      card.append(el('div.card-head', {},
        el('h2', { text: f.l }),
        el('span.badge', { text: `${count} ${count === 1 ? (f.item || 'item').toLowerCase() : (f.item || 'item').toLowerCase() + 's'}` })));
      card.append(field({ ...f, noLabel: 1 }, f.p, ctx));
      cards.push(card);
    } else {
      hasScalars = true;
      scalars.append(field(f, f.p, ctx));
    }
  }

  if (hasScalars) {
    const card = el('div.card');
    card.append(el('div.card-head', {}, el('h2', { text: p.toggle ? 'Section content' : 'Details' })));
    card.append(scalars);
    wrap.append(card);
  }
  cards.forEach(c => wrap.append(c));
  return wrap;
}

/* ---------------------------------------------------------- availability */
function availabilityPanel(p) {
  const wrap = el('div.panel');
  wrap.append(el('div.panel-head', {}, el('h1', { text: p.title }), el('p', { text: p.hint })));

  const cb = el('input', { type: 'checkbox', checked: state.status.available !== false, 'aria-label': 'Open to work' });
  const label = el('b');
  const text = el('textarea', {
    id: 'availText', rows: 2, maxlength: 160, value: state.status.text || '',
    placeholder: 'e.g. Open to remote project coordination & operations roles',
  });
  const count = el('span.f-count');
  const errSlot = el('div.f-err', { hidden: true });
  const fieldWrap = el('div.field.wide');

  const refresh = () => {
    label.textContent = cb.checked ? 'Open to work' : 'Not currently available';
    count.textContent = `${text.value.length}/160`;
    const bad = !text.value.trim();
    fieldWrap.classList.toggle('bad', bad);
    errSlot.hidden = !bad;
    if (bad) { errSlot.innerHTML = ''; errSlot.append(icon('warn'), el('span', { text: 'Status text is required.' })); }
  };

  cb.addEventListener('change', () => { state.status.available = cb.checked; refresh(); markDirty(); });
  text.addEventListener('input', () => { state.status.text = text.value; refresh(); markDirty(); });

  fieldWrap.append(
    el('label.f-label', { for: 'availText' }, el('span', { text: 'Status text' }), el('span.f-req', { text: '*' }), count),
    text,
    el('div.f-hint', { text: 'Shown inside the pill next to the coloured dot.' }),
    errSlot);

  const card = el('div.card');
  card.append(el('div.switch-row', {},
    el('label.switch', {}, cb, el('span.track'), el('span.thumb')),
    el('div.txt', {}, label, el('span', { text: 'Turn this off and the pill turns grey with your message.' }))));
  card.append(el('div.fields', { style: { marginTop: '18px' } }, fieldWrap));
  refresh();
  wrap.append(card);
  return wrap;
}

/* -------------------------------------------------------------- overview */
function overviewPanel() {
  const wrap = el('div.panel');
  const live = SECTION_ORDER.filter(id => isOn(id) && countFor(id) !== 0);
  const problems = validateAll(model());

  wrap.append(el('div.panel-head', {},
    el('h1', { text: 'Overview' }),
    el('p', { text: 'Everything on your site at a glance. Pick a section on the left to edit it.' })));

  if (problems.length) {
    const card = el('div.card', { style: { borderColor: 'var(--danger)' } });
    card.append(el('div.card-head', {},
      el('h2', { text: `${problems.length} thing${problems.length > 1 ? 's need' : ' needs'} attention` }),
      el('span.badge.warn', { text: 'Blocks saving' })));
    const rows = el('div.sec-rows');
    for (const p of problems.slice(0, 8)) {
      rows.append(el('button.sec-row', { type: 'button', onclick: () => go(p.panel) },
        icon('warn'),
        el('span.t', { text: PANEL_BY_ID[p.panel].title }, el('small', { text: p.msg })),
        el('span.go', {}, icon('chev'))));
    }
    card.append(rows);
    wrap.append(card);
  }

  wrap.append(el('div.ov-grid', {},
    el('div.ov-tile', {},
      el('div.k', { text: 'Availability' }),
      el('div.v', { text: state.status.available !== false ? 'Open' : 'Closed' }),
      el('div.m', { text: state.status.text || 'No status text set' })),
    el('div.ov-tile', {},
      el('div.k', { text: 'Live sections' }),
      el('div.v', { text: `${live.length}/${SECTION_ORDER.length}` }),
      el('div.m', { text: `${SECTION_ORDER.length - live.length} hidden` })),
    el('div.ov-tile', {},
      el('div.k', { text: 'AI tool cards' }),
      el('div.v', { text: String(state.tools.length) }),
      el('div.m', { text: state.tools.length ? 'Published on your homepage' : 'Section stays hidden' }))));

  const card = el('div.card');
  card.append(el('div.card-head', {},
    el('h2', { text: 'Page sections' }),
    el('span.badge', { text: 'In page order' })));

  const rows = el('div.sec-rows');
  let n = 0;
  for (const id of SECTION_ORDER) {
    const panel = PANEL_BY_ID[id];
    if (!panel) continue;
    const count = countFor(id);
    const on = isOn(id);
    const showing = on && count !== 0;
    if (showing) n++;
    rows.append(el('button.sec-row', { type: 'button', onclick: () => go(id) },
      el('span.n', { text: showing ? String(n).padStart(2, '0') : '—' }),
      el('span.t', { text: panel.title },
        el('small', { text: count == null ? 'Always shown' : `${count} ${count === 1 ? 'item' : 'items'}` })),
      el('span.badge', {
        class: showing ? 'live' : 'off',
        text: showing ? 'Live' : on ? 'Empty' : 'Hidden',
      }),
      el('span.go', {}, icon('chev'))));
  }
  card.append(rows);
  wrap.append(card);
  return wrap;
}

/* ------------------------------------------------------------------ saving */
async function saveAll() {
  if (saving) return;
  const problems = validateAll(model());
  if (problems.length) {
    paintErrors(problems);
    const first = problems[0];
    if (first.panel !== current) go(first.panel);
    else paintErrors(problems);
    const handle = registry.get(first.path);
    if (handle) { handle.focus(); handle.wrap.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    setSaveState('error', `${problems.length} problem${problems.length > 1 ? 's' : ''}`);
    toast(problems.length === 1 ? first.msg : `${problems.length} fields need fixing before you can publish.`, 'err', 5000);
    return;
  }

  const stores = dirtyStores();
  if (!stores.length) { toast('Nothing to save.', 'info', 2000); return; }

  saving = true;
  setSaveState('saving', 'Saving…');
  try {
    if (stores.includes('status')) {
      await apiPost('/api/status', { available: state.status.available !== false, text: state.status.text });
      base.status = snap(state.status);
    }
    if (stores.includes('tools')) {
      state.tools = await apiPost('/api/tools', state.tools);
      base.tools = snap(state.tools);
    }
    if (stores.includes('content')) {
      const saved = await apiPost('/api/content', state.content);
      state.content = saved;
      linkTools();
      base.content = snap(state.content);
    }
    clearDraft();
    setSaveState('saved', 'All changes saved');
    toast('Saved — live on your site now.', 'ok');
    go(current, { keepScroll: true });
    setTimeout(() => { if (!dirtyStores().length) setSaveState('clean', 'All changes saved'); }, 2500);
  } catch (err) {
    setSaveState('error', 'Save failed');
    toast(err.message, 'err', 7000);
  } finally {
    saving = false;
  }
}

async function revertAll() {
  if (!dirtyStores().length) { toast('Nothing to revert.', 'info', 2000); return; }
  if (!await confirmDialog({
    title: 'Discard your changes?',
    body: 'Everything goes back to the last published version. This cannot be undone.',
    confirm: 'Discard changes', danger: true,
  })) return;
  state.content = JSON.parse(base.content);
  state.tools = JSON.parse(base.tools);
  state.status = JSON.parse(base.status);
  linkTools();
  clearDraft();
  setSaveState('clean', 'All changes saved');
  go(current);
  toast('Changes discarded.', 'info');
}

/* -------------------------------------------------------------- data load */
async function loadAll() {
  const [content, tools, status] = await Promise.all([
    apiGet('/api/content'),
    apiGet('/api/tools').catch(() => []),
    apiGet('/api/status').catch(() => ({ available: true, text: '' })),
  ]);
  state.content = content;
  state.tools = Array.isArray(tools) ? tools : [];
  state.status = status && typeof status === 'object' ? status : { available: true, text: '' };
  linkTools();
  base.content = snap(state.content);
  base.tools = snap(state.tools);
  base.status = snap(state.status);

  await maybeRestoreDraft();

  setSaveState(dirtyStores().length ? 'dirty' : 'clean', dirtyStores().length ? 'Unsaved changes' : 'All changes saved');
  go(location.hash.slice(1) || 'overview');
}

async function maybeRestoreDraft() {
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (!draft || !draft.content) return;
  const differs = snap(draft.content) !== base.content
    || snap(draft.tools || []) !== base.tools
    || snap(draft.status || {}) !== base.status;
  if (!differs) { clearDraft(); return; }

  const when = new Date(draft.at || Date.now());
  const ok = await confirmDialog({
    title: 'Restore unsaved changes?',
    body: `You left edits unpublished on ${when.toLocaleDateString()} at ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Restore them, or start again from the published version?`,
    confirm: 'Restore my edits',
  });
  if (ok) {
    state.content = draft.content;
    state.tools = Array.isArray(draft.tools) ? draft.tools : state.tools;
    state.status = draft.status || state.status;
    linkTools();
    toast('Unsaved edits restored — review, then save.', 'info', 5000);
  } else {
    clearDraft();
  }
}

/* ------------------------------------------------------------------- auth */
function enterApp() {
  $('#gate').hidden = true;
  $('#app').hidden = false;
  $('#panelHost').append(el('div.panel', {},
    el('div.card', {}, el('div.empty', {}, el('b', { text: 'Loading your site…' })))));
  loadAll().catch(err => {
    $('#panelHost').innerHTML = '';
    $('#panelHost').append(el('div.panel', {}, el('div.card', {},
      el('div.empty', {},
        icon('warn'),
        el('b', { text: 'Could not load your content' }),
        el('p', { text: err.message }),
        el('button.btn.btn-ghost.btn-sm', {
          type: 'button', text: 'Try again', style: { marginTop: '14px' },
          onclick: () => { $('#panelHost').innerHTML = ''; enterApp(); },
        })))));
    toast('Could not load your site content: ' + err.message, 'err', 8000);
    setSaveState('error', 'Load failed');
  });
}

function signOut() {
  sessionStorage.removeItem(KEY_KEY);
  $('#app').hidden = true;
  $('#gate').hidden = false;
  $('#pw').value = '';
  $('#pw').focus();
}

async function tryLogin() {
  const pw = $('#pw').value;
  const err = $('#gateErr');
  err.textContent = '';
  if (!pw) { err.textContent = 'Enter your password.'; return; }
  const btn = $('#loginBtn');
  btn.disabled = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (res.ok && data.ok) { sessionStorage.setItem(KEY_KEY, pw); enterApp(); }
    else err.textContent = 'Incorrect password.';
  } catch (e) {
    err.textContent = 'Could not reach the server. Try again.';
  } finally {
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------ chrome / UI */
function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#scrim').classList.add('on');
  $('#burger').setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#scrim').classList.remove('on');
  $('#burger').setAttribute('aria-expanded', 'false');
}

function applyTheme(mode) {
  const dark = mode === 'dark' || (mode === 'system'
    && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const btn = $('#themeBtn');
  btn.innerHTML = '';
  btn.append(icon(dark ? 'sun' : 'moon'));
  btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  btn.title = btn.getAttribute('aria-label');
}

function initChrome() {
  $('#loginBtn').addEventListener('click', tryLogin);
  $('#pw').addEventListener('keydown', ev => { if (ev.key === 'Enter') tryLogin(); });
  $('#signOut').addEventListener('click', async () => {
    if (dirtyStores().length && !await confirmDialog({
      title: 'Sign out with unsaved changes?',
      body: 'Your edits are kept in this browser as a draft and offered back next time you sign in.',
      confirm: 'Sign out',
    })) return;
    signOut();
  });
  $('#saveBtn').addEventListener('click', saveAll);
  $('#revertBtn').addEventListener('click', revertAll);
  $('#burger').addEventListener('click', () =>
    ($('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar()));
  $('#scrim').addEventListener('click', closeSidebar);

  let theme = localStorage.getItem('st-admin-theme') || 'system';
  applyTheme(theme);
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => { if (theme === 'system') applyTheme('system'); });
  $('#themeBtn').addEventListener('click', () => {
    theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('st-admin-theme', theme);
    applyTheme(theme);
  });

  document.addEventListener('keydown', ev => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); saveAll(); }
    if (ev.key === 'Escape' && $('#sidebar').classList.contains('open')) closeSidebar();
  });

  window.addEventListener('beforeunload', ev => {
    if (dirtyStores().length) { writeDraft(); ev.preventDefault(); ev.returnValue = ''; }
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && id !== current) go(id);
  });
}

/* ------------------------------------------------------------------ start */
initChrome();
if (adminKey()) {
  fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminKey() }),
  })
    .then(r => r.json())
    .then(d => { if (d.ok) enterApp(); else signOut(); })
    .catch(() => { /* offline — stay on the gate */ });
}
