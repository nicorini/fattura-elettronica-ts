// Structural validation of a model object. A repeatable field must be an array and no other field
// may be one; `undefined` is a missing field.
import { complexTypes, root } from '../generated/schema.js';
import { checkOccurrences, fieldPath } from './occurrences.js';
import { childPath, fieldName, type Report } from './report.js';
import { checkValue } from './values.js';

export function checkObject(fattura: unknown, report: Report): void {
  checkComplex(fattura, root.type, '', report);
}

function checkComplex(value: unknown, type: string, path: string, report: Report): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    report.structure(
      'input.type',
      path,
      `${path === '' ? 'La fattura' : fieldName(path)} deve essere un oggetto, non ${describe(value)}.`,
    );
    return;
  }
  const spec = complexTypes[type];
  if (spec === undefined) throw new Error(`Unknown complexType ${type}`);
  const object = value as Record<string, unknown>;

  const known = new Set([...spec.attributes, ...spec.elements].map((field) => field.name));
  for (const [name, property] of Object.entries(object)) {
    if (!known.has(name) && property !== undefined) {
      report.structure(
        'xsd.unexpected',
        childPath(path, name),
        `${name} non è un campo di ${fieldName(path)}.`,
      );
    }
  }

  for (const attribute of spec.attributes) {
    const property = object[attribute.name];
    const attributePath = childPath(path, attribute.name);
    if (property === undefined) {
      if (attribute.required) {
        report.structure('xsd.required', attributePath, `Manca ${attribute.name}, obbligatorio.`);
      }
    } else {
      checkLeaf(property, attribute.type, attributePath, report);
    }
  }

  // A repeatable field is always an array, any other field never is: a field of the wrong shape is
  // reported and counts as present, but is not read further.
  const items = new Map<string, readonly unknown[]>();
  const misshapen = new Set<string>();
  for (const field of spec.elements) {
    const property = object[field.name];
    if (property === undefined) continue;
    const repeatable = field.maxOccurs > 1;
    if (Array.isArray(property) === repeatable) {
      items.set(field.name, repeatable ? (property as unknown[]) : [property]);
      continue;
    }
    misshapen.add(field.name);
    report.structure(
      'input.type',
      childPath(path, field.name),
      repeatable
        ? `${field.name} è un campo ripetibile: deve essere un array, anche con un solo elemento, non ${describe(property)}.`
        : `${field.name} non è un campo ripetibile: deve essere ${field.kind === 'complex' ? 'un oggetto' : 'una stringa'}, non un array.`,
    );
  }
  const count = (name: string) => (misshapen.has(name) ? 1 : (items.get(name)?.length ?? 0));
  checkOccurrences(spec, count, path, report);
  for (const field of spec.elements) {
    for (const [index, item] of (items.get(field.name) ?? []).entries()) {
      const itemPath = fieldPath(path, field, index);
      if (field.kind === 'complex') checkComplex(item, field.type, itemPath, report);
      else if (field.kind === 'signature') checkString(item, itemPath, report);
      else checkLeaf(item, field.type, itemPath, report);
    }
  }
}

function checkLeaf(value: unknown, type: string, path: string, report: Report): void {
  if (checkString(value, path, report)) checkValue(value, type, path, report);
}

/** Every leaf of the model is a string: anything else is reported, never converted. */
function checkString(value: unknown, path: string, report: Report): value is string {
  if (typeof value === 'string') return true;
  report.structure(
    'input.type',
    path,
    `${fieldName(path)} deve essere una stringa, non ${describe(value)}: i numeri si scrivono come testo, ad esempio con decimal().`,
  );
  return false;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'un array';
  if (typeof value === 'object') return 'un oggetto';
  return `un valore di tipo ${typeof value}`;
}
