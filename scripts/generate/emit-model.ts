// Emits the TypeScript types of the model: one per complexType, one literal union per code list.
//
// Rules: names identical to the XSD; types named after the complexType without `Type`; every leaf
// is a `string`; code lists are unions of literals; `minOccurs="0"` → `?`; `maxOccurs > 1` →
// always an array; an `xs:choice` → a union whose excluded fields are `never`; `ds:Signature` →
// `Signature?: string` (raw XML).
import { jsdoc, key, literal } from './emit.ts';
import { elementKind, type Names } from './names.ts';
import type { ComplexType, ElementDecl, Particle } from './xsd.ts';

export function emitModel(names: Names): string {
  let out = '';
  for (const type of names.schema.complexTypes) out += emitComplexType(names, type);
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

function emitComplexType(names: Names, type: ComplexType): string {
  const name = names.tsName(type.name);
  const root = names.schema.root;
  const docs = [
    ...(root.type === type.name && root.doc !== undefined ? [root.doc] : []),
    ...(type.doc === undefined ? [] : [type.doc]),
    `\`${type.name}\` in the XSD.`,
  ];
  let out = `\n${jsdoc(docs)}`;

  const attributes = type.attributes.map((attribute) => {
    const simple = names.simpleType(attribute.type);
    const tsType = simple && simple.enumeration.length > 0 ? names.tsName(simple.name) : 'string';
    const doc = simple?.doc === undefined ? '' : jsdoc([simple.doc], 2);
    return `${doc}  ${key(attribute.name)}${attribute.required ? '' : '?'}: ${tsType};\n`;
  });

  if (!type.particles.some((particle) => particle.kind === 'choice')) {
    out += `export interface ${name} {\n`;
    out += attributes.join('');
    for (const particle of type.particles) out += field(names, particle as ElementDecl);
    return `${out}}\n`;
  }

  // With an xs:choice the type is an intersection of object types and unions, in XSD order.
  const parts: string[] = [];
  let fields = attributes.join('');
  for (const particle of type.particles) {
    if (particle.kind === 'element') {
      fields += field(names, particle);
      continue;
    }
    if (fields !== '') parts.push(`{\n${fields}}`);
    fields = '';
    parts.push(`(\n${choice(names, particle)})`);
  }
  if (fields !== '') parts.push(`{\n${fields}}`);
  return `${out}export type ${name} = ${parts.join(' & ')};\n`;
}

function choice(names: Names, particle: Extract<Particle, { kind: 'choice' }>): string {
  const all = particle.branches.flat();
  return particle.branches
    .map((branch) => {
      const members = all.map((element) =>
        branch.includes(element) ? field(names, element) : `  ${key(element.name)}?: never;\n`,
      );
      return `  | {\n${members.join('')}}\n`;
    })
    .join('');
}

function field(names: Names, element: ElementDecl): string {
  const kind = elementKind(names, element);
  let tsType = 'string';
  const docs: string[] = [];
  if (kind === 'complex') {
    tsType = names.tsName(element.type);
    const doc = names.complexType(element.type)?.doc;
    if (doc !== undefined) docs.push(doc);
  } else if (kind === 'simple') {
    const simple = names.simpleType(element.type);
    if (simple?.doc !== undefined) docs.push(simple.doc);
    if (simple && simple.enumeration.length > 0) tsType = names.tsName(simple.name);
    if (element.default !== undefined) docs.push(`XSD default: \`${element.default}\`.`);
  } else {
    docs.push(
      'XAdES signature (`ds:Signature`) as raw XML, kept exactly as read. Any change to the invoice invalidates it.',
    );
  }
  if (element.maxOccurs > 1) tsType = `${tsType}[]`;
  const optional = element.minOccurs === 0 ? '?' : '';
  return `${docs.length > 0 ? jsdoc(docs, 2) : ''}  ${key(element.name)}${optional}: ${tsType};\n`;
}
