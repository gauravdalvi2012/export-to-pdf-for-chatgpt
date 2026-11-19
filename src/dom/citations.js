import { safeURL } from '../utils.js';

// Source-citation UI is not part of the exported document. Never click
// citation controls or resolve citation URLs. Detect both named citation
// components and compact favicon/popover pills used by newer ChatGPT DOMs.
// Keep normal web links, images, and ordinary brand mentions intact.
export function isCitationBadge(node, role) {
  if (role !== 'assistant' || !(node instanceof Element)) return false;
  const tag = node.tagName.toUpperCase();
  if (!['DIV', 'SPAN', 'A', 'BUTTON', 'SUP'].includes(tag)) return false;
  const label = (node.textContent || '').replace(/\s+/g, ' ').trim();
  if (label.length > 125) return false;
  if (node.querySelector('p,h1,h2,h3,h4,h5,h6,table,ul,ol,pre,figure,blockquote')) return false;
  const rect = node.getBoundingClientRect();
  if ((rect.width && rect.width > 350) || (rect.height && rect.height > 70)) return false;

  const hint = [node.className, node.getAttribute('data-testid'),
    node.getAttribute('data-citation-id'), node.getAttribute('data-source-id'),
    node.getAttribute('aria-label'), node.getAttribute('data-popover-trigger')]
    .filter(value => typeof value === 'string').join(' ');
  const namedCitation = /(?:citation|cite[-_ ]|source[-_ ]?(?:pill|badge|link|reference|chip|popover)|web[-_ ]?source|footnote[-_ ]?(?:link|badge))/i.test(hint);
  if (namedCitation) return true;

  if (!label || label.length > 60 || label.includes('\n')) return false;
  if (node.matches('a[href]') && safeURL(node.getAttribute('href'))) return false;
  if (node.querySelector('a[href^="http:"] , a[href^="https:"]')) return false;
  const icons = [...node.querySelectorAll('img,svg')];
  if (icons.length < 1 || icons.length > 3) return false;
  if (icons.some(icon => {
    const r = icon.getBoundingClientRect();
    return r.width > 30 || r.height > 30;
  })) return false;

  const style = getComputedStyle(node);
  const parentStyle = node.parentElement ? getComputedStyle(node.parentElement) : null;
  const background = style.backgroundColor;
  const hasBadgeBackground = background && background !== 'transparent' &&
    background !== 'rgba(0, 0, 0, 0)' &&
    (!parentStyle || background !== parentStyle.backgroundColor);
  const hasRoundedShape = (parseFloat(style.borderTopLeftRadius) || 0) >= 5;
  const classIsPill = /(?:rounded-full|rounded-md|rounded-lg|badge|pill|chip)/i.test(hint);
  const looksLikePill = (hasRoundedShape && hasBadgeBackground) || classIsPill;
  const interactive = node.matches('[role="button"],[aria-haspopup],[data-state],button,[tabindex]') ||
    !!node.querySelector('[role="button"],[aria-haspopup],[data-state],button');

  // A source badge normally sits inside/just after a prose paragraph. This
  // additional constraint avoids stripping actual assistant diagrams,
  // legends, cards, and other icon+text content.
  const parent = node.parentElement;
  const sibling = node.previousElementSibling || parent?.previousElementSibling;
  const nextToProse = !!node.closest('p') ||
    (!!sibling && (sibling.matches('p') ||
      (sibling.textContent || '').trim().length > 55)) ||
    (parent?.tagName === 'P');
  return !!((looksLikePill && (interactive || nextToProse)) ||
    (interactive && nextToProse && label.length <= 35 && rect.height <= 32));
}
