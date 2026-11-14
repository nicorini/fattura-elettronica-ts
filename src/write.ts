// Model object → XML text, guided by the schema description generated from the XSD. The mirror of
// read.ts.
import { complexTypes, root } from './generated/schema.js';
import { escapeAttribute, escapeText } from './xml/escape.js';
import { rootNamespaces } from './xml/namespaces.js';

/** The whole document: declaration, `p:` root with its attributes, children indented by 2. */
export function writeDocument(fattura: object): string {
  const name = `p:${root.name}`;
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  const attributes = { ...rootAttributes(fattura), ...rootNamespaces };
  const start = `${name}${Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
    .join('')}`;
  const children = writeChildren(fattura, root.type, 1);
  if (children.length === 0) lines.push(`<${start}/>`);
  else lines.push(`<${start}>`, ...children, `</${name}>`);
  return `${lines.join('\n')}\n`;
}

function rootAttributes(fattura: object): Record<string, string> {
  const values = fattura as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const attribute of spec(root.type).attributes) {
    const value = values[attribute.name];
    if (value !== undefined) result[attribute.name] = String(value);
  }
  return result;
}

/** Lines of the child elements of `object`, read as the complexType `type`, in XSD order. */
function writeChildren(object: object, type: string, depth: number): string[] {
  const values = object as Record<string, unknown>;
  const indent = '  '.repeat(depth);
  const lines: string[] = [];
  for (const field of spec(type).elements) {
    const value = values[field.name];
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (field.kind === 'signature') {
        // Raw XML, written as it was read.
        lines.push(`${indent}${String(item)}`);
      } else if (field.kind === 'complex' && typeof item === 'object' && item !== null) {
        const children = writeChildren(item, field.type, depth + 1);
        if (children.length === 0) lines.push(`${indent}<${field.name}/>`);
        else lines.push(`${indent}<${field.name}>`, ...children, `${indent}</${field.name}>`);
      } else {
        lines.push(`${indent}<${field.name}>${escapeText(String(item))}</${field.name}>`);
      }
    }
  }
  return lines;
}

function spec(type: string) {
  const result = complexTypes[type];
  if (result === undefined) throw new Error(`Unknown complexType ${type}`);
  return result;
}
