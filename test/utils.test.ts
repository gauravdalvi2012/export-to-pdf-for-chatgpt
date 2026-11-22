import { describe, it, expect } from 'vitest';
import { safeURL, quotedCSS } from '../src/utils.js';

describe('Utility functions', () => {
  describe('safeURL', () => {
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
  });
});
