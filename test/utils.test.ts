import { describe, it, expect } from 'vitest';
import { safeURL, quotedCSS, sleep, afterPaint } from '../src/utils.js';

describe('Utility functions', () => {
  describe('sleep and afterPaint', () => {
    it('sleep resolves after requested duration', async () => {
      const start = Date.now();
      await sleep(10);
      expect(Date.now() - start).toBeGreaterThanOrEqual(5);
    });

    it('afterPaint resolves after animation frame', async () => {
      await expect(afterPaint()).resolves.toBeUndefined();
    });
  });

  describe('safeURL', () => {
    it('returns null for empty or nullish values', () => {
      expect(safeURL(null)).toBeNull();
      expect(safeURL(undefined)).toBeNull();
      expect(safeURL('')).toBeNull();
    });

    it('allows valid http and https URLs', () => {
      expect(safeURL('https://chatgpt.com/c/123')).toBe(
        'https://chatgpt.com/c/123'
      );
      expect(safeURL('http://example.com')).toBe('http://example.com/');
    });

    it('blocks dangerous protocols', () => {
      expect(safeURL('javascript:alert(1)')).toBeNull();
      expect(safeURL('file:///etc/passwd')).toBeNull();
      expect(safeURL('vbscript:msgbox(1)')).toBeNull();
    });

    it('handles image data URLs only when explicitly allowed', () => {
      const dataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(safeURL(dataUri, false)).toBeNull();
      expect(safeURL(dataUri, true)).toBe(dataUri);
    });
  });

  describe('quotedCSS', () => {
    it('safely escapes quotes and backslashes for CSS content strings', () => {
      expect(quotedCSS('Simple Title')).toBe('"Simple Title"');
      expect(quotedCSS('Title with "quotes"')).toBe(
        '"Title with \\"quotes\\""'
      );
      expect(quotedCSS('Title with \\backslashes\\')).toBe(
        '"Title with \\\\backslashes\\\\"'
      );
    });

    it('handles null and undefined', () => {
      expect(quotedCSS(null)).toBe('""');
      expect(quotedCSS(undefined)).toBe('""');
    });
  });
});
