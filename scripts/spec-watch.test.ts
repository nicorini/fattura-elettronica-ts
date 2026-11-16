import { describe, expect, it } from 'vitest';
import {
  checkEditions,
  checkSources,
  renderEditionIssue,
  renderIssue,
  type Source,
} from './spec-watch.ts';

// A fake network: each URL answers with fixed text.
function fakeFetch(responses: Record<string, string>) {
  return async (url: string): Promise<Uint8Array> => {
    const body = responses[url];
    if (body === undefined) throw new Error(`unexpected URL ${url}`);
    return new TextEncoder().encode(body);
  };
}

// SHA-256 of the ASCII text "abc" (FIPS 180-2, appendix B.1).
const SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('checkSources', () => {
  it('reports a file whose hash differs from the saved one', async () => {
    const sources: Source[] = [
      { kind: 'file', name: 'XSD', url: 'https://example.it/a.xsd', sha256: 'old' },
    ];

    const result = await checkSources(sources, fakeFetch({ 'https://example.it/a.xsd': 'abc' }));

    expect(result.changes).toEqual([
      {
        kind: 'file',
        name: 'XSD',
        url: 'https://example.it/a.xsd',
        before: 'old',
        after: SHA256_ABC,
      },
    ]);
    expect(result.sources).toEqual([{ ...sources[0], sha256: SHA256_ABC }]);
  });

  it('reports nothing when the file has the saved hash', async () => {
    const sources: Source[] = [
      { kind: 'file', name: 'XSD', url: 'https://example.it/a.xsd', sha256: SHA256_ABC },
    ];

    const result = await checkSources(sources, fakeFetch({ 'https://example.it/a.xsd': 'abc' }));

    expect(result.changes).toEqual([]);
    expect(result.sources).toEqual(sources);
  });

  it('reports the document links added to and removed from a page', async () => {
    const sources: Source[] = [
      {
        kind: 'page',
        name: 'Formato',
        url: 'https://example.it/docs/',
        include: '\\.(pdf|xsd)$',
        links: ['https://example.it/export/old.pdf', 'https://example.it/export/same.xsd'],
      },
    ];
    // Relative and absolute links, a menu link to ignore, and a duplicate.
    const html = `<nav><a href="/chi-siamo">Chi siamo</a></nav>
      <a href="/export/same.xsd">Schema</a>
      <a class="x" href="https://example.it/export/new-1.1.pdf">Nuove specifiche</a>
      <a href='../export/same.xsd'>Schema, di nuovo</a>`;

    const result = await checkSources(sources, fakeFetch({ 'https://example.it/docs/': html }));

    expect(result.changes).toEqual([
      {
        kind: 'page',
        name: 'Formato',
        url: 'https://example.it/docs/',
        added: ['https://example.it/export/new-1.1.pdf'],
        removed: ['https://example.it/export/old.pdf'],
      },
    ]);
    expect(result.sources).toEqual([
      {
        ...sources[0],
        links: ['https://example.it/export/new-1.1.pdf', 'https://example.it/export/same.xsd'],
      },
    ]);
  });
});

describe('checkEditions', () => {
  const sources = {
    cu: { name: 'Istruzioni CU 2026', edition: '2026', yearly: true },
    'cu-2024': { name: 'Istruzioni CU 2024', edition: '2024' },
  };

  it('reports, from 1 February, a yearly source whose edition is of a past year', () => {
    expect(checkEditions(sources, new Date('2027-02-01T00:00:00Z'))).toEqual([
      { name: 'Istruzioni CU 2026', edition: '2026', year: 2027 },
    ]);
  });

  it('waits until 1 February, when the new edition is out', () => {
    expect(checkEditions(sources, new Date('2027-01-31T23:59:59Z'))).toEqual([]);
  });

  it('reports nothing when the yearly edition is of the current year', () => {
    expect(checkEditions(sources, new Date('2026-11-16T00:00:00Z'))).toEqual([]);
  });

  it('fails on a yearly source whose edition is not a year', () => {
    const notAYear = { rt: { name: 'Rappresentazione tabellare', edition: '1.2.3', yearly: true } };
    expect(() => checkEditions(notAYear, new Date('2027-02-01T00:00:00Z'))).toThrow(
      'Rappresentazione tabellare comes out every year, but its edition 1.2.3 is not a year',
    );
  });
});

describe('renderIssue', () => {
  it('lists, in Italian, what changed in each source and how to save the new fingerprints', () => {
    const body = renderIssue([
      {
        kind: 'page',
        name: 'Formato FatturaPA',
        url: 'https://example.it/docs/',
        added: ['https://example.it/export/new.xsd'],
        removed: ['https://example.it/export/old.xsd'],
      },
      {
        kind: 'file',
        name: 'Schema XSD',
        url: 'https://example.it/a.xsd',
        before: 'aaa',
        after: 'bbb',
      },
      { kind: 'file', name: 'Allegato A', url: 'https://example.it/a.pdf', after: 'ccc' },
    ]);

    const expected = `Il sorvegliante delle specifiche ha trovato differenze rispetto alle impronte salvate in \`specs/sources.json\`.

## Formato FatturaPA

Pagina: https://example.it/docs/

Collegamenti nuovi:
- https://example.it/export/new.xsd

Collegamenti spariti:
- https://example.it/export/old.xsd

## Schema XSD

File: https://example.it/a.xsd

- SHA-256 salvato: \`aaa\`
- SHA-256 attuale: \`bbb\`

## Allegato A

File: https://example.it/a.pdf

- SHA-256 salvato: nessuno
- SHA-256 attuale: \`ccc\`

## Cosa fare

1. Leggere i documenti cambiati e decidere se toccano la libreria (XSD, controlli, codici).
2. Aggiornare le impronte con \`pnpm specs:watch --update\` e committare \`specs/sources.json\`, anche se la libreria non cambia.
`;
    expect(body).toBe(expected);
  });
});

describe('renderEditionIssue', () => {
  it('says the descriptions are on an old edition and how to move them to the new one', () => {
    const body = renderEditionIssue([{ name: 'Istruzioni CU 2026', edition: '2026', year: 2027 }]);

    const expected = `Il sorvegliante delle specifiche ha trovato descrizioni dei codici ferme a un'edizione passata della loro fonte.

## Istruzioni CU 2026

Le descrizioni dei codici in \`specs/code-list-descriptions.json\` vengono dall'edizione 2026, ma dal 1° febbraio deve essere uscita l'edizione 2027. Il suo indirizzo cambia ogni anno, quindi il sorvegliante non può scaricarla da solo.

1. Cercare l'edizione 2027 sul sito dell'Agenzia delle Entrate.
2. Confrontare i testi delle voci che citano questa fonte con quelli della nuova edizione, e i codici che toglie o aggiunge con quelli dell'XSD.
3. Aggiornare in \`specs/code-list-descriptions.json\` nome, URL, SHA-256, edizione, pagine e testi, poi \`pnpm generate\`. Un testo cambiato è una versione \`minor\` che nomina l'edizione nel changelog.
4. Aggiornare in \`specs/sources.json\` le pagine dell'anno della fonte.
`;
    expect(body).toBe(expected);
  });
});
