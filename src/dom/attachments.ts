import {
  fileNameRE,
  fileExtensionRE,
  fileHintRE,
  fileMetadataAttributes
} from '../config.js';

export interface AttachmentRecord {
  name: string;
  type: string;
  origin: Element;
}

export function hasContent(element: Element | null): boolean {
  if (!element) return false;
  const text = (element as HTMLElement).innerText || element.textContent || '';
  return !!text.trim() || !!element.querySelector('img, svg, canvas, pre');
}

export function attachmentPill(
  doc: Document,
  label: string,
  type: string
): HTMLSpanElement {
  const chip = doc.createElement('span');
  chip.className = 'attachment-pill';
  const kind = doc.createElement('span');
  kind.className = 'attachment-type';
  kind.textContent = type;
  const name = doc.createElement('span');
  name.textContent = label;
  chip.append(kind, name);
  return chip;
}

export function hintString(element: Element): string {
  return [
    element.className,
    element.getAttribute('data-testid'),
    element.getAttribute('data-type'),
    element.getAttribute('data-kind'),
    element.getAttribute('data-component'),
    element.getAttribute('role')
  ]
    .filter((v): v is string => typeof v === 'string')
    .join(' ');
}

export function isUserAttachmentShell(element: Element | null): boolean {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
  // Element role is critical: a user message bubble itself must NEVER be
  // discarded just because it happens to contain an upload chip.
  if (
    element.classList.contains('bg-user-message') ||
    element.matches('.group\\/user-message')
  )
    return false;
  const text = (element as HTMLElement).innerText || element.textContent || '';
  return (
    fileHintRE.test(hintString(element)) &&
    (text.length < 360 || !!element.querySelector('img'))
  );
}

export function extractNames(value: string | null | undefined): string[] {
  if (!value || typeof value !== 'string') return [];
  const matches: string[] = [];
  const lines = value
    .split(/[\r\n]+/)
    .map((v) => v.trim())
    .filter(Boolean);
  // Try separate lines first. Many ChatGPT attachment cards contain
  // `PDF` on one line and the filename on the next.
  for (const line of lines) {
    if (line.length > 220) continue;
    const pieces = line.match(fileNameRE) || [];
    for (let piece of pieces) {
      piece = piece
        .trim()
        .replace(
          /^(?:(?:OPEN|DOWNLOAD|VIEW)\s+(?:FILE\s+)?|(?:PDF|FILE|IMAGE|ZIP|DOCX?|PNG|JPG)\s+)+/i,
          ''
        )
        .trim();
      if (fileExtensionRE.test(piece)) matches.push(piece);
    }
  }
  return matches;
}

export function extractAttachments(
  doc: Document,
  turn: Element,
  user: Element | null,
  source: Element | null,
  assistantSources: Element[],
  userAttachmentNodes: Set<Element>
): HTMLDivElement {
  const wrapper = doc.createElement('div');
  wrapper.className = 'message-attachments';
  if (!turn || !user) return wrapper;
  const firstAssistant = assistantSources[0] || null;

  const seenNames = new Set<string>();
  const seenOrigins = new Set<Element>();
  let unnamedImages = 0;
  let unnamedFiles = 0;
  const records: AttachmentRecord[] = [];
  const roots: Element[] = [];

  const before = (a: Element | null, b: Element | null): boolean =>
    !!a &&
    !!b &&
    a !== b &&
    !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  const inUserArea = (el: Element): boolean => {
    if (
      !turn.contains(el) ||
      el.closest('.turn-action-controls,[data-markdown-copy="exclude"]')
    )
      return false;
    if (assistantSources.some((a) => a === el || a.contains(el))) return false;
    if (firstAssistant && !before(el, firstAssistant)) return false;
    return user.contains(el) || el === user || before(user, el);
  };

  const isProse = (el: Element): boolean =>
    !!el.closest(
      'p, pre, code, blockquote, h1, h2, h3, h4, h5, h6, li, table, .markdown'
    );

  function cardRoot(el: Element): Element | null {
    let cursor: Element | null = el;
    let depth = 0;
    let best: Element | null = null;
    while (cursor && cursor !== turn && depth++ < 8) {
      if (!inUserArea(cursor) || cursor === source || cursor === user) break;
      const text =
        (cursor as HTMLElement).innerText || cursor.textContent || '';
      if (text.length > 450) break;
      if (isUserAttachmentShell(cursor)) best = cursor;
      if (cursor.matches('button,a,[role="button"],[role="link"]'))
        best = best || cursor;
      if (
        !best &&
        cursor.querySelector('svg,img') &&
        text.length < 230 &&
        fileHintRE.test(hintString(cursor))
      )
        best = cursor;
      cursor = cursor.parentElement;
    }
    return best;
  }

  function metadataNames(el: Element): string[] {
    const found: string[] = [];
    for (const attr of fileMetadataAttributes) {
      const val = el.getAttribute(attr);
      if (val) found.push(...extractNames(val));
    }
    return found;
  }

  function makeRecord(origin: Element, names: string[], type: string): void {
    if (seenOrigins.has(origin)) return;
    seenOrigins.add(origin);
    if (names.length) {
      for (const name of names) {
        const key = name.toLocaleLowerCase();
        if (seenNames.has(key)) continue;
        seenNames.add(key);
        records.push({
          name,
          type: (name.split('.').pop() || 'FILE').toUpperCase(),
          origin
        });
      }
    } else {
      const label =
        type === 'IMG'
          ? unnamedImages++ === 0
            ? 'Image attachment'
            : `Image attachment ${unnamedImages}`
          : unnamedFiles++ === 0
            ? `${type === 'FILE' ? 'File' : type} attachment`
            : `File attachment ${unnamedFiles}`;
      records.push({ name: label, type, origin });
    }
    if (origin !== source && origin !== user && source?.contains(origin))
      userAttachmentNodes.add(origin);
    roots.push(origin);
  }

  const all = [...turn.querySelectorAll('*')].filter(inUserArea);

  for (const el of all) {
    if (roots.some((root) => root === el || root.contains(el))) continue;
    const externalLink = el.closest('a[href^="http:"] , a[href^="https:"]');
    if (
      externalLink &&
      !isUserAttachmentShell(externalLink) &&
      !externalLink.closest(
        '[data-testid*="upload"],[data-testid*="attachment"]'
      )
    )
      continue;

    const hinted = isUserAttachmentShell(el);
    const attributes = metadataNames(el);
    const text = (el as HTMLElement).innerText || el.textContent || '';
    const leafNames =
      !el.children.length ||
      el.matches('button,a,[role="button"],[role="link"]')
        ? extractNames(text.slice(0, 220))
        : [];
    const names = [...new Set([...attributes, ...leafNames])];
    const root = cardRoot(el) || (hinted ? el : null);

    if (root && (names.length || hinted)) {
      const directNames = metadataNames(root);
      const rootText =
        (root as HTMLElement).innerText || root.textContent || '';
      const fullNames = [
        ...new Set(
          directNames.length
            ? directNames
            : [...names, ...extractNames(rootText.slice(0, 250))]
        )
      ];
      const icon = root.querySelector('img,svg,canvas');
      const type = fullNames.length
        ? 'FILE'
        : /\bpdf\b/i.test(rootText)
          ? 'PDF'
          : /\bzip\b/i.test(rootText)
            ? 'ZIP'
            : /image|thumbnail|photo/i.test(hintString(root)) ||
                !!root.querySelector('img')
              ? 'IMG'
              : icon
                ? 'FILE'
                : 'FILE';
      makeRecord(root, fullNames, type);
      continue;
    }

    if (names.length && !isProse(el)) {
      let cur = el.parentElement;
      let found: Element | null = null;
      for (
        let depth = 0;
        cur && depth < 5 && cur !== user && cur !== turn;
        depth++, cur = cur.parentElement
      ) {
        const curText = (cur as HTMLElement).innerText || cur.textContent || '';
        if (!inUserArea(cur) || cur === source || curText.length > 240) break;
        const st =
          typeof getComputedStyle !== 'undefined'
            ? getComputedStyle(cur)
            : ({} as CSSStyleDeclaration);
        const parentSt =
          cur.parentElement && typeof getComputedStyle !== 'undefined'
            ? getComputedStyle(cur.parentElement)
            : null;
        const fileLabel = /\b(?:PDF|ZIP|DOCX?|PNG|JPG|FILE|CSV)\b/i.test(
          curText
        );
        const icon = cur.querySelector('svg,[data-testid*="icon"],img');
        const cardVisual =
          st.cursor === 'pointer' ||
          (st.borderStyle && st.borderStyle !== 'none') ||
          (st.backgroundColor &&
            st.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
            (!parentSt || st.backgroundColor !== parentSt.backgroundColor));
        if (
          (fileLabel && icon) ||
          (icon && cardVisual) ||
          cur.matches('button,a,[role="button"],[role="link"]')
        ) {
          found = cur;
          break;
        }
      }
      if (found) makeRecord(found, names, 'FILE');
    }
  }

  for (const img of all.filter((el) => el.tagName === 'IMG')) {
    if (roots.some((root) => root === img || root.contains(img))) continue;
    if (isProse(img)) continue;
    const imgEl = img as HTMLImageElement;
    const r =
      typeof img.getBoundingClientRect === 'function'
        ? img.getBoundingClientRect()
        : { width: 0, height: 0 };
    if (
      Math.max(r.width, imgEl.naturalWidth || 0) < 52 ||
      Math.max(r.height, imgEl.naturalHeight || 0) < 40
    )
      continue;
    const root = cardRoot(img) || img;
    const names = [...metadataNames(root), ...metadataNames(img)];
    makeRecord(root, names, 'IMG');
  }

  for (const rec of records)
    wrapper.appendChild(attachmentPill(doc, rec.name, rec.type));
  return wrapper;
}
