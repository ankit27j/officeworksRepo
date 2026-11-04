const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for HTML element content and quoted attributes. Use on every user-supplied value. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

/** Collapses line breaks so a value can't add header lines or break a one-line field such as a subject. */
export function toSingleLine(value: string, maxLength = 150): string {
  const line = value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}
