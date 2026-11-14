// Emits the runtime description of the schema: for every complexType its attributes and its
// elements in XSD order, with kind, type and cardinality. See src/schema/spec.ts for the shapes.
import { jsdoc, key, literal } from './emit.ts';
import { elementKind, type Names } from './names.ts';
import type { ComplexType, ElementDecl } from './xsd.ts';

export function emitSchema(names: Names): string {
  const { schema } = names;
  let out =
    "import type { ComplexTypeSpec, RootSpec } from '../schema/spec.js';\n\n" +
    jsdoc([`Root element of the invoice (XSD ${schema.version}).`]) +
    'export const root: RootSpec = {\n' +
    `  name: ${literal(schema.root.name)},\n` +
    `  namespace: ${literal(schema.targetNamespace)},\n` +
    `  type: ${literal(names.tsName(schema.root.type))},\n` +
    '};\n\n' +
    jsdoc(['Every complexType of the XSD, keyed by its model type name.']) +
    'export const complexTypes: { readonly [type: string]: ComplexTypeSpec } = {\n';
  for (const type of schema.complexTypes) {
    out += `  ${key(names.tsName(type.name))}: ${complexType(names, type)},\n`;
  }
  return `${out}};\n`;
}

function complexType(names: Names, type: ComplexType): string {
  const attributes = type.attributes.map((attribute) => {
    const values = names.simpleType(attribute.type)?.enumeration.map((entry) => entry.value) ?? [];
    const enumeration =
      values.length === 0 ? '' : `, enumeration: [${values.map(literal).join(', ')}]`;
    return `{ name: ${literal(attribute.name)}, type: ${literal(attribute.type)}, required: ${attribute.required}${enumeration} }`;
  });
  const elements: string[] = [];
  let group = 0;
  for (const particle of type.particles) {
    if (particle.kind === 'element') {
      elements.push(element(names, particle));
      continue;
    }
    for (const [branch, branchElements] of particle.branches.entries()) {
      for (const decl of branchElements) {
        elements.push(element(names, decl, `choice: { group: ${group}, branch: ${branch} }`));
      }
    }
    group++;
  }
  return `{ attributes: [${attributes.join(', ')}], elements: [\n${elements.join(',\n')}] }`;
}

function element(names: Names, decl: ElementDecl, extra?: string): string {
  const kind = elementKind(names, decl);
  const type = kind === 'complex' ? names.tsName(decl.type) : decl.type;
  const max = decl.maxOccurs === Number.POSITIVE_INFINITY ? 'Infinity' : String(decl.maxOccurs);
  const fields = [
    `name: ${literal(decl.name)}`,
    `kind: ${literal(kind)}`,
    `type: ${literal(type)}`,
    `minOccurs: ${decl.minOccurs}`,
    `maxOccurs: ${max}`,
    ...(extra === undefined ? [] : [extra]),
    ...(decl.refNamespace === undefined ? [] : [`namespace: ${literal(decl.refNamespace)}`]),
  ];
  return `{ ${fields.join(', ')} }`;
}
