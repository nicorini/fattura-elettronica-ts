import type { FatturaElettronica } from './generated/model.js';
import { readFattura } from './read.js';
import { openXml } from './xml/document.js';

/**
 * Reads a FatturaPA (FPA12 or FPR12, XSD 1.2.x) into the model, without losing data: every value
 * is the exact string of the file (`"5.00"` stays `"5.00"`), repeatable fields are always arrays,
 * and the `ds:Signature` is kept as raw XML.
 *
 * The raw signature is the exact text of the file, plus the namespace declarations it inherits
 * from the root other than `ds`, `p` and `xsi` (e.g. `xmlns:sig` for a `<sig:Signature>`): that way
 * `build` writes it back without losing any.
 *
 * Bytes are decoded by BOM, else by the `encoding` of the XML declaration (UTF-8, windows-1252,
 * ISO-8859-1); a string is taken as already decoded. ISO-8859-1 is decoded as windows-1252, as
 * the WHATWG Encoding standard does: the two differ only on bytes 0x80-0x9F, control characters
 * in ISO-8859-1 and printable ones in windows-1252 (0x80 is `€`). The root is recognized by
 * namespace, whatever its prefix. Unknown elements, comments and processing instructions are
 * dropped; CDATA is read as text.
 *
 * `parse` doesn't validate: missing fields, values outside the patterns and unknown codes come
 * through as they are. Use `validate` before trusting the result.
 *
 * @throws {ParseError} If the input is not a FatturaPA: malformed XML, wrong root or namespace,
 * unknown `versione`, unsupported encoding, a `DOCTYPE`.
 * @example
 * const fattura = parse(readFileSync('IT01234567890_FPA01.xml'));
 * fattura.FatturaElettronicaBody[0]?.DatiGenerali.DatiGeneraliDocumento.Numero; // '123'
 */
export function parse(input: string | Uint8Array): FatturaElettronica {
  const { text, root } = openXml(input);
  return readFattura(root, text);
}
