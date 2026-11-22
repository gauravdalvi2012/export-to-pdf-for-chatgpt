import { describe, it, expect } from 'vitest';
import { createDomCleaner } from '../../src/dom/cleaner.js';

describe('DOM cleaner sanitization and transformation', () => {
  const doc = document.implementation.createHTMLDocument('Test Document');

  it('removes script, style, and turn action controls from assistant output', () => {
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes: new Set()
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <p>Valid paragraph text</p>
      <script>alert("malicious")</script>
      <style>body { display: none; }</style>
      <div class="turn-action-controls">
        <button>Copy</button>
        <button>Regenerate</button>
      </div>
    `;

    const cleaned = cleaner(container, false, 'assistant') as HTMLElement;
    expect(cleaned.querySelector('script')).toBeNull();
    expect(cleaned.querySelector('style')).toBeNull();
    expect(cleaned.querySelector('.turn-action-controls')).toBeNull();
    expect(cleaned.querySelector('p')?.textContent).toBe(
      'Valid paragraph text'
    );
  });

  it('sanitizes unsafe javascript: links while preserving safe https links', () => {
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes: new Set()
    });

    const container = document.createElement('div');
    const safeLink = document.createElement('a');
    safeLink.href = 'https://chatgpt.com/overview';
    safeLink.textContent = 'Safe Link';

    const unsafeLink = document.createElement('a');
    unsafeLink.setAttribute('href', 'javascript:alert(1)');
    unsafeLink.textContent = 'Unsafe Link';

    container.append(safeLink, unsafeLink);

    const cleaned = cleaner(container, false, 'assistant') as HTMLElement;
    const safeLinks = cleaned.querySelectorAll('a[href]');
    expect(safeLinks.length).toBe(1);
    expect(safeLinks[0].getAttribute('href')).toBe(
      'https://chatgpt.com/overview'
    );

    const unsafeLinkCleaned = cleaned.querySelectorAll('a')[1];
    expect(unsafeLinkCleaned.hasAttribute('href')).toBe(false);
  });

  it('substitutes cached visual widgets with static snapshot images', () => {
    const widget = document.createElement('div');
    widget.className = 'interactive-chart-widget';
    widget.setAttribute('aria-label', 'Monthly Revenue Chart');

    const snapshotCache = new Map<Element, string>();
    snapshotCache.set(
      widget,
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );

    const cleaner = createDomCleaner({
      doc,
      snapshotCache,
      userAttachmentNodes: new Set()
    });

    const cleaned = cleaner(widget, false, 'assistant') as HTMLImageElement;
    expect(cleaned.tagName).toBe('IMG');
    expect(cleaned.className).toContain('component-snapshot');
    expect(cleaned.src).toContain('data:image/png;base64');
    expect(cleaned.alt).toBe('Monthly Revenue Chart');
  });

  it('strips user-uploaded images and attachment nodes from user messages', () => {
    const userImg = document.createElement('img');
    userImg.src = 'blob:chatgpt/image-1';
    const attachmentCard = document.createElement('div');
    attachmentCard.textContent = 'my_code.py';

    const userAttachmentNodes = new Set<Element>([attachmentCard]);
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes
    });

    const userContainer = document.createElement('div');
    const userPrompt = document.createElement('p');
    userPrompt.textContent = 'Can you fix this python file?';
    userContainer.append(userImg, attachmentCard, userPrompt);

    const cleaned = cleaner(userContainer, false, 'user') as HTMLElement;
    expect(cleaned.querySelector('img')).toBeNull();
    expect(cleaned.textContent).not.toContain('my_code.py');
    expect(cleaned.textContent).toContain('Can you fix this python file?');
  });

  it('normalizes tables by generating a thead when headings are inside tbody', () => {
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes: new Set()
    });

    const table = document.createElement('table');
    table.innerHTML = `
      <tbody>
        <tr><th>Column A</th><th>Column B</th></tr>
        <tr><td>Val 1</td><td>Val 2</td></tr>
      </tbody>
    `;

    const cleaned = cleaner(table, false, 'assistant') as HTMLTableElement;
    expect(cleaned.querySelector('thead')).not.toBeNull();
    expect(cleaned.querySelector('thead th')?.textContent).toBe('Column A');
  });

  it('preserves code blocks and formats pre elements', () => {
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes: new Set()
    });

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'const answer = 42;\nconsole.log(answer);';
    pre.appendChild(code);

    const cleaned = cleaner(pre, false, 'assistant') as HTMLPreElement;
    expect(cleaned.tagName).toBe('PRE');
    expect(cleaned.querySelector('code')?.textContent).toBe(
      'const answer = 42;\nconsole.log(answer);'
    );
  });

  it('sanitizes SVG elements keeping valid attributes', () => {
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes: new Set()
    });

    const div = document.createElement('div');
    div.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" onclick="malicious()">
        <path d="M0 0h24v24H0z" fill="currentColor"/>
      </svg>
    `;

    const cleaned = cleaner(div, false, 'assistant') as HTMLElement;
    const svg = cleaned.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.hasAttribute('onclick')).toBe(false);
    expect(svg?.getAttribute('width')).toBe('24');
  });

  it('transforms download buttons and links into chat-only download labels', () => {
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes: new Set()
    });

    const div = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = 'Download analysis.xlsx';

    const link = document.createElement('a');
    link.textContent = 'View report.pdf';

    div.append(btn, link);

    const cleaned = cleaner(div, false, 'assistant') as HTMLElement;
    const labels = cleaned.querySelectorAll('.chat-only-download');
    expect(labels.length).toBe(2);
  });

  it('prunes empty paragraphs or spans left by removed widgets or citations', () => {
    const cleaner = createDomCleaner({
      doc,
      snapshotCache: { get: () => undefined, has: () => false },
      userAttachmentNodes: new Set()
    });

    const div = document.createElement('div');
    const pEmpty = document.createElement('p');
    pEmpty.textContent = '   ';
    div.appendChild(pEmpty);

    const cleaned = cleaner(div, false, 'assistant') as HTMLElement;
    expect(cleaned.querySelector('p')).toBeNull();
  });
});
