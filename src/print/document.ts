import { sleep } from '../utils.js';
import { generatePrintStyles } from './styles.js';
import type { ExportSettings } from '../types.js';

export function isTransientProgress(item: Element, next?: Element | null, includeProgress = false): boolean {
  if (includeProgress || !next ||
      !item.classList.contains('assistant') || !next.classList.contains('assistant')) return false;
  const body = item.querySelector('.message-content');
  if (!body || body.querySelector('pre,table,figure,.message-attachments')) return false;
  const value = (body.textContent || '').replace(/\s+/g, ' ').trim();
  if (value.length > 560) return false;
  // Only hide status-like assistant updates when another assistant message
  // immediately follows. Never remove an answer just for being short.
  const phrases = [
    /^(?:i(?:'|’)ll|i will|i am|i(?:'|’)m)\s+(?:update|check|inspect|run|build|test|fix|review|compare|create|package|look|start)/i,
    /^(?:the|this|those)\s+.{1,120}\b(?:passed|failed|is ready|are ready)\b.{0,200}\b(?:checking|testing|packaging|rerunning|running)/i,
    /^(?:i found|i(?:'|’)ve (?:added|removed|updated|finished|found)).{0,160}\b(?:testing|checking|before packaging|next)\b/i,
    /\b(?:i(?:'|’)m|i(?:'|’)ll|i will)\s+(?:checking|testing|verifying|packaging|updating|changing|adding|building|generating|comparing|rerunning|running|reviewing|finishing)\b/i
  ];
  return phrases.some(re => re.test(value));
}

export interface AssembleDocumentOptions {
  doc: Document;
  title: string;
  sourceURL: string;
  exportDate: string;
  opts: ExportSettings;
  transcript: Element[];
  scanWarnings: string[];
}

export function assembleDocument({
  doc,
  title,
  sourceURL,
  exportDate,
  opts,
  transcript,
  scanWarnings
}: AssembleDocumentOptions): void {
  const css = doc.createElement('style');
  css.textContent = generatePrintStyles({ title, exportDate, opts });
  doc.head.appendChild(css);

  const meta = doc.createElement('meta');
  meta.setAttribute('charset', 'utf-8');
  doc.head.prepend(meta);

  const cover = doc.createElement('header');
  cover.className = 'doc-header';
  const heading = doc.createElement('h1');
  heading.textContent = title;
  cover.appendChild(heading);
  if (opts.titleAndDate) {
    const info = doc.createElement('div');
    info.className = 'doc-meta';
    info.append(`Exported ${exportDate}  ·  `);
    const link = doc.createElement('a');
    link.href = sourceURL;
    link.textContent = 'Open original conversation';
    info.appendChild(link);
    cover.appendChild(info);
  }
  doc.body.appendChild(cover);

  if (scanWarnings.length) {
    const warning = doc.createElement('p');
    warning.className = 'export-scan-warning';
    warning.textContent = 'Export may be incomplete: ' + scanWarnings.join(' ') +
      ' Try reloading the conversation and exporting again.';
    doc.body.appendChild(warning);
  }

  let omittedProgress = 0;
  transcript.forEach((section, index) => {
    if (isTransientProgress(section, transcript[index + 1], opts.includeProgress)) {
      omittedProgress++;
    } else {
      doc.body.appendChild(section);
    }
  });

  if (omittedProgress) console.info(`ChatGPT PDF: skipped ${omittedProgress} transient progress updates.`);
}

export function openPrintWindow(doc: Document): void {
  const file = new Blob(['<!doctype html>\n' + doc.documentElement.outerHTML], {
    type: 'text/html;charset=utf-8'
  });
  const url = URL.createObjectURL(file);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('Allow pop-ups for chatgpt.com to print the conversation.');
  }
  printWindow.addEventListener('load', async () => {
    try {
      await (printWindow.document as unknown as { fonts?: { ready: Promise<void> } }).fonts?.ready;
      await Promise.race([
        Promise.all(Array.from(printWindow.document.images).map((img) => img.complete ?
          Promise.resolve() : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }))),
        sleep(4000)
      ]);
    } catch { /* Images are best-effort; proceed to print. */ }
    printWindow.focus();
    printWindow.print();
  }, { once: true });
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
