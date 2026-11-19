export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const afterPaint = () => new Promise(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(resolve)));

export function safeURL(value, allowImageData = false) {
  if (!value) return null;
  if (allowImageData && /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);/i.test(value)) return value;
  try {
    const url = new URL(value, location.href);
    if (allowImageData && url.protocol === 'blob:' && url.origin === location.origin) return url.href;
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function quotedCSS(value) {
  return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    .replace(/[\r\n]/g, ' ').slice(0, 120) + '"';
}
