export function isDownloadLabel(text: string | null | undefined): boolean {
  // Browser-internal navigation is not a ChatGPT-only download action.
  const label = (text || '').trim();
  if (/\b(?:chrome|edge|brave|about|moz-extension):\/\//i.test(label)) return false;
  return /^(?:⬇\s*)?(?:download|open|view)\s+.{1,90}(?:\.(?:pdf|zip|png|jpg|jpeg|docx?|xlsx?|pptx?)\b|\((?:zip|pdf)\)|file\b)/i.test(label)
    || /^download\s+.{1,100}(?:extension|zip|pdf)/i.test(label);
}

export function markChatOnlyLink(target: Element): void {
  target.classList.add('chat-only-download');
  target.removeAttribute('href');
  target.setAttribute('title', 'Available in the original ChatGPT conversation');
}

export function copyMediaDimensions(node: Element, out: HTMLElement, tag: string): void {
  // Preserve the displayed size, not the potentially enormous intrinsic size.
  // Never upscale a tiny favicon or thumbnail to a full page.
  const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : { width: 0, height: 0 };
  const width = rect.width || Number(node.getAttribute('width')) || 0;
  const height = rect.height || Number(node.getAttribute('height')) || 0;
  if (width > 2 && height > 2) {
    const max = /(?:logo|icon|avatar|favicon)/i.test(node.getAttribute('alt') || '') ? 210 : 760;
    out.style.maxWidth = '100%';
    out.style.width = `${Math.min(Math.round(width), max)}px`;
    // Do not force height; let the intrinsic aspect ratio determine it.
    if (tag === 'IMG') out.style.height = 'auto';
  }
  if (tag === 'IMG') out.classList.add('export-image');
}

export function addVisualLayout(node: Element, out: HTMLElement): void {
  // ChatGPT uses grid/flex for media lists, icon sequences, and theme previews.
  // Retain those specific layouts, without copying the whole application CSS.
  const children = Array.from(node.children);
  if (children.length < 2 || children.length > 8) return;
  const visualChildren = children.filter(child =>
    child.querySelector('img, svg, canvas') ||
    ['IMG', 'SVG', 'CANVAS'].includes(child.tagName) ||
    (typeof child.getBoundingClientRect === 'function' && child.getBoundingClientRect().height > 8 &&
      typeof getComputedStyle !== 'undefined' && getComputedStyle(child).backgroundColor !== 'rgba(0, 0, 0, 0)'));
  if (visualChildren.length < 2) return;
  if (typeof getComputedStyle === 'undefined') return;
  const style = getComputedStyle(node);
  if (style.display && style.display.includes('grid')) {
    const count = Math.min(3, Math.max(2, (style.gridTemplateColumns || '').split(/\s+/).length));
    out.classList.add('export-visual-grid');
    out.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
  } else if (style.display && style.display.includes('flex') && style.flexDirection === 'row') {
    out.classList.add('export-visual-row');
  }
}

export function hasVisualBox(node: Element): boolean {
  if (typeof node.getBoundingClientRect !== 'function' || typeof getComputedStyle === 'undefined') return false;
  const rect = node.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 5 || rect.height > 160) return false;
  const style = getComputedStyle(node);
  return !!style.backgroundColor &&
    !['transparent','rgba(0, 0, 0, 0)'].includes(style.backgroundColor) &&
    style.backgroundColor !== getComputedStyle(node.parentElement || node).backgroundColor;
}

export function preserveVisualBox(node: Element, out: HTMLElement): void {
  if (typeof getComputedStyle === 'undefined') return;
  const style = getComputedStyle(node);
  const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : { height: 0 };
  out.classList.add('export-color-block');
  out.style.backgroundColor = style.backgroundColor;
  out.style.borderRadius = Math.min(parseFloat(style.borderRadius || '0') || 0, 16) + 'px';
  out.style.minHeight = Math.min(rect.height, 100) + 'px';
}

export function normalizeTableHeader(table: Element, doc: Document = table.ownerDocument): void {
  // Chrome repeats a real THEAD when the table spans PDF pages. ChatGPT may
  // render its headings as the first row of TBODY instead of a THEAD.
  if (table.querySelector('thead')) return;
  const first = table.querySelector('tr');
  if (!first || !first.querySelector('th')) return;
  const thead = doc.createElement('thead');
  thead.appendChild(first);
  table.insertBefore(thead, table.firstChild);
}
