// Emits `codeLists`: every XSD enumeration with its descriptions, for menus in user interfaces.
import { jsdoc, key, literal } from './emit.ts';
import type { Names } from './names.ts';

export function emitCodeLists(names: Names): string {
  const lists = names.codeLists;
  const imports = lists.map((type) => names.tsName(type.name)).sort();
  let out = `import type { ${imports.join(', ')} } from './model.js';\n\n`;

  out += jsdoc([
    'One code of a code list, with its description from the XSD annotations.',
    '`description` is missing when the XSD has none (e.g. `CausalePagamento`).',
  ]);
  out += 'export interface CodeListEntry<Code extends string = string> {\n';
  out += '  readonly code: Code;\n';
  out += '  readonly description?: string;\n';
  out += '}\n\n';

  const doc = [
    'The code lists of the XSD, in the order of the XSD, with their official descriptions: ready for menus and select boxes.',
    '@example\n' +
      "codeLists.TipoDocumento.find((entry) => entry.code === 'TD04')?.description; // 'Nota di credito'",
  ];
  out += jsdoc(doc);
  out += 'export const codeLists: {\n';
  for (const type of lists) {
    const name = names.tsName(type.name);
    out += jsdoc([`Codes of \`${type.name}\`.`], 2);
    out += `  readonly ${key(name)}: readonly CodeListEntry<${name}>[];\n`;
  }
  out += '} = {\n';
  for (const type of lists) {
    out += `  ${key(names.tsName(type.name))}: [\n`;
    for (const entry of type.enumeration) {
      const description = entry.doc === undefined ? '' : `, description: ${literal(entry.doc)}`;
      out += `    { code: ${literal(entry.value)}${description} },\n`;
    }
    out += '  ],\n';
  }
  out += '};\n';
  return out;
}
