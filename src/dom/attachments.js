import {
  fileNameRE,
  fileExtensionRE,
  fileHintRE,
  fileMetadataAttributes
} from '../config.js';

export function hasContent(element) {
  return !!element && (!!element.innerText?.trim() || !!element.querySelector('img, svg, canvas, pre'));
}

export function attachmentPill(doc, label, type) {
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

export function hintString(element) {
  return [element.className, element.getAttribute('data-testid'), element.getAttribute('data-type'),
    element.getAttribute('data-kind'), element.getAttribute('data-component'), element.getAttribute('role')]
    .filter(v => typeof v === 'string').join(' ');
}

export function isUserAttachmentShell(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
  // Element role is critical: a user message bubble itself must NEVER be
  // discarded just because it happens to contain an upload chip.
  if (element.classList.contains('bg-user-message') || element.matches('.group\\/user-message')) return false;
  return fileHintRE.test(hintString(element)) &&
    ((element.innerText || '').length < 360 || !!element.querySelector('img'));
}

export function extractNames(value) {
  if (!value || typeof value !== 'string') return [];
  const matches = [];
  const lines = value.split(/[\r\n]+/).map(v => v.trim()).filter(Boolean);
  // Try separate lines first. Many ChatGPT attachment cards contain
  // `PDF` on one line and the filename on the next.
  for (const line of lines) {
    if (line.length > 220) continue;
    const pieces = line.match(fileNameRE) || [];
    for (let piece of pieces) {
      piece = piece.trim().replace(/^(?:(?:OPEN|DOWNLOAD|VIEW)\s+(?:FILE\s+)?|(?:PDF|FILE|IMAGE|ZIP|DOCX?|PNG|JPG)\s+)+/i, '').trim();
      if (fileExtensionRE.test(piece)) matches.push(piece);
    }
  }
  return matches;
}

export function extractAttachments(doc, turn, user, source, assistantSources, userAttachmentNodes) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'message-attachments';
  if (!turn || !user) return wrapper;
  const firstAssistant = assistantSources[0] || null;
  const seenNames = new Set();
  const seenOrigins = new Set();
  let unnamedImages = 0, unnamedFiles = 0;
  const records = [];
  const roots = [];
  const before = (a, b) => !!a && !!b && a !== b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  const inUserArea = (el) => {
    if (!turn.contains(el) || el.closest('.turn-action-controls,[data-markdown-copy="exclude"]')) return false;
    if (assistantSources.some(a => a === el || a.contains(el))) return false;
    if (firstAssistant && !before(el, firstAssistant)) return false;
    return user.contains(el) || el === user || before(user, el);
  };
  const isProse = (el) => !!el.closest('p, pre, code, blockquote, h1, h2, h3, h4, h5, h6, li, table, .markdown');
  function cardRoot(el) {
    let cursor = el, depth = 0, best = null;
    while (cursor && cursor !== turn && depth++ < 8) {
      if (!inUserArea(cursor) || cursor === source || cursor === user) break;
      if ((cursor.innerText || '').length > 450) break;
      if (isUserAttachmentShell(cursor)) best = cursor;
      if (cursor.matches('button,a,[role="button"],[role="link"]')) best = best || cursor;
      if (!best && cursor.querySelector('svg,img') &&
          (cursor.innerText || '').length < 230 && fileHintRE.test(hintString(cursor))) best = cursor;
      cursor = cursor.parentElement;
    }
    return best;
  }
  function metadataNames(el) {
    const found = [];
    for (const attr of fileMetadataAttributes) found.push(...extractNames(el.getAttribute(attr)));
    return found;
  }
  function makeRecord(origin, names, type) {
    if (seenOrigins.has(origin)) return;
    seenOrigins.add(origin);
    if (names.length) {
      for (const name of names) {
        const key = name.toLocaleLowerCase();
        if (seenNames.has(key)) continue;
        seenNames.add(key);
        records.push({name, type: name.split('.').pop().toUpperCase(), origin});
      }
    } else {
      const label = type === 'IMG' ?
        (unnamedImages++ === 0 ? 'Image attachment' : `Image attachment ${unnamedImages}`) :
        (unnamedFiles++ === 0 ? `${type === 'FILE' ? 'File' : type} attachment` : `File attachment ${unnamedFiles}`);
      records.push({name: label, type, origin});
    }
    if (origin !== source && origin !== user && source?.contains(origin)) userAttachmentNodes.add(origin);
    roots.push(origin);
  }
  const all = [...turn.querySelectorAll('*')].filter(inUserArea);
  // Pass one: find explicit file cards and their labels, even when the card
  // uses only generic DIV/BUTTON markup. Give metadata precedence over text.
  for (const el of all) {
    if (roots.some(root => root === el || root.contains(el))) continue;
    // A normal user-authored link to `report.pdf` is text/link content,
    // not evidence of a file upload. Explicit upload cards are exempt.
    const externalLink = el.closest('a[href^="http:"] , a[href^="https:"]');
    if (externalLink && !isUserAttachmentShell(externalLink) &&
        !externalLink.closest('[data-testid*="upload"],[data-testid*="attachment"]')) continue;
    const hinted = isUserAttachmentShell(el);
    const attributes = metadataNames(el);
    const leafNames = (!el.children.length || el.matches('button,a,[role="button"],[role="link"]'))
      ? extractNames((el.innerText || '').slice(0, 220)) : [];
    const names = [...new Set([...attributes, ...leafNames])];
    const root = cardRoot(el) || (hinted ? el : null);
    if (root && (names.length || hinted)) {
      const directNames = metadataNames(root);
      const fullNames = [...new Set(directNames.length ? directNames :
        [...names, ...extractNames((root.innerText || '').slice(0, 250))])];
      const icon = root.querySelector('img,svg,canvas');
      const type = fullNames.length ? 'FILE' :
        /\bpdf\b/i.test(root.innerText || '') ? 'PDF' :
        /\bzip\b/i.test(root.innerText || '') ? 'ZIP' :
        /image|thumbnail|photo/i.test(hintString(root)) || !!root.querySelector('img') ? 'IMG' :
        icon ? 'FILE' : 'FILE';
      makeRecord(root, fullNames, type);
      continue;
    }
    // Generic file tile: the filename is in a child span, a PDF/file icon
    // is its sibling, and the wrapper itself has no attachment-themed class.
    if (names.length && !isProse(el)) {
      let cur = el.parentElement, found = null;
      for (let depth = 0; cur && depth < 5 && cur !== user && cur !== turn; depth++, cur = cur.parentElement) {
        if (!inUserArea(cur) || cur === source || (cur.innerText || '').length > 240) break;
        const st = getComputedStyle(cur);
        const fileLabel = /\b(?:PDF|ZIP|DOCX?|PNG|JPG|FILE|CSV)\b/i.test(cur.innerText || '');
        const icon = cur.querySelector('svg,[data-testid*="icon"],img');
        const cardVisual = st.cursor === 'pointer' || st.borderStyle !== 'none' ||
          st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== getComputedStyle(cur.parentElement).backgroundColor;
        if ((fileLabel && icon) || (icon && cardVisual) ||
            cur.matches('button,a,[role="button"],[role="link"]')) { found = cur; break; }
      }
      if (found) makeRecord(found, names, 'FILE');
    }
  }
  // Pass two: unknown user-uploaded images, including screenshots without
  // a real filename. Ignore icons inside already detected file cards.
  for (const img of all.filter(el => el.tagName === 'IMG')) {
    if (roots.some(root => root === img || root.contains(img))) continue;
    if (isProse(img)) continue;
    const r = img.getBoundingClientRect();
    if (Math.max(r.width, img.naturalWidth) < 52 || Math.max(r.height, img.naturalHeight) < 40) continue;
    const root = cardRoot(img) || img;
    const names = [...metadataNames(root), ...metadataNames(img)];
    makeRecord(root, names, 'IMG');
  }
  for (const rec of records) wrapper.appendChild(attachmentPill(doc, rec.name, rec.type));
  return wrapper;
}
