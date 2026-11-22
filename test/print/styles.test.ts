import { describe, it, expect } from 'vitest';
import { generatePrintStyles } from '../../src/print/styles.js';
import { defaults } from '../../src/config.js';

describe('Print styles generator', () => {
  it('generates print styles for light theme and A4 size', () => {
    const css = generatePrintStyles({
      title: 'Conversation with ChatGPT',
      exportDate: 'Nov 22, 2026',
      opts: { ...defaults, theme: 'light', paper: 'A4' }
    });

    expect(css).toContain('size: A4;');
    expect(css).toContain('--page: #ffffff;');
    expect(css).toContain('@top-left { content: "Conversation with ChatGPT"');
    expect(css).toContain('@top-right { content: "Nov 22, 2026"');
    expect(css).toContain('counter(page)');
  });

  it('generates dark theme and letter size without headers if disabled', () => {
    const css = generatePrintStyles({
      title: 'Dark Theme Export',
      exportDate: 'Nov 22, 2026',
      opts: {
        ...defaults,
        theme: 'dark',
        paper: 'Letter',
        titleAndDate: false,
        pageNumbers: false
      }
    });

    expect(css).toContain('size: Letter;');
    expect(css).toContain('--page: #1f2329;');
    expect(css).not.toContain('content: "Dark Theme Export"');
    expect(css).not.toContain('@bottom-right');
  });

  it('generates black theme with correct palette variables', () => {
    const css = generatePrintStyles({
      title: 'OLED Black Export',
      exportDate: 'Nov 22, 2026',
      opts: { ...defaults, theme: 'black', paper: 'A4' }
    });

    expect(css).toContain('--page: #000000;');
    expect(css).toContain('--user: #101b2a;');
  });
});
