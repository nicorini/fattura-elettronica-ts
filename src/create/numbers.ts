// Step 1 of createInvoice: a copy of the input where every amount, rate and quantity given as a
// `number` is a string, as `decimal(n)` writes it. The values of the user stay as they are
// otherwise: a value the model doesn't allow is left for `build` to report.
import { toBig } from '../arithmetic.js';
import { decimal } from '../decimal.js';
import { inputDecimalTypes } from '../generated/input.js';
import type { FatturaElettronica } from '../generated/model.js';
import { complexTypes, root } from '../generated/schema.js';
import type { ElementSpec } from '../schema/spec.js';
import type { Problems } from './problems.js';

const DECIMALS: ReadonlySet<string> = new Set(inputDecimalTypes);

/** A copy of `input` with its numbers as strings; the input is never changed. */
export function convertNumbers(input: unknown, problems: Problems): FatturaElettronica {
  return convertBlock(input, root.type, '', problems) as FatturaElettronica;
}

function convertBlock(value: unknown, type: string, path: string, problems: Problems): unknown {
  const spec = complexTypes[type];
  if (spec === undefined || typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [name, item] of Object.entries(value)) {
    const element = spec.elements.find((candidate) => candidate.name === name);
    const at = path === '' ? name : `${path}.${name}`;
    if (element === undefined) result[name] = item;
    else if (element.maxOccurs > 1 && Array.isArray(item)) {
      result[name] = item.map((entry, index) =>
        convertValue(element, entry, `${at}[${index}]`, problems),
      );
    } else result[name] = convertValue(element, item, at, problems);
  }
  return result;
}

function convertValue(
  element: ElementSpec,
  value: unknown,
  path: string,
  problems: Problems,
): unknown {
  if (element.kind === 'complex') return convertBlock(value, element.type, path, problems);
  if (element.kind !== 'simple' || !DECIMALS.has(element.type)) return value;
  if (typeof value === 'string') {
    if (toBig(value) === undefined) {
      problems.add('create.number', path, `«${value}» non è un numero decimale.`);
    }
    return value;
  }
  if (typeof value !== 'number') return value;
  try {
    return decimal(value);
  } catch (error) {
    problems.add('create.number', path, (error as Error).message);
    return value;
  }
}
