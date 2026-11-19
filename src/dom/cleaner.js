import {
  htmlTags,
  svgTags,
  htmlAttrs,
  svgAttrs,
  ignoredTags
} from '../config.js';
import { safeURL } from '../utils.js';
import { isCitationBadge } from './citations.js';
import { extractCodeText, shouldPreserveLines } from './code.js';
import {
  isDownloadLabel,
  markChatOnlyLink,
  copyMediaDimensions,
  addVisualLayout,
  hasVisualBox,
  preserveVisualBox,
  normalizeTableHeader
} from './visual.js';

export function createDomCleaner({ doc, snapshotCache, userAttachmentNodes }) {
  function clean(node, inVisualLayout = false, role = 'assistant') {
    if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return doc.createDocumentFragment();
    if (role === 'user' && (node.tagName === 'IMG' || userAttachmentNodes.has(node))) return doc.createDocumentFragment();
    if (role === 'assistant' && snapshotCache.has(node)) {
      const image = doc.createElement('img');
      image.className = 'component-snapshot';
      image.src = snapshotCache.get(node);
      image.alt = node.getAttribute('aria-label') || 'Static view of conversation visualization';
      copyMediaDimensions(node, image, 'IMG');
      return image;
    }
    if (isCitationBadge(node, role)) return doc.createDocumentFragment();
    const tag = node.tagName.toUpperCase();
    if (tag === 'PRE') {
      const pre = doc.createElement('pre');
      const code = doc.createElement('code');
      code.textContent = extractCodeText(node);
      pre.appendChild(code);
      return pre;
    }
    if ((ignoredTags.has(tag) && !(tag === 'BUTTON' && isDownloadLabel(node.textContent))) || node.hidden || node.getAttribute('aria-hidden') === 'true' ||
        node.getAttribute('data-markdown-copy') === 'exclude' ||
        node.classList.contains('turn-action-controls')) {
      return doc.createDocumentFragment();
    }

    if (tag === 'CANVAS') {
      try {
        const image = doc.createElement('img');
        image.src = node.toDataURL('image/png');
        image.alt = node.getAttribute('aria-label') || 'Conversation illustration';
        copyMediaDimensions(node, image, 'IMG');
        return image;
      } catch { return doc.createDocumentFragment(); }
    }

    // Keep simple CSS background images that are used instead of <img> elements.
    if (['DIV', 'SPAN'].includes(tag) && !node.children.length && !node.textContent?.trim()) {
      const bg = getComputedStyle(node).backgroundImage || '';
      const match = /^url\(["']?(.*?)["']?\)$/.exec(bg);
      if (match) {
        const url = safeURL(match[1], true);
        if (url) {
          const img = doc.createElement('img'); img.src = url;
          img.alt = node.getAttribute('aria-label') || 'Conversation image';
          copyMediaDimensions(node, img, 'IMG'); return img;
        }
      }
    }
    const isSVG = svgTags.has(tag);
    const svgCase = { CLIPPATH: 'clipPath', LINEARGRADIENT: 'linearGradient', RADIALGRADIENT: 'radialGradient', FOREIGNOBJECT: 'foreignObject' };
    const out = isSVG
      ? doc.createElementNS('http://www.w3.org/2000/svg', node.localName || svgCase[tag] || tag.toLowerCase())
      : doc.createElement(htmlTags.has(tag) ? tag.toLowerCase() : 'div');

    if (isSVG) {
      for (const attribute of node.attributes) {
        if (!svgAttrs.has(attribute.name)) continue;
        // Prevent SVG references to external resources.
        if (/url\(/i.test(attribute.value) && !/^url\(#[A-Za-z0-9_-]+\)$/.test(attribute.value)) continue;
        if (attribute.name === 'href' || attribute.name === 'xlink:href') {
          if (attribute.value.startsWith('#')) out.setAttribute(attribute.name, attribute.value);
          else { const u = safeURL(attribute.value, true); if (u) out.setAttribute(attribute.name, u); }
        } else out.setAttribute(attribute.name, attribute.value);
      }
    } else {
      for (const attr of htmlAttrs[tag] || []) {
        const value = tag === 'IMG' && attr === 'src' ? (node.currentSrc || node.getAttribute(attr)) : node.getAttribute(attr);
        if (!value) continue;
        if (attr === 'href' || attr === 'src') {
          const url = safeURL(value, attr === 'src');
          if (url) out.setAttribute(attr, url);
          else if (attr === 'href' && isDownloadLabel(node.textContent)) markChatOnlyLink(out);
        } else {
          out.setAttribute(attr, value);
        }
      }
    }

    if (!isSVG && shouldPreserveLines(node, tag)) out.classList.add('preserve-lines');
    if (tag === 'IMG' || tag === 'SVG') copyMediaDimensions(node, out, tag);
    if (!isSVG) addVisualLayout(node, out);
    const visualMode = inVisualLayout || out.classList.contains('export-visual-grid') || out.classList.contains('export-visual-row');
    for (const child of node.childNodes) out.appendChild(clean(child, visualMode, role));
    if (tag === 'A' && !out.hasAttribute('href') && isDownloadLabel(node.textContent)) {
      const label = doc.createElement('span');
      label.className = 'chat-only-download';
      while (out.firstChild) label.appendChild(out.firstChild);
      return label;
    }
    if (!isSVG && tag !== 'A' && node.getAttribute('role') === 'link') {
      const u = safeURL(node.getAttribute('data-href') || node.getAttribute('href'));
      if (u) {
        const link = doc.createElement('a'); link.href = u;
        while (out.firstChild) link.appendChild(out.firstChild);
        out.appendChild(link);
      }
    }
    if (tag === 'BUTTON' && isDownloadLabel(node.textContent)) {
      const label = doc.createElement('span'); label.textContent = node.textContent.trim();
      label.classList.add('chat-only-download'); return label;
    }
    if (tag === 'TABLE') normalizeTableHeader(out, doc);
    // Removing a standalone citation can leave an empty paragraph or wrapper.
    // Prune only empty prose wrappers (not tables, SVG diagrams or line breaks
    // inside code) so the citation doesn't leave a blank gap in the PDF.
    if (['P', 'DIV', 'SPAN'].includes(tag) && !out.textContent.trim() &&
        !out.querySelector('img, svg, table, pre, blockquote, hr, figure, br, .export-color-block, .export-visual-grid, .export-visual-row')) {
      if (visualMode && hasVisualBox(node)) { preserveVisualBox(node, out); return out; }
      return doc.createDocumentFragment();
    }
    // Some links are rendered by ChatGPT as unadorned host-action labels.
    if (tag === 'P' && !out.querySelector('a') && isDownloadLabel(node.textContent) &&
        (node.textContent || '').trim().length < 100) {
      out.classList.add('chat-only-download');
    }
    return out;
  }

  return clean;
}
