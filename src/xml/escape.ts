// Escaping of text and attribute values, so that a parser reads back the exact string.

// `>` too, so that `]]>` never appears; `\r` as a reference, or a parser would turn it into `\n`.
export function escapeText(text: string): string {
  return text.replace(/[&<>\r]/g, (char) => REFERENCES[char] ?? char);
}

// In attributes a parser also turns tabs and line breaks into spaces.
export function escapeAttribute(text: string): string {
  return text.replace(/[&<>"\t\n\r]/g, (char) => REFERENCES[char] ?? char);
}

const REFERENCES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\t': '&#9;',
  '\n': '&#10;',
  '\r': '&#13;',
};
