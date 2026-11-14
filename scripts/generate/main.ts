// Generates src/generated/ from the official XSD. Run with `pnpm generate`, which also formats
// the output with Biome; CI regenerates and fails if the committed files differ.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { emitCodeLists } from './emit-code-lists.ts';
import { emitModel } from './emit-model.ts';
import { emitSchema } from './emit-schema.ts';
import { emitSimpleTypes } from './emit-simple-types.ts';
import { names } from './names.ts';
import { readSchema } from './xsd.ts';

const XSD = 'specs/fatturapa-1.2.3/Schema_VFPR12_v1.2.3.xsd';
const OUT = new URL('../../src/generated/', import.meta.url);

const schema = names(readSchema(readFileSync(new URL(`../../${XSD}`, import.meta.url), 'utf8')));
const header = `// Generated from ${XSD} by scripts/generate.\n// Do not edit: change the generator and run \`pnpm generate\`.\n\n`;

mkdirSync(OUT, { recursive: true });
for (const [file, content] of [
  ['model.ts', emitModel(schema)],
  ['code-lists.ts', emitCodeLists(schema)],
  ['schema.ts', emitSchema(schema)],
  ['simple-types.ts', emitSimpleTypes(schema)],
] as const) {
  writeFileSync(new URL(file, OUT), header + content.replace(/^\n+/, ''));
}
