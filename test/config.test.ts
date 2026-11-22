import { describe, it, expect } from 'vitest';
import { defaults, palette, htmlTags, svgTags } from '../src/config.js';

describe('Configuration & Palettes', () => {
  it('defines valid defaults matching extension schema', () => {
    expect(defaults.theme).toBe('light');
    expect(defaults.paper).toBe('A4');
    expect(defaults.pageNumbers).toBe(true);
    expect(defaults.titleAndDate).toBe(true);
    expect(defaults.userBubbles).toBe(true);
    expect(defaults.includeProgress).toBe(false);
  });

  it('provides complete palettes for all themes', () => {
    for (const theme of ['light', 'dark', 'black'] as const) {
      const p = palette[theme];
      expect(p.page).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.text).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.user).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.border).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.code).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('contains essential HTML and SVG tags', () => {
    expect(htmlTags.has('PRE')).toBe(true);
    expect(htmlTags.has('CODE')).toBe(true);
    expect(htmlTags.has('TABLE')).toBe(true);
    expect(htmlTags.has('IMG')).toBe(true);

    expect(svgTags.has('SVG')).toBe(true);
    expect(svgTags.has('PATH')).toBe(true);
  });
});
