// Cardinality and xs:choice of the children of a block: shared by the walks on objects and on XML.
import type { ComplexTypeSpec, ElementSpec } from '../schema/spec.js';
import { childPath, type Report } from './report.js';

/** The path of the `index`-th occurrence of `field` under `parent`: indexed only if repeatable. */
export function fieldPath(parent: string, field: ElementSpec, index: number): string {
  return childPath(parent, field.name, field.maxOccurs > 1 ? index : undefined);
}

/**
 * Reports missing required fields, fields over `maxOccurs` and broken choices of the block at
 * `path`, given how many times each field occurs.
 */
export function checkOccurrences(
  spec: ComplexTypeSpec,
  count: (name: string) => number,
  path: string,
  report: Report,
): void {
  const chosen = chosenBranches(spec, count, path, report);
  for (const field of spec.elements) {
    const occurs = count(field.name);
    const required =
      field.choice === undefined || chosen.get(field.choice.group) === field.choice.branch;
    if (required && occurs < field.minOccurs) {
      report.structure(
        'xsd.required',
        // The field, not an occurrence: a repeatable one is the whole array.
        childPath(path, field.name),
        `Manca ${field.name}, obbligatorio${field.minOccurs > 1 ? ` almeno ${field.minOccurs} volte` : ''}.`,
      );
    }
    if (occurs > field.maxOccurs) {
      report.structure(
        'xsd.maxOccurs',
        fieldPath(path, field, field.maxOccurs),
        `${field.name} compare ${occurs} volte, al massimo ${field.maxOccurs === 1 ? 'una' : field.maxOccurs}.`,
      );
    }
  }
}

/** Branch chosen in each choice group, when exactly one is present; reports the others. */
function chosenBranches(
  spec: ComplexTypeSpec,
  count: (name: string) => number,
  path: string,
  report: Report,
): Map<number, number> {
  const groups = new Map<number, Map<number, string[]>>();
  for (const field of spec.elements) {
    if (field.choice === undefined) continue;
    const branches = groups.get(field.choice.group) ?? new Map<number, string[]>();
    groups.set(field.choice.group, branches);
    branches.set(field.choice.branch, [...(branches.get(field.choice.branch) ?? []), field.name]);
  }
  const chosen = new Map<number, number>();
  for (const [group, branches] of groups) {
    const present = [...branches.keys()].filter((branch) =>
      branches.get(branch)?.some((name) => count(name) > 0),
    );
    const alternatives = [...branches.values()].map((names) => names.join(' e ')).join(' oppure ');
    if (present.length === 1) {
      chosen.set(group, present[0] as number);
    } else if (present.length === 0) {
      report.structure('xsd.choice', path, `Serve ${alternatives}.`);
    } else {
      report.structure('xsd.choice', path, `Serve ${alternatives}, non più di una alternativa.`);
    }
  }
  return chosen;
}
