/* ===========================================================================
   Upload pipeline. Validates on the client, shrinks images in the browser so
   they always fit the store limit, then hands a data URL to /api/media.
   =========================================================================== */

/** What a person may pick. */
export const MAX_SOURCE = 2 * 1024 * 1024;           // 2 MB, per the brief
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');
export const FILE_TYPES = ['application/pdf'];
export const FILE_ACCEPT = 'application/pdf,.pdf';

/** What the store accepts — must match MAX_BYTES in api/media.js. */
const MAX_STORED = 700 * 1024;

export const kb = n => (n < 1024 * 1024
  ? Math.round(n / 1024) + ' KB'
  : (n / 1024 / 1024).toFixed(1) + ' MB');

/** Throws a message meant to be shown verbatim to the user. */
export function validateFile(file, kind) {
  const types = kind === 'file' ? FILE_TYPES : IMAGE_TYPES;
  if (file.size > MAX_SOURCE) {
    throw new Error(`"${file.name}" is ${kb(file.size)} — the limit is ${kb(MAX_SOURCE)}.`);
  }
  // Some browsers report an empty type for files dragged from odd sources, so
  // fall back to the extension rather than rejecting a valid file outright.
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const extOk = kind === 'file' ? ext === 'pdf' : ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  if (file.type ? !types.includes(file.type) : !extOk) {
    throw new Error(kind === 'file'
      ? 'Only PDF files can be uploaded here.'
      : 'Only JPG, PNG and WebP images can be uploaded.');
  }
}

function readDataUrl(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
}

/** Re-encode to WebP, stepping quality then size down until it fits the store. */
async function shrinkImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch (e) { throw new Error('That image could not be read — try re-saving it as JPG or PNG.'); }

  let maxEdge = 1600, quality = 0.84, out = '';
  try {
    for (let attempt = 0; attempt < 9; attempt++) {
      const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(bmp.width * scale));
      cv.height = Math.max(1, Math.round(bmp.height * scale));
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      out = cv.toDataURL('image/webp', quality);
      // base64 inflates by ~4/3, so compare against the decoded budget
      if (out.length * 0.75 < MAX_STORED) return out;
      if (quality > 0.5) quality -= 0.12; else maxEdge = Math.round(maxEdge * 0.75);
    }
  } finally {
    if (bmp.close) bmp.close();
  }
  return out;
}

/**
 * Validate, compress and store one file.
 * @returns {Promise<{url:string, bytes:number}>}
 */
export async function uploadFile(file, kind, post) {
  validateFile(file, kind);
  const data = kind === 'file' ? await readDataUrl(file) : await shrinkImage(file);
  if (data.length * 0.75 > MAX_STORED) {
    throw new Error(`That file is still ${kb(data.length * 0.75)} after compression — the limit is ${kb(MAX_STORED)}.`);
  }
  const res = await post('/api/media', { data });
  return { url: res.url, bytes: res.bytes || Math.round(data.length * 0.75) };
}
