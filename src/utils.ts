export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const afterPaint = (): Promise<void> =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

export function safeURL(
  value: string | null | undefined,
  allowImageData = false
): string | null {
  if (!value) return null;
  if (
    allowImageData &&
    /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);/i.test(value)
  )
    return value;
  try {
    const origin =
      typeof location !== 'undefined' ? location.href : 'https://chatgpt.com';
    const url = new URL(value, origin);
    if (
      allowImageData &&
      url.protocol === 'blob:' &&
      (typeof location === 'undefined' || url.origin === location.origin)
    ) {
      return url.href;
    }
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function quotedCSS(value: string | number | null | undefined): string {
  return (
    '"' +
    String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/[\r\n]/g, ' ')
      .slice(0, 120) +
    '"'
  );
}
