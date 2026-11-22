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
import type { DomCleanerOptions, ConversationRole } from '../types.js';

export function createDomCleaner({ doc, snapshotCache, userAttachmentNodes }: DomCleanerOptions) {
  function clean(node: Node, inVisualLayout = false, role: ConversationRole = 'assistant'): Node {
    if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return doc.createDocumentFragment();

    const element = node as HTMLElement;
    if (role === 'user' && (element.tagName === 'IMG' || userAttachmentNodes.has(element))) {
      return doc.createDocumentFragment();
    }

    if (role === 'assistant' && snapshotCache.has(element)) {
      const image = doc.createElement('img');
      image.className = 'component-snapshot';
      const cached = snapshotCache.get(element);
      if (cached) image.src = cached;
      image.alt = element.getAttribute('aria-label') || 'Static view of conversation visualization';
      copyMediaDimensions(element, image, 'IMG');
      return image;
    }

    if (isCitationBadge(element, role)) return doc.createDocumentFragment();

    const tag = element.tagName.toUpperCase();
    if (tag === 'PRE') {
      const pre = doc.createElement('pre');
      const code = doc.createElement('code');
      code.textContent = extractCodeText(element);
      pre.appendChild(code);
      return pre;
    }

    if ((ignoredTags.has(tag) && !(tag === 'BUTTON' && isDownloadLabel(element.textContent))) ||
        (element as HTMLElement).hidden || element.getAttribute('aria-hidden') === 'true' ||
        element.getAttribute('data-markdown-copy') === 'exclude' ||
        element.classList.contains('turn-action-controls')) {
      return doc.createDocumentFragment();
    }

    if (tag === 'CANVAS') {
      try {
        const image = doc.createElement('img');
        image.src = (element as HTMLCanvasElement).toDataURL('image/png');
        image.alt = element.getAttribute('aria-label') || 'Conversation illustration';
        copyMediaDimensions(element, image, 'IMG');
        return image;
      } catch {
        return doc.createDocumentFragment();
      }
    }

    // Keep simple CSS background images that are used instead of <img> elements.
    if (['DIV', 'SPAN'].includes(tag) && !element.children.length && !element.textContent?.trim()) {
      if (typeof getComputedStyle !== 'undefined') {
        const bg = getComputedStyle(element).backgroundImage || '';
        const match = /^url\(["']?(.*?)["']?\)$/.exec(bg);
        if (match) {
          const url = safeURL(match[1], true);
          if (url) {
            const img = doc.createElement('img');
            img.src = url;
            img.alt = element.getAttribute('aria-label') || 'Conversation image';
            copyMediaDimensions(element, img, 'IMG');
            return img;
          }
        }
      }
    }

    const isSVG = svgTags.has(tag);
    const svgCase: Record<string, string> = {
      CLIPPATH: 'clipPath',
      LINEARGRADIENT: 'linearGradient',
      RADIALGRADIENT: 'radialGradient',
      FOREIGNOBJECT: 'foreignObject'
    };

    const out: HTMLElement | SVGElement = isSVG
      ? (doc.createElementNS('http://www.w3.org/2000/svg', element.localName || svgCase[tag] || tag.toLowerCase()) as SVGElement)
      : doc.createElement(htmlTags.has(tag) ? tag.toLowerCase() : 'div');

    if (isSVG) {
      for (const attribute of Array.from(element.attributes)) {
        if (!svgAttrs.has(attribute.name)) continue;
        // Prevent SVG references to external resources.
        if (/url\(/i.test(attribute.value) && !/^url\(#[A-Za-z0-9_-]+\)$/.test(attribute.value)) continue;
        if (attribute.name === 'href' || attribute.name === 'xlink:href') {
          if (attribute.value.startsWith('#')) {
            out.setAttribute(attribute.name, attribute.value);
          } else {
            const u = safeURL(attribute.value, true);
            if (u) out.setAttribute(attribute.name, u);
          }
        } else {
          out.setAttribute(attribute.name, attribute.value);
        }
      }
    } else {
      for (const attr of htmlAttrs[tag] || []) {
        const value = tag === 'IMG' && attr === 'src'
          ? ((element as HTMLImageElement).currentSrc || element.getAttribute(attr))
          : element.getAttribute(attr);
        if (!value) continue;
        if (attr === 'href' || attr === 'src') {
          const url = safeURL(value, attr === 'src');
          if (url) {
            out.setAttribute(attr, url);
          } else if (attr === 'href' && isDownloadLabel(element.textContent)) {
            markChatOnlyLink(out);
          }
        } else {
          out.setAttribute(attr, value);
        }
      }
    }

    if (!isSVG && shouldPreserveLines(element, tag)) out.classList.add('preserve-lines');
    if (tag === 'IMG' || tag === 'SVG') copyMediaDimensions(element, out as HTMLElement, tag);
    if (!isSVG) addVisualLayout(element, out as HTMLElement);

    const visualMode = inVisualLayout || out.classList.contains('export-visual-grid') || out.classList.contains('export-visual-row');
    for (const child of Array.from(element.childNodes)) {
      out.appendChild(clean(child, visualMode, role));
    }

    if (tag === 'A' && !out.hasAttribute('href') && isDownloadLabel(element.textContent)) {
      const label = doc.createElement('span');
      label.className = 'chat-only-download';
      while (out.firstChild) label.appendChild(out.firstChild);
      return label;
    }

    if (!isSVG && tag !== 'A' && element.getAttribute('role') === 'link') {
      const u = safeURL(element.getAttribute('data-href') || element.getAttribute('href'));
      if (u) {
        const link = doc.createElement('a');
        link.href = u;
        while (out.firstChild) link.appendChild(out.firstChild);
        out.appendChild(link);
      }
    }

    if (tag === 'BUTTON' && isDownloadLabel(element.textContent)) {
      const label = doc.createElement('span');
      label.textContent = (element.textContent || '').trim();
      label.classList.add('chat-only-download');
      return label;
    }

    if (tag === 'TABLE') normalizeTableHeader(out, doc);

    // Removing a standalone citation can leave an empty paragraph or wrapper.
    // Prune only empty prose wrappers (not tables, SVG diagrams or line breaks
    // inside code) so the citation doesn't leave a blank gap in the PDF.
    if (['P', 'DIV', 'SPAN'].includes(tag) && !out.textContent?.trim() &&
        !out.querySelector('img, svg, table, pre, blockquote, hr, figure, br, .export-color-block, .export-visual-grid, .export-visual-row')) {
      if (visualMode && hasVisualBox(element)) {
        preserveVisualBox(element, out as HTMLElement);
        return out;
      }
      return doc.createDocumentFragment();
    }

    // Some links are rendered by ChatGPT as unadorned host-action labels.
    if (tag === 'P' && !out.querySelector('a') && isDownloadLabel(element.textContent) &&
        (element.textContent || '').trim().length < 100) {
      out.classList.add('chat-only-download');
    }

    return out;
  }

  return clean;
}
