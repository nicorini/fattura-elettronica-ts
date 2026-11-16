// Emits the TypeScript types of the model: one per complexType, one literal union per code list.
//
// Rules: names identical to the XSD; types named after the complexType without `Type`; every leaf
// is a `string`; code lists are unions of literals; `minOccurs="0"` → `?`; `maxOccurs > 1` →
// always an array; an `xs:choice` → a union whose excluded fields are `never`; `ds:Signature` →
// `Signature?: string` (raw XML).
import { jsdoc, key, literal } from './emit.ts';
import { elementKind, type Names } from './names.ts';
import type { ComplexType, ElementDecl, Particle } from './xsd.ts';

/**
 * How the types of a complexType are written: the model, or a variant of it with other names and
 * leaves (the input of createInvoice, see emit-input.ts).
 */
export interface Variant {
  /** The TypeScript name of the type emitted for a complexType. */
  typeName(xsdName: string): string;
  /** The TypeScript name of a code list. */
  codeListName(xsdName: string): string;
  /** The type of a simple leaf that is not a code list. */
  leaf(element: ElementDecl): string;
  /** Whether the element is optional, besides `minOccurs="0"`. */
  optional(type: ComplexType, element: ElementDecl): boolean;
  /** More JSDoc paragraphs for the element. */
  docs(type: ComplexType, element: ElementDecl): readonly string[];
}

export function modelVariant(names: Names): Variant {
  return {
    typeName: names.tsName,
    codeListName: names.tsName,
    leaf: () => 'string',
    optional: () => false,
    docs: () => [],
  };
}

export function emitModel(names: Names): string {
  let out = '';
  const variant = modelVariant(names);
  for (const type of names.schema.complexTypes) out += emitComplexType(names, variant, type);
  for (const type of names.codeLists) {
    const name = names.tsName(type.name);
    const paragraphs = [
      ...(type.doc === undefined ? [] : [type.doc]),
      `Codes allowed by \`${type.name}\`; descriptions in \`codeLists.${name}\`.`,
      ...type.enumeration.map(
        (entry) => `- \`${entry.value}\`${entry.doc === undefined ? '' : `: ${entry.doc}`}`,
      ),
    ];
    out += `\n${jsdoc(paragraphs)}`;
    out += `export type ${name} = ${type.enumeration.map((entry) => literal(entry.value)).join(' | ')};\n`;
  }
  return out;
}

export function emitComplexType(
  names: Names,
  variant: Variant,
  type: ComplexType,
  extraDocs: readonly string[] = [],
): string {
  const name = variant.typeName(type.name);
  const root = names.schema.root;
  const docs = [
    ...(root.type === type.name && root.doc !== undefined ? [root.doc] : []),
    ...(type.doc === undefined ? [] : [type.doc]),
    `\`${type.name}\` in the XSD.`,
    ...extraDocs,
  ];
  let out = `\n${jsdoc(docs)}`;

  const attributes = type.attributes.map((attribute) => {
    const simple = names.simpleType(attribute.type);
    const tsType =
      simple && simple.enumeration.length > 0 ? variant.codeListName(simple.name) : 'string';
    const doc = simple?.doc === undefined ? '' : jsdoc([simple.doc], 2);
    return `${doc}  ${key(attribute.name)}${attribute.required ? '' : '?'}: ${tsType};\n`;
  });

  if (!type.particles.some((particle) => particle.kind === 'choice')) {
    out += `export interface ${name} {\n`;
    out += attributes.join('');
    for (const particle of type.particles)
      out += field(names, variant, type, particle as ElementDecl);
    return `${out}}\n`;
  }

  // With an xs:choice the type is an intersection of object types and unions, in XSD order.
  const parts: string[] = [];
  let fields = attributes.join('');
  for (const particle of type.particles) {
    if (particle.kind === 'element') {
      fields += field(names, variant, type, particle);
      continue;
    }
    if (fields !== '') parts.push(`{\n${fields}}`);
    fields = '';
    parts.push(`(\n${choice(names, variant, type, particle)})`);
  }
  if (fields !== '') parts.push(`{\n${fields}}`);
  return `${out}export type ${name} = ${parts.join(' & ')};\n`;
}

function choice(
  names: Names,
  variant: Variant,
  type: ComplexType,
  particle: Extract<Particle, { kind: 'choice' }>,
): string {
  const all = particle.branches.flat();
  return particle.branches
    .map((branch) => {
      const members = all.map((element) =>
        branch.includes(element)
          ? field(names, variant, type, element)
          : `  ${key(element.name)}?: never;\n`,
      );
      return `  | {\n${members.join('')}}\n`;
    })
    .join('');
}

function field(names: Names, variant: Variant, type: ComplexType, element: ElementDecl): string {
  const kind = elementKind(names, element);
  let tsType = 'string';
  const docs: string[] = [];
  if (kind === 'complex') {
    tsType = variant.typeName(element.type);
    const doc = names.complexType(element.type)?.doc;
    if (doc !== undefined) docs.push(doc);
  } else if (kind === 'simple') {
    const simple = names.simpleType(element.type);
    if (simple?.doc !== undefined) docs.push(simple.doc);
    tsType =
      simple && simple.enumeration.length > 0
        ? variant.codeListName(simple.name)
        : variant.leaf(element);
    if (element.default !== undefined) docs.push(`XSD default: \`${element.default}\`.`);
  } else {
    docs.push(
      'XAdES signature (`ds:Signature`) as raw XML, kept exactly as read. Any change to the invoice invalidates it.',
    );
  }
  docs.push(...variant.docs(type, element));
  if (element.maxOccurs > 1) tsType = /[ |]/.test(tsType) ? `(${tsType})[]` : `${tsType}[]`;
  const optional = element.minOccurs === 0 || variant.optional(type, element) ? '?' : '';
  return `${docs.length > 0 ? jsdoc(docs, 2) : ''}  ${key(element.name)}${optional}: ${tsType};\n`;
}
