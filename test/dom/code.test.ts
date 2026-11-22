import { describe, it, expect } from 'vitest';
import { extractCodeText, shouldPreserveLines } from '../../src/dom/code.js';

describe('Code block newline and indentation preservation', () => {
  it('preserves line boundaries when code uses individual line spans without literal newlines', () => {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    // Simulated ChatGPT DOM: each line is wrapped in a span with token classes and no \n in textContent
    const line1 = document.createElement('span');
    line1.className = 'line token-line';
    line1.textContent = 'curl -sL https://example.com';

    const line2 = document.createElement('span');
    line2.className = 'line token-line';
    line2.textContent = 'tar -xzf archive.tar.gz';

    const line3 = document.createElement('span');
    line3.className = 'line token-line';
    line3.textContent = 'cd archive && ./install.sh';

    code.append(line1, line2, line3);
    pre.appendChild(code);

    const extracted = extractCodeText(pre);
    expect(extracted).toBe(
      'curl -sL https://example.com\ntar -xzf archive.tar.gz\ncd archive && ./install.sh'
    );
  });

  it('preserves indentation and newlines in multi-line code with indentation', () => {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    const pythonCode = 'def calculate_sum(items):\n    total = 0\n    for item in items:\n        total += item\n    return total';
    code.textContent = pythonCode;
    pre.appendChild(code);

    const extracted = extractCodeText(pre);
    expect(extracted).toBe(pythonCode);
  });

  it('filters out copy buttons and line number labels inside code blocks', () => {
    const pre = document.createElement('pre');
    const button = document.createElement('button');
    button.textContent = 'Copy code';
    const lineNumber = document.createElement('span');
    lineNumber.className = 'line-number';
    lineNumber.textContent = '1';

    const code = document.createElement('code');
    const line1 = document.createElement('div');
    line1.className = 'code-line';
    line1.textContent = 'const answer = 42;';
    const line2 = document.createElement('div');
    line2.className = 'code-line';
    line2.textContent = 'console.log(answer);';

    code.append(button, lineNumber, line1, line2);
    pre.appendChild(code);

    const extracted = extractCodeText(pre);
    expect(extracted).toContain('const answer = 42;');
    expect(extracted).toContain('console.log(answer);');
    expect(extracted).not.toContain('Copy code');
  });

  it('correctly evaluates shouldPreserveLines for pre-wrap / multi-line text', () => {
    const div = document.createElement('div');
    div.textContent = 'Line one\nLine two\nLine three';
    expect(shouldPreserveLines(div, 'DIV')).toBe(true);

    const singleLine = document.createElement('div');
    singleLine.textContent = 'Just a single line of text';
    expect(shouldPreserveLines(singleLine, 'DIV')).toBe(false);
  });
});
