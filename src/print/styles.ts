import { quotedCSS } from '../utils.js';
import { palette } from '../config.js';
import type { ExportSettings } from '../types.js';

export interface PrintStylesOptions {
  title: string;
  exportDate: string;
  opts: ExportSettings;
}

export function generatePrintStyles({
  title,
  exportDate,
  opts
}: PrintStylesOptions): string {
  const pal = palette[opts.theme];
  const pageHeader = opts.titleAndDate
    ? `
    @top-left { content: ${quotedCSS(title)}; font: 8pt Arial, sans-serif; color: ${pal.muted}; }
    @top-right { content: ${quotedCSS(exportDate)}; font: 8pt Arial, sans-serif; color: ${pal.muted}; }
  `
    : '';
  const pageFooter = opts.pageNumbers
    ? `
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial, sans-serif; color: ${pal.muted}; }
  `
    : '';

  return `
    @page {
      size: ${opts.paper};
      margin: 19mm 17mm 19mm;
      background: ${pal.page};
      ${pageHeader}
      ${pageFooter}
    }
    @page:first { @top-left { content: none; } @top-right { content: none; } }
    :root {
      --page: ${pal.page}; --text: ${pal.text}; --muted: ${pal.muted};
      --border: ${pal.border}; --user: ${pal.user}; --code: ${pal.code};
      --table-head: ${pal.table}; --stripe: ${pal.stripe};
      --accent: ${pal.accent}; --inline: ${pal.inline};
      --user-line: ${pal.userLine};
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--page); color: var(--text); }
    body { font: 10.5pt/1.53 Arial, Helvetica, sans-serif; overflow-wrap: anywhere; }
    .doc-header { padding: 0 0 5mm; margin: 0 0 7mm; border-bottom: 1px solid var(--border); }
    .doc-header h1 { font-size: 21pt; letter-spacing: -.02em; line-height: 1.2; margin: 0 0 2mm; font-weight: 700; }
    .doc-meta { color: var(--muted); font-size: 8.4pt; }
    .doc-meta a { color: inherit; text-decoration: underline; }
    .export-scan-warning {border:1px solid #dc9253;background:#fff3d8;color:#653508;padding:3mm;border-radius:2mm;margin:0 0 6mm;font:9pt/1.45 Arial,sans-serif;}
    /* Fragment long messages freely. Avoid keeping a whole answer or a
       long multiline user message on one page. */
    .message { margin: 0 0 6mm; break-inside: auto; }
    .message.short-message { break-inside: avoid-page; }
    .message.user { break-after: auto; page-break-after: auto;
      border-left: 3px solid var(--user-line); border-radius: 2.5mm;
      padding: 3mm 4mm 3mm 3.5mm;
      ${opts.userBubbles ? 'background: var(--user);' : 'background: transparent;'}
    }
    /* Only a compact question should stay with the beginning of an answer.
       Do not chain multiple avoid rules across large answer sections. */
    .message.user.keep-with-answer { break-after: avoid-page; }
    .message.assistant .role { break-after: avoid-page; }
    .role { font: 700 8pt/1.4 Arial, sans-serif; letter-spacing: .075em; text-transform: uppercase;
            color: var(--muted); margin: 0 0 2mm; break-after: avoid-page; }
    .message.user .role { color: var(--user-line); font-weight: 800; letter-spacing: .09em;
      font-size: 8.3pt; margin-bottom: 2.3mm; }
    .message.user .message-content { background: transparent; padding: 0; }
    .message-content > :last-child, .message-content > div > :last-child { margin-bottom: 0; }
    h1,h2,h3,h4,h5,h6 { line-height: 1.28; color: var(--text); margin: 5mm 0 2mm; break-after: avoid; }
    .message-content h1 { font-size: 18pt; }
    .message-content h2 { font-size: 14.3pt; }
    .message-content h3 { font-size: 11.5pt; }
    .message-content h4,.message-content h5,.message-content h6 { font-size: 10.5pt; }
    p { margin: 0 0 2.7mm; orphans: 3; widows: 3; }
    ul, ol { margin: 1.8mm 0 3mm; padding-left: 6.5mm; }
    li { padding-left: .6mm; margin: 0 0 1mm; }
    /* Keep original newlines without making an entire JSON/configuration block unbreakable. */
    .preserve-lines { white-space: pre-wrap; overflow-wrap: anywhere; break-inside: auto; }
    pre { display: block; margin: 2.5mm 0 3.5mm; padding: 3mm 3.5mm;
          background: var(--code); border: 1px solid var(--border); border-radius: 2mm;
          white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word;
          font: 8.7pt/1.45 Consolas, 'Liberation Mono', monospace; break-inside: auto; }
    code, kbd { font: .91em/1.4 Consolas, 'Liberation Mono', monospace;
                background: var(--inline); border-radius: 1mm; padding: .25mm .7mm; }
    pre code { font: inherit; background: transparent; padding: 0; border: 0; }
    table { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 9pt;
            table-layout: auto; break-inside: auto; }
    thead { display: table-header-group !important; }
    thead tr { break-inside: avoid; }
    tfoot { display: table-footer-group; }
    th, td { padding: 2mm 2.5mm; border: 1px solid var(--border); text-align: left;
             vertical-align: top; overflow-wrap: anywhere; }
    th { background: var(--table-head); font-weight: 700; }
    tbody tr:nth-child(even) { background: var(--stripe); }
    tr { break-inside: avoid; }
    blockquote { border-left: 3px solid var(--border); padding: 1mm 0 1mm 3mm;
                 margin: 3mm 0; color: var(--muted); }
    a { color: var(--accent); text-decoration: underline; overflow-wrap: anywhere; }
    img, svg, canvas { max-width: 100%; height: auto; break-inside: avoid; }
    .export-image { object-fit: contain; }
    .export-visual-grid { display: grid; gap: 3mm; align-items: start; break-inside: avoid-page; }
    .export-visual-row { display: flex; flex-direction: row; gap: 3mm; align-items: flex-start; break-inside: avoid-page; }
    .export-visual-grid > *, .export-visual-row > * { min-width: 0; max-width: 100%; }
    .export-visual-grid img, .export-visual-row img { max-width: 100%; max-height: 60mm; }
    .export-color-block { display: block; min-width: 8px; }
    .message-attachments { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 2.5mm; }
    .attachment-pill { display: inline-flex; align-items: center; max-width: 100%; padding: 1.25mm 2.3mm;
      gap: 1.5mm; border: 1px solid var(--border); background: var(--code); border-radius: 20mm;
      font-size: 8pt; break-inside: avoid; overflow-wrap: anywhere; }
    .attachment-pill .attachment-type { color: var(--accent); font: 700 7pt Arial,sans-serif;
      min-width: 3mm; }
    .chat-only-download::after { content: ' (available in original conversation)';
      font-size: .82em; color: var(--muted); }
    .component-snapshot { max-width: 100%; max-height: 128mm; object-fit: contain;
      break-inside: avoid-page; display: block; }

    .message-content img, .message-content svg { vertical-align: middle; }
    .message-content > div > img, .message-content figure img,
    .message-content > div > svg, figure svg { display: block; margin: 2mm auto; }
    img { max-height: 112mm; object-fit: contain; }
    .message-content figure img { max-height: 118mm; }
    figure { margin: 3mm 0; break-inside: auto; }
    figure:has(img,svg,canvas) { break-inside: avoid-page; }
    figcaption { font-size: 8.3pt; color: var(--muted); }
    hr { border: 0; border-top: 1px solid var(--border); margin: 4mm 0; }
    .message-content :first-child { margin-top: 0; }
    @media print {
      html, body, .message-content, table, th, td, pre, code {
        print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
      }
    }
  `;
}
