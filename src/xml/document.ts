// Text → root element of a FatturaPA, or ParseError. Shared by parse and, on XML, by validate.
import { parseXml, type XmlDocument, type XmlElement, XmlError } from '@rgrove/parse-xml';
import { ParseError } from '../errors.js';
import { complexTypes, root as rootSpec } from '../generated/schema.js';
import { decodeXml } from './decode.js';

// A DOCTYPE before the root, after the XML declaration, comments and processing instructions.
const DOCTYPE_IN_PROLOG = /^(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->)*<!DOCTYPE/;

/** Bytes or text → the decoded text and its root element (see `readRoot`), or ParseError. */
export function openXml(input: string | Uint8Array): { text: string; root: XmlElement } {
  const text = decodeXml(input);
  return { text, root: readRoot(text) };
}

/**
 * The root `FatturaElettronica` element, recognized by local name and namespace URI, never by
 * prefix. Node offsets (`start`, `end`) index `text`.
 */
function readRoot(text: string): XmlElement {
  const root = parseDocument(text).root;
  if (root === null) throw new ParseError('xml.malformed', 'Il file non contiene XML.');

  const name = localName(root.name);
  if (name !== rootSpec.name) {
    throw new ParseError(
      'xml.notFatturaPA',
      `L'elemento radice è ${root.name}, non ${rootSpec.name}: il file non è una FatturaPA.`,
    );
  }
  const namespace = namespaceOf(root);
  if (namespace !== rootSpec.namespace) {
    throw new ParseError(
      'xml.notFatturaPA',
      namespace === undefined
        ? `La radice ${root.name} non ha il namespace ${rootSpec.namespace}.`
        : `La radice ${root.name} ha il namespace ${namespace} invece di ${rootSpec.namespace}.`,
    );
  }
  const versione = complexTypes[rootSpec.type]?.attributes.find(
    (attribute) => attribute.name === 'versione',
  );
  const value = root.attributes.versione;
  if (value === undefined || !versione?.enumeration?.includes(value)) {
    throw new ParseError(
      'xml.notFatturaPA',
      `${value === undefined ? "Manca l'attributo versione" : `L'attributo versione vale "${value}"`}: sono ammessi ${versione?.enumeration?.join(' e ')}.`,
    );
  }
  return root;
}

function parseDocument(text: string): XmlDocument {
  let document: XmlDocument;
  try {
    document = parseXml(text, { includeOffsets: true, preserveDocumentType: true });
  } catch (error) {
    if (!(error instanceof XmlError)) throw error;
    // Entities declared in a DTD are never expanded, so a document that uses them fails to
    // parse: report the DOCTYPE, the real reason.
    if (DOCTYPE_IN_PROLOG.test(text)) throw doctype();
    throw new ParseError(
      'xml.malformed',
      `XML non ben formato alla riga ${error.line}, colonna ${error.column}.`,
      { line: error.line, column: error.column, cause: error },
    );
  }
  if (document.children.some((node) => node.type === 'doctype')) throw doctype();
  return document;
}

function doctype(): ParseError {
  return new ParseError(
    'xml.doctype',
    'Il file contiene una dichiarazione DOCTYPE, rifiutata per sicurezza: una FatturaPA non ne ha.',
  );
}

/** `p:FatturaElettronica` → `FatturaElettronica`. */
export function localName(name: string): string {
  return name.slice(name.indexOf(':') + 1);
}

/** Namespace URI of the root element, from its own declarations (it has no ancestors). */
function namespaceOf(root: XmlElement): string | undefined {
  const colon = root.name.indexOf(':');
  return root.attributes[colon === -1 ? 'xmlns' : `xmlns:${root.name.slice(0, colon)}`];
}
