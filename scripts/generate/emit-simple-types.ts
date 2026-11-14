// Emits the facets of every simple type, and of the builtins the elements use directly, for the
// structural validation. Patterns are translated to JavaScript once, here.
import { jsdoc, key, literal } from './emit.ts';
import type { Names } from './names.ts';
import { translatePattern } from './pattern.ts';
import type { SimpleType } from './xsd.ts';

// Builtin base → [builtin of the spec, whitespace processing], from XML Schema Part 2.
const BUILTINS: Readonly<Record<string, readonly [string, string]>> = {
  'xs:string': ['string', 'preserve'],
  'xs:normalizedString': ['string', 'replace'],
  'xs:token': ['string', 'collapse'],
  'xs:decimal': ['decimal', 'collapse'],
  'xs:integer': ['integer', 'collapse'],
  'xs:date': ['date', 'collapse'],
  'xs:dateTime': ['dateTime', 'collapse'],
  'xs:base64Binary': ['base64Binary', 'collapse'],
};

export function emitSimpleTypes(names: Names): string {
  const { schema } = names;
  let out =
    "import type { SimpleTypeSpec } from '../schema/spec.js';\n\n" +
    jsdoc([
      'Facets of every simpleType of the XSD, keyed by its XSD name, and of the builtins (`xs:date`) that elements use directly.',
    ]) +
    'export const simpleTypes: { readonly [type: string]: SimpleTypeSpec } = {\n';
  const builtinsUsed = new Set<string>();
  for (const type of schema.complexTypes) {
    for (const particle of type.particles) {
      const decls = particle.kind === 'element' ? [particle] : particle.branches.flat();
      for (const decl of decls) {
        if (decl.refNamespace === undefined && decl.type.startsWith('xs:')) {
          builtinsUsed.add(decl.type);
        }
      }
    }
  }
  for (const builtin of builtinsUsed) {
    out += `  ${key(builtin)}: ${spec(builtin, [])},\n`;
  }
  for (const type of schema.simpleTypes) {
    out += `  ${key(type.name)}: ${spec(type.base, facets(type))},\n`;
  }
  return `${out}};\n`;
}

function spec(base: string, facets: readonly string[]): string {
  const builtin = BUILTINS[base];
  if (builtin === undefined) throw new Error(`Unsupported builtin type ${base}`);
  const [name, whiteSpace] = builtin;
  const hasWhiteSpace = facets.some((facet) => facet.startsWith('whiteSpace:'));
  return `{ ${[
    `builtin: ${literal(name)}`,
    ...(hasWhiteSpace ? [] : [`whiteSpace: ${literal(whiteSpace)}`]),
    ...facets,
  ].join(', ')} }`;
}

function facets(type: SimpleType): string[] {
  const result: string[] = [];
  if (type.whiteSpace !== undefined) result.push(`whiteSpace: ${literal(type.whiteSpace)}`);
  if (type.enumeration.length > 0) {
    result.push(
      `enumeration: [${type.enumeration.map((entry) => literal(entry.value)).join(', ')}]`,
    );
  }
  if (type.patterns.length > 0) {
    const patterns = type.patterns.map(
      (pattern) => `{ xsd: ${literal(pattern)}, js: ${literal(translatePattern(pattern))} }`,
    );
    result.push(`patterns: [${patterns.join(', ')}]`);
  }
  for (const facet of ['length', 'minLength', 'maxLength'] as const) {
    const value = type[facet];
    if (value !== undefined) result.push(`${facet}: ${value}`);
  }
  for (const facet of ['minInclusive', 'maxInclusive'] as const) {
    const value = type[facet];
    if (value !== undefined) result.push(`${facet}: ${literal(value)}`);
  }
  return result;
}
