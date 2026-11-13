// Question titles are plain strings that may carry *emphasis* or `code`.
// Escape HTML first, then render just those two marks.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inlineMd(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?![\w*])/g, '$1<em>$2</em>');
}

/** Same text with the marks removed, for search titles and other plain-text uses. */
export const plainMd = (s: string) => s.replace(/`([^`]+)`/g, '$1').replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?![\w*])/g, '$1$2');
