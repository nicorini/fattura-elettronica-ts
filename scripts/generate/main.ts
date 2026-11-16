// Generates src/generated/ from the official XSD. Run with `pnpm generate`, which also formats
// the output with Biome; CI regenerates and fails if the committed files differ.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { addDescriptions, type DescriptionsFile } from './descriptions.ts';
import { emitCodeLists } from './emit-code-lists.ts';
import { emitModel } from './emit-model.ts';
import { emitSchema } from './emit-schema.ts';
import { emitSimpleTypes } from './emit-simple-types.ts';
import { names } from './names.ts';
import { readSchema } from './xsd.ts';

const XSD = 'specs/fatturapa-1.2.3/Schema_VFPR12_v1.2.3.xsd';
const DESCRIPTIONS = 'specs/code-list-descriptions.json';
const OUT = new URL('../../src/generated/', import.meta.url);

const schema = names(readSchema(readFileSync(new URL(`../../${XSD}`, import.meta.url), 'utf8')));
const descriptions: DescriptionsFile = JSON.parse(
  readFileSync(new URL(`../../${DESCRIPTIONS}`, import.meta.url), 'utf8'),
);
const header = (from: readonly string[]): string =>
  `// Generated from ${from.join('\n// and ')} by scripts/generate.\n// Do not edit: change the generator and run \`pnpm generate\`.\n\n`;

mkdirSync(OUT, { recursive: true });
for (const [file, from, content] of [
  ['model.ts', [XSD], emitModel(schema)],
  ['code-lists.ts', [XSD, DESCRIPTIONS], emitCodeLists(addDescriptions(schema, descriptions))],
  ['schema.ts', [XSD], emitSchema(schema)],
  ['simple-types.ts', [XSD], emitSimpleTypes(schema)],
] as const) {
  writeFileSync(new URL(file, OUT), header(from) + content.replace(/^\n+/, ''));
}
