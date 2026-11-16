import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { addDescriptions, type DescriptionsFile } from './descriptions.ts';
import { names } from './names.ts';
import { readSchema } from './xsd.ts';

const schema = names(
  readSchema(
    readFileSync(
      new URL('../../specs/fatturapa-1.2.3/Schema_VFPR12_v1.2.3.xsd', import.meta.url),
      'utf8',
    ),
  ),
);

const sources: DescriptionsFile['sources'] = {
  cu: {
    name: 'Istruzioni CU',
    url: 'https://example.com/cu.pdf',
    sha256: '0'.repeat(64),
    edition: '2026',
  },
};

/** The entries of the code list `name`, after adding `entries`. */
function listAfter(name: string, entries: DescriptionsFile['entries']) {
  return addDescriptions(schema, { sources, entries }).find((list) => list.name === name)?.entries;
}

describe('addDescriptions', () => {
  test('gives a code without description in the XSD the text of the file, with its citation', () => {
    const entries = listAfter('CausalePagamento', [
      { list: 'CausalePagamento', code: 'A', description: 'testo A', source: 'cu', pages: '82' },
      {
        list: 'CausalePagamento',
        code: 'B',
        description: 'testo B',
        source: 'cu',
        pages: '82-83',
        note: 'omesso un inciso',
      },
    ]);
    expect(entries?.slice(0, 3)).toEqual([
      { value: 'A', doc: 'testo A', source: 'Istruzioni CU', citation: 'Istruzioni CU, p. 82' },
      {
        value: 'B',
        doc: 'testo B',
        source: 'Istruzioni CU',
        citation: 'Istruzioni CU, pp. 82-83. omesso un inciso',
      },
      { value: 'C' },
    ]);
  });

  test('keeps the descriptions of the XSD', () => {
    expect(listAfter('TipoDocumento', [])?.[0]).toEqual({ value: 'TD01', doc: 'Fattura' });
  });

  test('fails on a code the XSD does not have', () => {
    expect(() =>
      listAfter('CausalePagamento', [
        { list: 'CausalePagamento', code: 'V2', description: 'x', source: 'cu', pages: '83' },
      ]),
    ).toThrow('CausalePagamento V2 is not in the XSD');
  });

  test('fails on a code the XSD already describes', () => {
    expect(() =>
      listAfter('TipoDocumento', [
        { list: 'TipoDocumento', code: 'TD01', description: 'x', source: 'cu', pages: '1' },
      ]),
    ).toThrow('TipoDocumento TD01 already has a description in the XSD');
  });

  test('fails on a source not declared in the file', () => {
    expect(() =>
      listAfter('CausalePagamento', [
        { list: 'CausalePagamento', code: 'A', description: 'x', source: 'cu-2027', pages: '1' },
      ]),
    ).toThrow('CausalePagamento A cites the unknown source cu-2027');
  });
});
