// The problem engine: collects problems while the walks run, and puts them in document order.

import type { LibraryErrorCode, StructureCode } from '../codes.js';
import { complexTypes, root } from '../generated/schema.js';
import type { Problem } from '../problem.js';
import type { ComplexTypeSpec, ElementSpec } from '../schema/spec.js';

/** Every problem of structure gives the same SdI code: the file doesn't respect the XSD. */
const STRUCTURE_SDI_CODE = '00200';

export class Report {
  readonly problems: Problem[] = [];

  /** A problem of structure (`xsd.*`, `input.type`): always an error, SdI code 00200. */
  structure(code: StructureCode, path: string, message: string): void {
    this.problems.push({ code, sdiCode: STRUCTURE_SDI_CODE, path, message, severity: 'error' });
  }

  /** An error of the library, not of the SdI (`option.today`, `internal.rule`): no SdI code. */
  library(code: LibraryErrorCode, path: string, message: string): void {
    this.problems.push({ code, path, message, severity: 'error' });
  }
}

/** `parent.name` or `parent.name[index]`, as in `Problem.path`. */
export function childPath(parent: string, name: string, index?: number): string {
  const segment = index === undefined ? name : `${name}[${index}]`;
  return parent === '' ? segment : `${parent}.${segment}`;
}

/** The last field of a path, without its index; the root's name for the empty path. */
export function fieldName(path: string): string {
  return path === '' ? root.name : path.slice(path.lastIndexOf('.') + 1).replace(/\[\d+\]$/, '');
}

/**
 * The problems in the order of the document as build writes it (fields in XSD order); for the
 * same path, structure, then SdI errors, then warnings. The sort is stable, so problems that tie
 * keep the order they were found in.
 */
export function sortProblems(problems: readonly Problem[]): Problem[] {
  return problems
    .map((problem) => ({ problem, key: pathKey(problem.path), rank: rank(problem) }))
    .sort((a, b) => compareKeys(a.key, b.key) || a.rank - b.rank)
    .map((entry) => entry.problem);
}

function rank(problem: Problem): number {
  if (problem.severity === 'warning') return 2;
  return /^(?:xsd|input|xml)\./.test(problem.code) ? 0 : 1;
}

// Each segment of the path becomes two numbers: its position among the fields of its parent
// (attributes first, unknown names last) and its index.
function pathKey(path: string): number[] {
  const key: number[] = [];
  let type: string | undefined = root.type;
  for (const segment of path === '' ? [] : path.split('.')) {
    const match = /^(.*?)(?:\[(\d+)\])?$/.exec(segment);
    const name = match?.[1] ?? segment;
    const index = Number(match?.[2] ?? 0);
    const spec: ComplexTypeSpec | undefined = type === undefined ? undefined : complexTypes[type];
    type = undefined;
    const attribute: number =
      spec?.attributes.findIndex((candidate) => candidate.name === name) ?? -1;
    const element: number = spec?.elements.findIndex((candidate) => candidate.name === name) ?? -1;
    if (spec !== undefined && attribute !== -1) {
      key.push(attribute - spec.attributes.length, index);
    } else if (spec !== undefined && element !== -1) {
      const field: ElementSpec | undefined = spec.elements[element];
      if (field?.kind === 'complex') type = field.type;
      key.push(element, index);
    } else {
      key.push(Number.POSITIVE_INFINITY, index);
    }
  }
  return key;
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const difference = (a[i] as number) - (b[i] as number);
    // Infinity - Infinity is NaN: two unknown names tie.
    if (difference !== 0 && !Number.isNaN(difference)) return difference;
  }
  return a.length - b.length;
}
