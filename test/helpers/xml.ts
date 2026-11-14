// XML in a canonical form, to compare two documents up to what the round trip may change: spaces
// between tags, prefixes, attribute order and namespace declarations. Everything else counts:
// element order, names and their namespace URIs, attribute values, the exact text of the leaves.
import { parseXml, type XmlElement, type XmlNode, XmlText } from '@rgrove/parse-xml';

type Scope = Readonly<Record<string, string>>;

/**
 * One line per element (`{uri}local a="1"`) and per text (JSON-quoted, so spaces show), indented
 * by depth. Names are expanded with the URI of their prefix; `xmlns` attributes are dropped.
 * Whitespace-only text is dropped in elements that have child elements.
 */
export function normalizeXml(xml: string): string {
  const root = parseXml(xml.replace(/^﻿/, '')).root;
  if (root === null) throw new Error('No root element');
  return element(root, {}, 0).join('\n');
}

function element(node: XmlElement, parentScope: Scope, depth: number): string[] {
  const scope: Record<string, string> = { ...parentScope };
  for (const [name, value] of Object.entries(node.attributes)) {
    if (name === 'xmlns') scope[''] = value;
    else if (name.startsWith('xmlns:')) scope[name.slice(6)] = value;
  }
  const attributes = Object.entries(node.attributes)
    .filter(([name]) => name !== 'xmlns' && !name.startsWith('xmlns:'))
    // Unprefixed attributes have no namespace, whatever the default one.
    .map(
      ([name, value]) =>
        `${name.includes(':') ? expand(name, scope) : name}=${JSON.stringify(value)}`,
    )
    .sort();
  const indent = '  '.repeat(depth);
  const lines = [`${indent}${[expand(node.name, scope), ...attributes].join(' ')}`];
  const hasElements = node.children.some((child) => child.type === 'element');
  // A leaf as one text, even when a comment splits it in two nodes.
  if (!hasElements) {
    if (node.text !== '') lines.push(`${indent}  ${JSON.stringify(node.text)}`);
    return lines;
  }
  for (const child of node.children) {
    if (isElement(child)) lines.push(...element(child, scope, depth + 1));
    else if (child instanceof XmlText && child.text.trim() !== '') {
      lines.push(`${indent}  ${JSON.stringify(child.text)}`);
    }
  }
  return lines;
}

/** `p:Name` → `{uri}Name`; an unprefixed element takes the default namespace. */
function expand(name: string, scope: Scope): string {
  const colon = name.indexOf(':');
  const prefix = colon === -1 ? '' : name.slice(0, colon);
  const local = name.slice(colon + 1);
  if (prefix === 'xml') return `{http://www.w3.org/XML/1998/namespace}${local}`;
  const uri = scope[prefix];
  if (uri === undefined && prefix !== '') throw new Error(`Undeclared prefix ${prefix}`);
  return uri === undefined || uri === '' ? local : `{${uri}}${local}`;
}

function isElement(node: XmlNode): node is XmlElement {
  return node.type === 'element';
}
