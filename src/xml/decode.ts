// Bytes → text. The encoding comes from the BOM, else from the XML declaration, else UTF-8.
import { ParseError } from '../errors.js';

// TextDecoder exists in every runtime the library supports (Node, Bun, Deno, browsers, edge), but
// its type lives in the DOM and Node libraries, which the compiler doesn't load here: declaring
// the little we use keeps browser and Node APIs out of the library by mistake.
declare const TextDecoder: new (
  label: string,
  options: { fatal: boolean },
) => { decode(input: Uint8Array): string };

// Labels of the XML declaration, lowercase, and the TextDecoder label for each. Per the WHATWG
// Encoding Standard "iso-8859-1" decodes as windows-1252, which only differs in 0x80–0x9F:
// control characters in ISO-8859-1, printable ones (€, ’…) in windows-1252, which is what files
// mislabelled as ISO-8859-1 actually contain.
const SUPPORTED: Readonly<Record<string, string>> = {
  'utf-8': 'utf-8',
  'windows-1252': 'windows-1252',
  'iso-8859-1': 'iso-8859-1',
};

/** Text of an XML given as a string or as bytes, without BOM. */
export function decodeXml(input: string | Uint8Array): string {
  if (typeof input === 'string') return input.startsWith('﻿') ? input.slice(1) : input;

  if (input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) {
    return decode(input.subarray(3), 'utf-8');
  }
  if ((input[0] === 0xfe && input[1] === 0xff) || (input[0] === 0xff && input[1] === 0xfe)) {
    throw unsupported('UTF-16');
  }
  const label = declaredEncoding(input);
  if (label === undefined) return decode(input, 'utf-8');
  const encoding = SUPPORTED[label.toLowerCase()];
  if (encoding === undefined) throw unsupported(label);
  return decode(input, encoding);
}

/** `encoding` of the XML declaration, read as ASCII from the first bytes. */
function declaredEncoding(input: Uint8Array): string | undefined {
  const head = String.fromCharCode(...input.subarray(0, 200));
  return /^<\?xml\s[^>]*?encoding\s*=\s*(["'])([A-Za-z][\w.-]*)\1/.exec(head)?.[2];
}

function decode(bytes: Uint8Array, encoding: string): string {
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch (error) {
    throw new ParseError(
      'xml.encoding',
      `I byte del file non sono validi nella codifica ${encoding}.`,
      {
        cause: error,
      },
    );
  }
}

function unsupported(label: string): ParseError {
  return new ParseError(
    'xml.encoding',
    `Codifica ${label} non supportata: sono ammesse UTF-8, windows-1252 e ISO-8859-1.`,
  );
}
