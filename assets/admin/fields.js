/* ===========================================================================
   Field factory. Every control is built from a schema descriptor and bound to
   a path in the content document. Structural edits redraw their own subtree;
   typing never redraws, so focus and caret position are never lost.

   ctx = { get, set, dirty, post, register, openLists }
   =========================================================================== */

import { el, icon, iconBtn, toast, confirmDialog, lightbox, draggable, $$ } from './ui.js';
import { uploadFile, IMAGE_ACCEPT, FILE_ACCEPT, kb } from './media.js';

/* Stable per-object ids so a collapsed/expanded row survives reordering.
   Non-enumerable, so they never reach JSON.stringify or the API. */
let seq = 0;
export function uid(obj) {
  if (!obj.__uid) Object.defineProperty(obj, '__uid', { value: 'u' + (++seq), enumerable: false });
  return obj.__uid;
}

const dig = (o, p) => String(p).split('.').reduce((x, k) => (x == null ? x : x[k]), o);

/* The AI tool cards reuse the generic list machinery. */
export const TOOL_FIELDS = [
  { k: 'name', l: 'Name', t: 'text', req: 1, max: 80, half: 1, ph: 'Invoice Builder' },
  { k: 'tag', l: 'Tag', t: 'text', max: 40, half: 1, ph: 'Free' },
  { k: 'description', l: 'Description', t: 'area', max: 220 },
  { k: 'url', l: 'Free link (URL)', t: 'url', as: 'link', req: 1, max: 300, ph: 'https://…' },
  { k: 'logo', l: 'Logo / screenshot', t: 'image', h: 'Falls back to the first two letters of the name.' },
];

/* ------------------------------------------------------------- scaffolding */
function labelRow(f, id, counter) {
  // a field promoted to its own card heading should not repeat the label
  if (f.noLabel) return document.createComment('');
  return el('label.f-label', { for: id },
    el('span', { text: f.l }),
    f.req ? el('span.f-req', { text: '*', title: 'Required', 'aria-label': 'required' }) : null,
    counter);
}

function errSlot() {
  return el('div.f-err', { hidden: true });
}

function showErr(wrap, slot, msg) {
  wrap.classList.toggle('bad', !!msg);
  slot.hidden = !msg;
  slot.innerHTML = '';
  if (msg) { slot.appendChild(icon('warn')); slot.appendChild(el('span', { text: msg })); }
}

/* ------------------------------------------------------------- text inputs */
function textField(f, path, ctx) {
  const id = 'f_' + path.replace(/\W/g, '_');
  const value = ctx.get(path) ?? '';
  const counter = f.max ? el('span.f-count') : null;
  const wrap = el('div.field', { class: f.half ? '' : 'wide' });
  const slot = errSlot();

  const input = f.t === 'area'
    ? el('textarea', { id, rows: 3, placeholder: f.ph || '', value: String(value) })
    : el('input', {
        id, type: f.as === 'email' ? 'email' : f.t === 'url' ? 'url' : 'text',
        placeholder: f.ph || '', value: String(value),
        autocomplete: f.as === 'email' ? 'email' : 'off', spellcheck: f.t === 'area',
      });

  const tick = () => {
    if (!counter) return;
    const n = input.value.length;
    counter.textContent = `${n}/${f.max}`;
    counter.classList.toggle('over', n > f.max);
  };
  input.addEventListener('input', () => { ctx.set(path, input.value); tick(); });
  input.addEventListener('blur', () => ctx.revalidate(path));
  tick();

  wrap.append(labelRow(f, id, counter), input);
  if (f.h) wrap.append(el('div.f-hint', { html: f.h }));
  wrap.append(slot);
  ctx.register(path, { wrap, focus: () => input.focus(), show: msg => showErr(wrap, slot, msg) });
  return wrap;
}

/* -------------------------------------------------------- single file/image */
function mediaField(f, path, ctx) {
  const isImg = f.t === 'image';
  const wrap = el('div.field.wide');
  const slot = errSlot();
  const drop = el('div.drop');
  const input = el('input', {
    type: 'file', accept: isImg ? IMAGE_ACCEPT : FILE_ACCEPT,
    'aria-label': f.l, id: 'f_' + path.replace(/\W/g, '_'),
  });
  const prev = isImg ? el('img.prev', { alt: '', loading: 'lazy' }) : el('div.doc', {}, icon('doc'));
  const info = el('div.info');
  const acts = el('div.acts');

  const paint = () => {
    const v = ctx.get(path) || '';
    info.innerHTML = '';
    acts.innerHTML = '';
    if (v) {
      if (isImg) prev.src = v; else prev.classList.add('has');
      info.append(el('b', { text: isImg ? 'Image uploaded' : 'File uploaded' }), el('span', { text: v }));
      if (isImg) acts.append(iconBtn('eye', 'Preview', () => lightbox(v, f.l)));
      acts.append(iconBtn('trash', 'Remove', async () => {
        if (!await confirmDialog({ title: `Remove this ${isImg ? 'image' : 'file'}?`, body: 'You can upload a new one at any time.', confirm: 'Remove', danger: true })) return;
        ctx.set(path, ''); paint(); ctx.revalidate(path);
      }, { danger: true }));
    } else {
      if (isImg) prev.removeAttribute('src');
      info.append(
        el('b', { text: isImg ? 'Drop an image here' : 'Drop a PDF here' }),
        el('span', { text: isImg ? 'or click to browse — JPG, PNG or WebP, up to 2 MB' : 'or click to browse — PDF up to 2 MB' }));
    }
  };

  const take = async file => {
    if (!file) return;
    drop.classList.add('busy');
    info.innerHTML = '';
    info.append(el('b', { text: 'Uploading…' }), el('span', { text: file.name }));
    try {
      const { url, bytes } = await uploadFile(file, isImg ? 'image' : 'file', ctx.post);
      ctx.set(path, url);
      toast(`Uploaded — ${kb(bytes)}. Remember to save.`, 'ok');
    } catch (err) {
      toast(err.message, 'err', 6000);
    } finally {
      drop.classList.remove('busy');
      paint();
      ctx.revalidate(path);
      input.value = '';
    }
  };

  input.addEventListener('change', () => take(input.files && input.files[0]));
  drop.addEventListener('dragover', ev => { ev.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', ev => {
    ev.preventDefault(); drop.classList.remove('over');
    take(ev.dataTransfer.files && ev.dataTransfer.files[0]);
  });

  drop.append(input, prev, info, acts);
  paint();
  wrap.append(labelRow(f, input.id), drop);
  if (f.h) wrap.append(el('div.f-hint', { html: f.h }));
  wrap.append(slot);
  ctx.register(path, { wrap, focus: () => drop.scrollIntoView({ block: 'center' }), show: msg => showErr(wrap, slot, msg) });
  return wrap;
}

/* ------------------------------------------------------------ image gallery */
function galleryField(f, path, ctx) {
  const wrap = el('div.field.wide');
  const slot = errSlot();
  const host = el('div');
  const arr = () => ctx.get(path) || [];

  const draw = () => {
    host.innerHTML = '';
    const items = arr();
    if (items.length) {
      const grid = el('div.gal');
      items.forEach((src, i) => {
        const cell = el('div.gal-cell', { draggable: 'true', 'data-i': i },
          el('img', { src, alt: `Image ${i + 1}`, loading: 'lazy' }),
          el('span.gal-n', { text: String(i + 1) }),
          el('div.gal-acts', {},
            iconBtn('eye', `Preview image ${i + 1}`, () => lightbox(src, f.l)),
            iconBtn('up', 'Move earlier', () => { move(i, i - 1); }, { disabled: i === 0 }),
            iconBtn('down', 'Move later', () => { move(i, i + 1); }, { disabled: i === items.length - 1 }),
            iconBtn('trash', `Remove image ${i + 1}`, async () => {
              if (!await confirmDialog({ title: 'Remove this image?', confirm: 'Remove', danger: true })) return;
              const a = arr(); a.splice(i, 1); ctx.set(path, a); ctx.dirty(); draw(); ctx.revalidate(path);
            }, { danger: true })));
        grid.append(cell);
      });
      draggable(grid, '.gal-cell', (from, to) => move(from, to));
      host.append(grid);
    }

    const drop = el('div.drop');
    const input = el('input', { type: 'file', accept: IMAGE_ACCEPT, multiple: true, 'aria-label': 'Add images' });
    const info = el('div.info', {},
      el('b', { text: items.length ? 'Add another image' : 'Drop images here' }),
      el('span', { text: 'JPG, PNG or WebP, up to 2 MB each' }));
    const take = async files => {
      const list = [...(files || [])];
      if (!list.length) return;
      drop.classList.add('busy');
      let added = 0;
      for (const file of list) {
        try {
          const { url } = await uploadFile(file, 'image', ctx.post);
          const a = arr(); a.push(url); ctx.set(path, a); added++;
        } catch (err) { toast(err.message, 'err', 6000); }
      }
      drop.classList.remove('busy');
      if (added) { ctx.dirty(); toast(`${added} image${added > 1 ? 's' : ''} uploaded — remember to save.`, 'ok'); }
      draw(); ctx.revalidate(path);
    };
    input.addEventListener('change', () => take(input.files));
    drop.addEventListener('dragover', ev => { ev.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', ev => {
      ev.preventDefault(); drop.classList.remove('over'); take(ev.dataTransfer.files);
    });
    drop.append(input, el('div.doc', {}, icon('img')), info);
    host.append(drop);
  };

  const move = (from, to) => {
    const a = arr();
    if (to < 0 || to >= a.length) return;
    a.splice(to, 0, a.splice(from, 1)[0]);
    ctx.set(path, a); ctx.dirty(); draw();
  };

  draw();
  wrap.append(labelRow(f, null), host);
  if (f.h) wrap.append(el('div.f-hint', { html: f.h }));
  wrap.append(slot);
  ctx.register(path, { wrap, focus: () => wrap.scrollIntoView({ block: 'center' }), show: msg => showErr(wrap, slot, msg) });
  return wrap;
}

/* ------------------------------------------------- list of plain strings */
function stringsField(f, path, ctx) {
  const wrap = el('div.field.wide');
  const slot = errSlot();
  const host = el('div');
  const arr = () => ctx.get(path) || [];

  const draw = focusLast => {
    host.innerHTML = '';
    const items = arr();
    if (!items.length) {
      host.append(el('div.empty', {}, icon('inbox'),
        el('b', { text: `No ${(f.item || 'item').toLowerCase()}s yet` }),
        el('p', { text: `Add your first ${(f.item || 'item').toLowerCase()} to have it appear on the page.` })));
    } else {
      const rows = el('div.chips');
      items.forEach((v, i) => {
        const input = f.area
          ? el('textarea', { rows: 3, value: v, 'aria-label': `${f.item || 'Item'} ${i + 1}`, placeholder: f.ph || '' })
          : el('input', { type: 'text', value: v, 'aria-label': `${f.item || 'Item'} ${i + 1}`, placeholder: f.ph || '' });
        input.addEventListener('input', () => { const a = arr(); a[i] = input.value; ctx.set(path, a); ctx.dirty(); });
        input.addEventListener('blur', () => ctx.revalidate(path));
        rows.append(el('div.chip-row', { 'data-i': i },
          el('span.idx', { text: String(i + 1) }), input,
          iconBtn('up', 'Move up', () => move(i, i - 1), { disabled: i === 0 }),
          iconBtn('down', 'Move down', () => move(i, i + 1), { disabled: i === items.length - 1 }),
          iconBtn('trash', 'Remove', () => {
            const a = arr(); a.splice(i, 1); ctx.set(path, a); ctx.dirty(); draw(); ctx.revalidate(path);
          }, { danger: true })));
      });
      host.append(rows);
      if (focusLast) {
        const last = rows.querySelector('.chip-row:last-child input, .chip-row:last-child textarea');
        if (last) last.focus();
      }
    }
    host.append(el('button.btn.btn-ghost.btn-sm', {
      type: 'button', style: { marginTop: '10px' },
      onclick: () => { const a = arr(); a.push(''); ctx.set(path, a); ctx.dirty(); draw(true); },
    }, icon('plus'), `Add ${(f.item || 'item').toLowerCase()}`));
  };

  const move = (from, to) => {
    const a = arr();
    if (to < 0 || to >= a.length) return;
    a.splice(to, 0, a.splice(from, 1)[0]);
    ctx.set(path, a); ctx.dirty(); draw();
  };

  draw();
  wrap.append(labelRow(f, null), host);
  if (f.h) wrap.append(el('div.f-hint', { html: f.h }));
  wrap.append(slot);
  ctx.register(path, { wrap, focus: () => wrap.scrollIntoView({ block: 'center' }), show: msg => showErr(wrap, slot, msg) });
  return wrap;
}

/* ---------------------------------------------- list of repeatable objects */
function listField(f, path, ctx) {
  const wrap = el('div.field.wide');
  const slot = errSlot();
  const host = el('div');
  const arr = () => ctx.get(path) || [];
  const noun = (f.item || 'item').toLowerCase();

  const blank = () => {
    const o = {};
    f.fields.forEach(sub => { o[sub.k] = (sub.t === 'strings' || sub.t === 'images') ? [] : ''; });
    return o;
  };

  const draw = () => {
    host.innerHTML = '';
    const items = arr();

    if (!items.length) {
      host.append(el('div.empty', {}, icon('inbox'),
        el('b', { text: `No ${noun}s yet` }),
        el('p', { text: f.emptyHint || `Nothing is shown on the page until you add your first ${noun}.` })));
    } else {
      const box = el('div.items');
      items.forEach((item, i) => box.append(row(item, i, items.length)));
      draggable(box, '.item', (from, to) => {
        const a = arr();
        a.splice(to, 0, a.splice(from, 1)[0]);
        ctx.set(path, a); ctx.dirty(); draw();
      });
      host.append(box);
    }

    host.append(el('button.btn.btn-ghost.btn-sm', {
      type: 'button', style: { marginTop: '10px' },
      onclick: () => {
        const a = arr();
        const fresh = blank();
        a.push(fresh);
        ctx.set(path, a); ctx.dirty();
        ctx.openLists.add(uid(fresh));
        draw();
        const node = host.querySelector('.item:last-of-type input, .item:last-of-type textarea');
        if (node) node.focus();
      },
    }, icon('plus'), `Add ${noun}`));
  };

  const row = (item, i, total) => {
    const key = uid(item);
    const open = ctx.openLists.has(key);
    const node = el('div.item', { class: open ? 'open' : '', draggable: 'true', 'data-i': i });

    const title = el('b');
    const sub = el('span');
    const thumb = f.sum && f.sum.img ? el('img.item-thumb', { alt: '', loading: 'lazy' }) : null;

    const refresh = () => {
      const t = f.sum ? String(dig(item, f.sum.t) || '').trim() : '';
      const s = f.sum && f.sum.s ? String(dig(item, f.sum.s) || '').trim() : '';
      title.textContent = t || `Untitled ${noun}`;
      title.classList.toggle('ph', !t);
      sub.textContent = s;
      sub.hidden = !s;
      if (thumb) {
        const src = dig(item, f.sum.img);
        if (src) { thumb.src = src; thumb.hidden = false; } else { thumb.hidden = true; }
      }
    };

    const toggle = el('button.item-toggle', {
      type: 'button', 'aria-expanded': String(open),
      onclick: () => {
        const nowOpen = !node.classList.contains('open');
        node.classList.toggle('open', nowOpen);
        toggle.setAttribute('aria-expanded', String(nowOpen));
        body.hidden = !nowOpen;
        if (nowOpen) ctx.openLists.add(key); else ctx.openLists.delete(key);
      },
    }, el('span.chev', {}, icon('chev')), el('span.item-idx', { text: String(i + 1) }),
       thumb, el('span.item-txt', {}, title, sub));

    const acts = el('div.item-acts', {},
      iconBtn('up', 'Move up', () => move(i, i - 1), { disabled: i === 0 }),
      iconBtn('down', 'Move down', () => move(i, i + 1), { disabled: i === total - 1 }),
      iconBtn('copy', `Duplicate ${noun}`, () => {
        const a = arr();
        const copy = JSON.parse(JSON.stringify(a[i]));
        a.splice(i + 1, 0, copy);
        ctx.set(path, a); ctx.dirty(); ctx.openLists.add(uid(copy)); draw();
        toast(`${f.item || 'Item'} duplicated.`, 'ok', 2200);
      }),
      iconBtn('trash', `Remove ${noun}`, async () => {
        const label = (f.sum ? String(dig(item, f.sum.t) || '').trim() : '') || `this ${noun}`;
        if (!await confirmDialog({
          title: `Delete ${label}?`,
          body: 'This removes it from your page as soon as you save. It cannot be undone.',
          confirm: 'Delete', danger: true,
        })) return;
        const a = arr(); a.splice(i, 1); ctx.set(path, a); ctx.dirty(); draw(); ctx.revalidate(path);
        toast(`${f.item || 'Item'} deleted — save to publish.`, 'info', 2600);
      }, { danger: true }));

    const body = el('div.item-body', { hidden: !open });
    const grid = el('div.fields');
    f.fields.forEach(sub => grid.append(field(sub, `${path}.${i}.${sub.k}`, ctx)));
    body.append(grid);
    // one delegated listener keeps the collapsed summary in step with the form
    body.addEventListener('input', refresh);

    refresh();
    node.append(el('div.item-bar', {}, toggle, acts), body);
    return node;
  };

  const move = (from, to) => {
    const a = arr();
    if (to < 0 || to >= a.length) return;
    a.splice(to, 0, a.splice(from, 1)[0]);
    ctx.set(path, a); ctx.dirty(); draw();
  };

  draw();
  wrap.append(labelRow(f, null), host);
  if (f.h) wrap.append(el('div.f-hint', { html: f.h }));
  wrap.append(slot);
  ctx.register(path, { wrap, focus: () => wrap.scrollIntoView({ block: 'center' }), show: msg => showErr(wrap, slot, msg) });
  return wrap;
}

/* ------------------------------------------------------------- entry point */
export function field(f, path, ctx) {
  switch (f.t) {
    case 'image':
    case 'file':    return mediaField(f, path, ctx);
    case 'images':  return galleryField(f, path, ctx);
    case 'strings': return stringsField(f, path, ctx);
    case 'list':    return listField(f, path, ctx);
    case 'tools':   return listField({ ...f, t: 'list', item: 'Tool', fields: TOOL_FIELDS, sum: { t: 'name', s: 'url', img: 'logo' }, emptyHint: 'The AI Tools section stays hidden until you add a tool.' }, path, ctx);
    default:        return textField(f, path, ctx);
  }
}
