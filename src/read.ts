// Root element → model object, guided by the schema description generated from the XSD.
import { XmlElement } from '@rgrove/parse-xml';
import type { FatturaElettronica } from './generated/model.js';
import { complexTypes, root as rootSpec } from './generated/schema.js';
import { localName } from './xml/document.js';
import { escapeAttribute } from './xml/escape.js';
import { declaredPrefix, rootNamespaces } from './xml/namespaces.js';

/** Reads the root element of a FatturaPA into the model. `text` is the document it comes from. */
export function readFattura(root: XmlElement, text: string): FatturaElettronica {
  // The generated schema mirrors the model types, which the compiler can't see through.
  return readComplex(root, rootSpec.type, text) as FatturaElettronica;
}

/**
 * Reads `element` as the complexType `type`: attributes and known child elements, matched by
 * local name, in XSD order. Unknown elements are skipped; leaves keep their exact text.
 * `text` is the document the offsets point into, to cut the raw signature.
 */
function readComplex(element: XmlElement, type: string, text: string): object {
  const spec = complexTypes[type];
  if (spec === undefined) throw new Error(`Unknown complexType ${type}`);
  const result: Record<string, unknown> = {};
  for (const attribute of spec.attributes) {
    const value = element.attributes[attribute.name];
    if (value !== undefined) result[attribute.name] = value;
  }
  const children = element.children.filter(
    (child): child is XmlElement => child.type === 'element',
  );
  for (const field of spec.elements) {
    const values = children
      .filter((child) => localName(child.name) === field.name)
      .map((child) => {
        if (field.kind === 'complex') return readComplex(child, field.type, text);
        if (field.kind === 'signature') return rawSignature(child, element, text);
        return child.text;
      });
    if (values.length === 0) continue;
    // A repeatable field is always an array; a second occurrence of a single one is an error
    // that only validate reports, and parse keeps the first.
    result[field.name] = field.maxOccurs > 1 ? values : values[0];
  }
  return result;
}

/**
 * The signature exactly as in `text`, plus the namespace declarations it inherits from the root
 * (`xmlns:sig` when the file signs with `<sig:Signature>`), copied onto its start tag: build
 * writes its own root, so they would be lost. Declarations that build's root has too are not
 * copied, so a usual `ds:Signature` stays identical to the file.
 */
function rawSignature(signature: XmlElement, root: XmlElement, text: string): string {
  const raw = text.slice(signature.start, signature.end);
  const inherited = Object.entries(root.attributes).filter(([name, uri]) => {
    const prefix = declaredPrefix(name);
    return prefix !== undefined && rootNamespaces[name] !== uri && usesInherited(signature, prefix);
  });
  if (inherited.length === 0) return raw;
  const declarations = inherited
    .map(([name, uri]) => ` ${name}="${escapeAttribute(uri)}"`)
    .join('');
  const tag = `<${signature.name}`;
  return `${tag}${declarations}${raw.slice(tag.length)}`;
}

/** Whether `element` or a descendant uses `prefix` (`''`: the default namespace) undeclared. */
function usesInherited(element: XmlElement, prefix: string): boolean {
  const declaration = prefix === '' ? 'xmlns' : `xmlns:${prefix}`;
  if (element.attributes[declaration] !== undefined) return false;
  const prefixOf = (name: string): string => {
    const colon = name.indexOf(':');
    return colon === -1 ? '' : name.slice(0, colon);
  };
  // Unprefixed attributes are in no namespace, so only prefixed ones count.
  if (prefixOf(element.name) === prefix) return true;
  if (prefix !== '' && Object.keys(element.attributes).some((name) => prefixOf(name) === prefix)) {
    return true;
  }
  return element.children.some(
    (child) => child instanceof XmlElement && usesInherited(child, prefix),
  );
}
