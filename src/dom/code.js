export function shouldPreserveLines(source, tag) {
  if (!['DIV', 'P', 'SPAN', 'CODE', 'KBD'].includes(tag) ||
      !/[\r\n]/.test(source.textContent || '')) return false;
  const whiteSpace = getComputedStyle(source).whiteSpace;
  if (['pre', 'pre-wrap', 'pre-line', 'break-spaces'].includes(whiteSpace)) return true;
  // Raw text-only blocks with multiple non-empty lines often contain technical
  // configuration examples. Keep those line endings even if their original
  // framework class was not available in a standalone print document.
  return source.children.length === 0 &&
    (source.textContent || '').split(/\r?\n/).filter((line) => line.trim()).length > 1;
}

// A syntax-highlighted <pre> can have one SPAN/DIV per displayed line,
// with no literal newlines in textContent. Cloning those spans without
// their ChatGPT CSS concatenates shell commands ("updatesudo"). Read the
// *rendered* line boundaries before detaching the block, then store real
// newline characters in a plain pre/code pair. Indentation survives too.
export function extractCodeText(pre) {
  const code = pre.querySelector('code') || pre;
  const normalize = value => String(value || '').replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ');
  const raw = normalize(code.textContent);
  const rendered = normalize(code.innerText || pre.innerText);
  // Prefer existing literal newlines if they contain at least as many
  // line boundaries as the rendered representation.
  const count = value => (value.match(/\n/g) || []).length;
  if (count(raw) >= count(rendered) && count(raw) > 0) return raw;
  if (count(rendered) > 0) return rendered;

  // Certain code renderers identify line wrappers without using block
  // display or explicit line breaks. Handle those as a last resort.
  const children = [...code.children].filter(child =>
    !child.matches('button,[aria-hidden="true"],[class*="line-number"]'));
  const lineLike = children.length >= 2 && children.every(child =>
    child.matches('[data-line],[data-code-line],.line,.code-line,[class*="token-line"]') ||
    ['DIV','P'].includes(child.tagName) ||
    ['block','list-item'].includes(getComputedStyle(child).display));
  if (lineLike) return children.map(child => normalize(child.textContent)).join('\n');
  return raw || rendered;
}
