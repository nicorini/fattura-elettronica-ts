// How XSD names become TypeScript names, shared by every emitter.
import type { ComplexType, ElementDecl, Schema, SimpleType } from './xsd.ts';

/** Lookups over a schema, with the TypeScript name of every type the model exposes. */
export interface Names {
  readonly schema: Schema;
  complexType(xsdName: string): ComplexType | undefined;
  simpleType(xsdName: string): SimpleType | undefined;
  /** `DatiRitenutaType` → `DatiRitenuta`. */
  tsName(xsdName: string): string;
  /** Simple types with `xs:enumeration`: the code lists. */
  readonly codeLists: readonly SimpleType[];
}

export function names(schema: Schema): Names {
  const complex = new Map(schema.complexTypes.map((type) => [type.name, type]));
  const simple = new Map(schema.simpleTypes.map((type) => [type.name, type]));
  const codeLists = schema.simpleTypes.filter((type) => type.enumeration.length > 0);
  const tsName = (xsdName: string): string => xsdName.replace(/Type$/, '');

  // Two XSD types must not collapse onto the same TypeScript name.
  const seen = new Map<string, string>();
  for (const xsdName of [...complex.keys(), ...codeLists.map((type) => type.name)]) {
    const name = tsName(xsdName);
    const other = seen.get(name);
    if (other !== undefined) throw new Error(`${xsdName} and ${other} both become ${name}`);
    seen.set(name, xsdName);
  }

  return {
    schema,
    complexType: (xsdName) => complex.get(xsdName),
    simpleType: (xsdName) => simple.get(xsdName),
    tsName,
    codeLists,
  };
}

/** What an element holds, which decides how it is typed, read and written. */
export function elementKind(
  names: Names,
  element: ElementDecl,
): 'complex' | 'simple' | 'signature' {
  if (element.refNamespace !== undefined) return 'signature';
  if (names.complexType(element.type)) return 'complex';
  if (names.simpleType(element.type) || element.type.startsWith('xs:')) return 'simple';
  throw new Error(`Unknown type ${element.type} for element ${element.name}`);
}
