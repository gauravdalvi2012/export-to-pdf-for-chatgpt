import { describe, it, expect } from 'vitest';
import { isCitationBadge } from '../../src/dom/citations.js';

describe('Citation removal without breaking real links', () => {
  it('does not strip citations for user role (only assistant)', () => {
    const badge = document.createElement('span');
    badge.className = 'citation-pill';
    badge.textContent = '1';
    expect(isCitationBadge(badge, 'user')).toBe(false);
  });

  it('detects explicit named citation badges and source pills', () => {
    const badge1 = document.createElement('span');
    badge1.className = 'source-badge';
    badge1.textContent = 'OBS';
    expect(isCitationBadge(badge1, 'assistant')).toBe(true);

    const badge2 = document.createElement('div');
    badge2.setAttribute('data-testid', 'citation-popover-trigger');
    badge2.textContent = 'GitHub';
    expect(isCitationBadge(badge2, 'assistant')).toBe(true);

    const badge3 = document.createElement('span');
    badge3.setAttribute('data-citation-id', 'cite-42');
    badge3.textContent = 'Wikipedia';
    expect(isCitationBadge(badge3, 'assistant')).toBe(true);

    const footnote = document.createElement('sup');
    footnote.className = 'footnote-badge';
    footnote.textContent = '[1]';
    expect(isCitationBadge(footnote, 'assistant')).toBe(true);
  });

  it('keeps genuine hyperlinks intact even if they have badge-like classes', () => {
    const link = document.createElement('a');
    link.href = 'https://github.com/gauravdalvi2012/export-to-pdf-for-chatgpt';
    link.className = 'badge';
    link.textContent = 'View repository on GitHub';

    expect(isCitationBadge(link, 'assistant')).toBe(false);
  });

  it('never marks prose elements like paragraphs, tables or headings as citation badges', () => {
    const p = document.createElement('p');
    p.className = 'citation-summary';
    p.textContent =
      'This is a long analytical explanation with detailed findings and citations.';
    expect(isCitationBadge(p, 'assistant')).toBe(false);

    const table = document.createElement('div');
    table.className = 'source-list';
    const tableEl = document.createElement('table');
    table.appendChild(tableEl);
    expect(isCitationBadge(table, 'assistant')).toBe(false);
  });

  it('detects interactive pill chips next to prose with favicon icons', () => {
    const container = document.createElement('div');
    const prose = document.createElement('p');
    prose.textContent =
      'According to recent documentation, the API endpoint is deprecated.';

    const pill = document.createElement('div');
    pill.className = 'rounded-full badge';
    pill.setAttribute('role', 'button');
    const svg = document.createElement('svg');
    pill.append(svg, document.createTextNode('Docs'));

    container.append(prose, pill);
    expect(isCitationBadge(pill, 'assistant')).toBe(true);
  });
});
