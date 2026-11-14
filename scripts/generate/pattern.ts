// Translates an XML Schema regular expression (XSD 1.0, Appendix F) into the source of a JavaScript
// RegExp, to compile with the `u` flag. Only the constructs the FatturaPA XSD uses are translated;
// the others fail loudly, so a new XSD can't be validated wrong in silence.

// Unicode blocks of XSD (`\p{IsBlock}`), which JavaScript doesn't know, as code point ranges.
const BLOCKS: Readonly<Record<string, string>> = {
  BasicLatin: '\\u0000-\\u007F',
  'Latin-1Supplement': '\\u0080-\\u00FF',
};

// Single-character escapes that mean the same in JavaScript with the `u` flag.
const SAME_ESCAPES = new Set('nrt\\|.-^?*+{}()[]');

/**
 * The JavaScript source of `pattern`, anchored with `^(?:…)$`: an XSD pattern always matches the
 * whole value, a JavaScript one anywhere in it.
 */
export function translatePattern(pattern: string): string {
  let out = '';
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i] as string;
    if (char === '\\') {
      const { source, length } = translateEscape(pattern, i, inClass);
      out += source;
      i += length - 1;
      continue;
    }
    if (inClass) {
      if (char === '[') unsupported(pattern, 'character class subtraction or nesting');
      if (char === ']') inClass = false;
      out += char;
      continue;
    }
    switch (char) {
      case '[':
        inClass = true;
        out += char;
        break;
      case '(':
        // No capture is needed: the pattern only tests.
        out += '(?:';
        break;
      case '.':
        // XSD's dot excludes only \n and \r; JavaScript's excludes U+2028 and U+2029 as well.
        out += '[^\\n\\r]';
        break;
      case '^':
      case '$':
        // Not anchors in XSD: plain characters.
        out += `\\${char}`;
        break;
      default:
        out += char;
    }
  }
  if (inClass) unsupported(pattern, 'unterminated character class');
  return `^(?:${out})$`;
}

/** The translation of the escape at `pattern[start]` and how many characters it takes. */
function translateEscape(
  pattern: string,
  start: number,
  inClass: boolean,
): { source: string; length: number } {
  const next = pattern[start + 1];
  if (next === undefined) unsupported(pattern, 'trailing backslash');
  if (SAME_ESCAPES.has(next)) {
    return { source: `\\${next}`, length: 2 };
  }
  if (next === 'p') {
    const end = pattern.indexOf('}', start);
    const name = pattern.slice(start + 3, end);
    const range = name.startsWith('Is') ? BLOCKS[name.slice(2)] : undefined;
    if (pattern[start + 2] !== '{' || end === -1 || range === undefined) {
      unsupported(pattern, `\\p{${name}}`);
    }
    return { source: inClass ? range : `[${range}]`, length: end - start + 1 };
  }
  // \d, \w, \s, \i, \c and their negations mean other sets in XSD (\d is every Unicode digit).
  return unsupported(pattern, `\\${next}`);
}

function unsupported(pattern: string, construct: string): never {
  throw new Error(`Unsupported XSD pattern construct ${construct} in ${pattern}`);
}
