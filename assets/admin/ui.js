/* ===========================================================================
   Shared UI primitives: DOM helpers, icons, toasts, confirm dialog, lightbox
   and drag-to-reorder. Nothing here knows about the content model.
   =========================================================================== */

/* ------------------------------------------------------------ DOM helpers */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** el('div.card', {id:'x'}, child, 'text') — a tiny hyperscript. */
export function el(spec, props, ...kids) {
  const [tag, ...classes] = String(spec).split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className += (node.className ? ' ' : '') + v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in node && k !== 'list') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return node;
}

/* ------------------------------------------------------------------ icons */
const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONS = {
  home: P('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
  radio: P('<circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M5 5a10 10 0 0 0 0 14M19 19a10 10 0 0 0 0-14"/>'),
  sparkle: P('<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.3 6.3l3 3M14.7 14.7l3 3M17.7 6.3l-3 3M9.3 14.7l-3 3"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
  briefcase: P('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'),
  cap: P('<path d="M2 8.5 12 4l10 4.5-10 4.5z"/><path d="M6 10.7V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.3"/>'),
  spark: P('<path d="m12 3 2.3 5.9L20 11l-5.7 2.1L12 19l-2.3-5.9L4 11l5.7-2.1z"/>'),
  grid: P('<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>'),
  bolt: P('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  folder: P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  award: P('<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.5 7L12 18l4.5 2.5-1.5-7"/>'),
  quote: P('<path d="M9 6C6.2 7.2 5 9.5 5 12.8V18h5.5v-6H8c0-2.4.6-3.9 2.4-4.7zM19 6c-2.8 1.2-4 3.5-4 6.8V18h5.5v-6H18c0-2.4.6-3.9 2.4-4.7z"/>'),
  globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'),
  mail: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
  layout: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18"/>'),
  cog: P('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>'),

  chev: P('<path d="m9 5 7 7-7 7"/>'),
  up: P('<path d="m6 14 6-6 6 6"/>'),
  down: P('<path d="m6 10 6 6 6-6"/>'),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  trash: P('<path d="M4 7h16M10 4h4M6 7l1 13h10l1-13"/>'),
  copy: P('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15"/>'),
  menu: P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  eye: P('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  save: P('<path d="M5 4h11l3 3v13H5z"/><path d="M9 4v5h6V4M8 20v-6h8v6"/>'),
  out: P('<path d="M14 3h5v18h-5"/><path d="M10 8 6 12l4 4M6 12h9"/>'),
  ok: P('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.5"/>'),
  warn: P('<path d="M12 4 2.8 20h18.4z"/><path d="M12 10v4.5M12 17.4v.1"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>'),
  img: P('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.7"/><path d="m4 17 5-5 4.5 4.5L16.5 13l3.5 3.5"/>'),
  doc: P('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'),
  moon: P('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>'),
  drag: P('<circle cx="9" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="15" cy="18" r="1.3"/>'),
  inbox: P('<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M4.5 5h15l1.5 8v6H3v-6z"/>'),
};

export function icon(name, cls) {
  const span = document.createElement('span');
  span.className = cls || '';
  span.style.display = 'contents';
  span.innerHTML = ICONS[name] || '';
  return span.firstElementChild || span;
}

/** An icon button with a 44px hit area and an accessible label. */
export function iconBtn(name, label, onClick, opts = {}) {
  const b = el('button.ibtn', {
    type: 'button', title: label, 'aria-label': label,
    disabled: !!opts.disabled, class: opts.danger ? 'danger' : '',
    onclick: onClick,
  });
  b.appendChild(icon(name));
  return b;
}

/* ----------------------------------------------------------------- toasts */
let toastHost = null;

export function toast(msg, kind = 'info', ms = 3600) {
  if (!toastHost) {
    toastHost = el('div.toasts', { role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(toastHost);
  }
  const t = el('div.toast', { class: kind },
    icon(kind === 'ok' ? 'ok' : kind === 'err' ? 'warn' : 'info'),
    el('span.msg', { text: msg }));
  toastHost.appendChild(t);
  const kill = () => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  };
  const timer = setTimeout(kill, ms);
  t.addEventListener('click', () => { clearTimeout(timer); kill(); });
  return kill;
}

/* --------------------------------------------------------- confirm dialog */
/** Focus-trapped confirm. Resolves true when the primary action is taken. */
export function confirmDialog({ title, body, confirm = 'Confirm', danger = false }) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const done = v => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (prev && prev.focus) prev.focus();
      resolve(v);
    };
    const okBtn = el('button.btn', {
      type: 'button', class: danger ? 'btn-danger' : 'btn-primary', text: confirm,
      onclick: () => done(true),
    });
    const cancelBtn = el('button.btn.btn-ghost', { type: 'button', text: 'Cancel', onclick: () => done(false) });
    const card = el('div.modal-card', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('h3', { text: title }),
      body ? el('p', { text: body }) : null,
      el('div.modal-acts', {}, cancelBtn, okBtn));
    const overlay = el('div.modal', {
      onclick: ev => { if (ev.target === overlay) done(false); },
    }, card);

    const onKey = ev => {
      if (ev.key === 'Escape') { ev.stopPropagation(); done(false); }
      if (ev.key === 'Tab') {
        const f = [cancelBtn, okBtn];
        const i = f.indexOf(document.activeElement);
        ev.preventDefault();
        f[(i + (ev.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
}

/* -------------------------------------------------------------- lightbox */
export function lightbox(src, caption) {
  const prev = document.activeElement;
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
    if (prev && prev.focus) prev.focus();
  };
  const btn = iconBtn('x', 'Close preview', close);
  btn.classList.add('lbox-close');
  const overlay = el('div.lbox', {
    role: 'dialog', 'aria-modal': 'true', 'aria-label': caption || 'Image preview',
    onclick: ev => { if (ev.target === overlay) close(); },
  }, el('img', { src, alt: caption || '' }), btn,
     caption ? el('div.lbox-cap', { text: caption }) : null);
  const onKey = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(overlay);
  btn.focus();
}

/* --------------------------------------------------------- drag to reorder */
/**
 * Wire pointer-based reordering on a container whose children carry data-i.
 * `onMove(from, to)` mutates the model; the caller re-renders.
 */
export function draggable(host, itemSel, onMove) {
  let from = null;
  host.addEventListener('dragstart', ev => {
    const node = ev.target.closest(itemSel);
    if (!node) return;
    from = +node.dataset.i;
    node.classList.add('dragging');
    ev.dataTransfer.effectAllowed = 'move';
    // Firefox needs payload set for the drag to start at all
    try { ev.dataTransfer.setData('text/plain', String(from)); } catch (e) { /* ignore */ }
  });
  host.addEventListener('dragend', () => {
    from = null;
    $$(itemSel, host).forEach(n => n.classList.remove('dragging', 'drop-into'));
  });
  host.addEventListener('dragover', ev => {
    const node = ev.target.closest(itemSel);
    if (from == null || !node || +node.dataset.i === from) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    $$(itemSel, host).forEach(n => n.classList.toggle('drop-into', n === node));
  });
  host.addEventListener('drop', ev => {
    const node = ev.target.closest(itemSel);
    if (from == null || !node) return;
    ev.preventDefault();
    const to = +node.dataset.i;
    if (to !== from) onMove(from, to);
    from = null;
  });
}
