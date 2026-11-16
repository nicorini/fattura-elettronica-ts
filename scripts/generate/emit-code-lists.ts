// Emits `codeLists`: every XSD enumeration with its descriptions, for menus in user interfaces.
import type { CodeList } from './descriptions.ts';
import { jsdoc, key, lineComment, literal } from './emit.ts';

export function emitCodeLists(lists: readonly CodeList[]): string {
  const imports = lists.map((list) => list.name).sort();
  let out = `import type { ${imports.join(', ')} } from './model.js';\n\n`;

  out += jsdoc([
    'One code of a code list, with its official description.',
    '`description` is always the text of an official source, never ours; it is missing only when no source gives one.',
  ]);
  out += 'export interface CodeListEntry<Code extends string = string> {\n';
  out += '  readonly code: Code;\n';
  out += '  readonly description?: string;\n';
  out += '}\n\n';

  const doc = [
    'The code lists of the XSD, in the order of the XSD, with their official descriptions: ready for menus and select boxes.',
    'The descriptions come from the XSD annotations. Where the XSD has none, they come whole from another official document, named on the list.',
    '@example\n' +
      "codeLists.TipoDocumento.find((entry) => entry.code === 'TD04')?.description; // 'Nota di credito'",
  ];
  out += jsdoc(doc);
  out += 'export const codeLists: {\n';
  for (const list of lists) {
    out += jsdoc([`Codes of \`${list.type}\`.${sourcesSentence(list)}`], 2);
    out += `  readonly ${key(list.name)}: readonly CodeListEntry<${list.name}>[];\n`;
  }
  out += '} = {\n';
  for (const list of lists) {
    out += `  ${key(list.name)}: [\n`;
    for (const entry of list.entries) {
      if (entry.citation !== undefined) out += lineComment(entry.citation, 4);
      const description = entry.doc === undefined ? '' : `, description: ${literal(entry.doc)}`;
      out += `    { code: ${literal(entry.value)}${description} },\n`;
    }
    out += '  ],\n';
  }
  out += '};\n';
  return out;
}

/** The documents other than the XSD that give the descriptions of `list`, as a sentence. */
function sourcesSentence(list: CodeList): string {
  const names = [
    ...new Set(list.entries.flatMap((entry) => (entry.source === undefined ? [] : entry.source))),
  ];
  return names.length === 0 ? '' : ` Descriptions from: ${names.join('; ')}.`;
}
