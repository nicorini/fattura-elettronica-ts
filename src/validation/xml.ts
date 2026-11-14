// Structural validation of the XML tree. Besides what the object walk sees, it sees what parse
// drops: order of the elements, unknown elements and attributes, namespaces, stray text.
import { XmlElement } from '@rgrove/parse-xml';
import { complexTypes, root } from '../generated/schema.js';
import type { ComplexTypeSpec, ElementSpec } from '../schema/spec.js';
import { localName } from '../xml/document.js';
import { declaredPrefix } from '../xml/namespaces.js';
import { checkOccurrences, fieldPath } from './occurrences.js';
import { childPath, fieldName, type Report } from './report.js';
import { checkValue } from './values.js';

const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
// Attributes of the xsi namespace allowed on any element without changing its validation.
const XSI_LOCATIONS = new Set(['schemaLocation', 'noNamespaceSchemaLocation']);

/** Prefix → namespace URI in scope; `''` is the default namespace, absent or empty for none. */
type Scope = ReadonlyMap<string, string>;

export function checkXml(element: XmlElement, report: Report): void {
  checkComplex(element, root.type, '', scopeOf(element, new Map()), undefined, report);
}

function checkComplex(
  element: XmlElement,
  type: string,
  path: string,
  scope: Scope,
  misplaced: string | undefined,
  report: Report,
): void {
  const spec = complexTypes[type];
  if (spec === undefined) throw new Error(`Unknown complexType ${type}`);
  checkAttributes(element, spec, path, scope, report);

  const counts = new Map<string, number>();
  // Positions in spec.elements of the elements met so far, to find those out of order.
  const seen = new Set<number>();
  for (const child of element.children) {
    if (!(child instanceof XmlElement)) {
      // Only XML whitespace may sit between elements: a no-break space is text.
      if ('text' in child && typeof child.text === 'string' && /[^ \t\r\n]/.test(child.text)) {
        report.structure(
          'xsd.unexpected',
          path,
          `${fieldName(path)} contiene del testo, ma ammette solo elementi.`,
        );
      }
      continue;
    }
    const name = localName(child.name);
    const position = spec.elements.findIndex((field) => field.name === name);
    const field = spec.elements[position];
    if (field === undefined) {
      report.structure(
        'xsd.unexpected',
        childPath(path, name),
        `L'elemento ${child.name} non è previsto in ${fieldName(path)}.`,
      );
      continue;
    }
    const index = counts.get(name) ?? 0;
    counts.set(name, index + 1);
    const itemPath = fieldPath(path, field, index);
    const childScope = scopeOf(child, scope);

    const childMisplaced = checkNamespace(child, field, itemPath, childScope, misplaced, report);
    const after = [...seen].find((other) => other > position && !exclusive(spec, other, position));
    if (after === undefined) {
      seen.add(position);
    } else {
      report.structure(
        'xsd.order',
        itemPath,
        `${name} è fuori ordine: nel file viene dopo ${spec.elements[after]?.name}, ma deve stare prima.`,
      );
    }

    if (field.kind === 'complex') {
      checkComplex(child, field.type, itemPath, childScope, childMisplaced, report);
    } else if (field.kind === 'simple') checkLeaf(child, field.type, itemPath, childScope, report);
  }
  checkOccurrences(spec, (name) => counts.get(name) ?? 0, path, report);
}

function checkLeaf(
  element: XmlElement,
  type: string,
  path: string,
  scope: Scope,
  report: Report,
): void {
  checkAttributes(element, undefined, path, scope, report);
  const children = element.children.filter((child) => child instanceof XmlElement);
  for (const child of children) {
    report.structure(
      'xsd.unexpected',
      path,
      `L'elemento ${child.name} non è previsto in ${fieldName(path)}, che contiene solo un valore.`,
    );
  }
  if (children.length === 0) checkValue(element.text, type, path, report);
}

/** Declared attributes are checked as values; any other is unexpected, but for xmlns and xsi. */
function checkAttributes(
  element: XmlElement,
  spec: ComplexTypeSpec | undefined,
  path: string,
  scope: Scope,
  report: Report,
): void {
  for (const [name, value] of Object.entries(element.attributes)) {
    if (declaredPrefix(name) !== undefined) continue;
    const declared = spec?.attributes.find((attribute) => attribute.name === name);
    if (declared !== undefined) {
      checkValue(value, declared.type, childPath(path, name), report);
      continue;
    }
    const colon = name.indexOf(':');
    if (colon !== -1 && scope.get(name.slice(0, colon)) === XSI) {
      const local = name.slice(colon + 1);
      // schemaLocation is a list of pairs, namespace and location: the SdI refuses an odd
      // number of URIs ("must have even number of URI's").
      if (local === 'schemaLocation' && value.split(/\s+/).filter(Boolean).length % 2 === 1) {
        report.structure(
          'xsd.pattern',
          childPath(path, name),
          `L'attributo ${name} deve elencare coppie di URI (namespace e posizione dello schema), ma ne ha un numero dispari.`,
        );
      }
      if (XSI_LOCATIONS.has(local)) continue;
    }
    report.structure(
      'xsd.unexpected',
      path === '' ? name : path,
      `L'attributo ${name} non è previsto in ${fieldName(path)}.`,
    );
  }
  // Only the root has attributes; parse already refuses a root without a valid versione.
  for (const attribute of spec?.attributes ?? []) {
    if (attribute.required && element.attributes[attribute.name] === undefined) {
      report.structure(
        'xsd.required',
        childPath(path, attribute.name),
        `Manca l'attributo ${attribute.name}, obbligatorio.`,
      );
    }
  }
}

/**
 * The elements of the FatturaPA have no namespace (the XSD doesn't qualify them); `Signature` is
 * in the xmldsig one. A default `xmlns` on an ancestor puts them in a namespace, which breaks it.
 *
 * Returns the wrong namespace of `element`, which its descendants inherit: `misplaced` is the one
 * of the parent, so a default `xmlns` is reported where it starts to apply, not on every element.
 */
function checkNamespace(
  element: XmlElement,
  field: ElementSpec,
  path: string,
  scope: Scope,
  misplaced: string | undefined,
  report: Report,
): string | undefined {
  const colon = element.name.indexOf(':');
  const prefix = colon === -1 ? '' : element.name.slice(0, colon);
  const namespace = scope.get(prefix) || undefined;
  if (prefix !== '' && namespace === undefined) {
    report.structure(
      'xsd.namespace',
      path,
      `Il prefisso ${prefix} di ${element.name} non è dichiarato.`,
    );
    return undefined;
  }
  if (namespace === field.namespace) return undefined;
  if (namespace !== undefined && namespace === misplaced) return misplaced;
  report.structure(
    'xsd.namespace',
    path,
    field.namespace === undefined
      ? `${field.name} è nel namespace ${namespace}, ma deve essere senza namespace (togli il prefisso o l'xmlns di default).`
      : `${field.name} deve essere nel namespace ${field.namespace}, non ${namespace ?? 'senza namespace'}.`,
  );
  return namespace;
}

function scopeOf(element: XmlElement, parent: Scope): Scope {
  let scope: Map<string, string> | undefined;
  for (const [name, value] of Object.entries(element.attributes)) {
    const prefix = declaredPrefix(name);
    if (prefix === undefined) continue;
    scope ??= new Map(parent);
    scope.set(prefix, value);
  }
  return scope ?? parent;
}

/** Whether two positions are in different branches of the same choice: no order between them. */
function exclusive(spec: ComplexTypeSpec, a: number, b: number): boolean {
  const [x, y] = [spec.elements[a]?.choice, spec.elements[b]?.choice];
  return x !== undefined && y !== undefined && x.group === y.group && x.branch !== y.branch;
}
