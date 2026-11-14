// An independent view of "the same data": every leaf as `path=value`, from the XML (straight from
// the parser, without the schema) and from an object of the model.
import { parseXml, type XmlElement } from '@rgrove/parse-xml';

const local = (name: string): string => name.slice(name.indexOf(':') + 1);

/** Leaves and root attributes of an XML, except namespace declarations and the signature. */
export function xmlLeaves(xml: string): string[] {
  const root = parseXml(xml.replace(/^﻿/, '')).root as XmlElement;
  const result = Object.entries(root.attributes)
    .filter(([name]) => !name.startsWith('xmlns') && !name.startsWith('xsi:'))
    .map(([name, value]) => `${name}=${value}`);
  const walk = (element: XmlElement, path: string): void => {
    const children = element.children.filter(
      (child): child is XmlElement => child.type === 'element',
    );
    if (children.length === 0) {
      result.push(`${path}=${element.text}`);
      return;
    }
    for (const child of children) {
      if (local(child.name) === 'Signature') continue;
      walk(child, path === '' ? local(child.name) : `${path}/${local(child.name)}`);
    }
  };
  walk(root, '');
  return result.sort();
}

/** Leaves of a model object, with the same paths (array indices dropped). */
export function objectLeaves(value: object): string[] {
  const result: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item, path);
    } else if (typeof node === 'object' && node !== null) {
      // An empty block (`<ContattiTrasmittente/>`) is a leaf with empty text in the XML.
      if (Object.keys(node).length === 0) result.push(`${path}=`);
      for (const [name, child] of Object.entries(node)) {
        if (name === 'Signature' && path === '') continue;
        walk(child, path === '' ? name : `${path}/${name}`);
      }
    } else {
      result.push(`${path}=${String(node)}`);
    }
  };
  walk(value, '');
  return result.sort();
}
