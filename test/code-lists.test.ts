import { describe, expect, test } from 'vitest';
import { codeLists } from '../src/index.js';

const codes = (list: readonly { code: string }[]): string[] => list.map((entry) => entry.code);

test('has one list per enumerated simple type of the XSD', () => {
  expect(Object.keys(codeLists).sort()).toEqual(
    [
      'Art73',
      'BolloVirtuale',
      'CausalePagamento',
      'CondizioniPagamento',
      'EsigibilitaIVA',
      'FormatoTrasmissione',
      'ModalitaPagamento',
      'Natura',
      'RegimeFiscale',
      'Ritenuta',
      'SocioUnico',
      'SoggettoEmittente',
      'StatoLiquidazione',
      'TipoCassa',
      'TipoCessionePrestazione',
      'TipoDocumento',
      'TipoRitenuta',
      'TipoScontoMaggiorazione',
    ].sort(),
  );
});

test('lists the document types TD01–TD06 and TD16–TD29, in XSD order', () => {
  expect(codes(codeLists.TipoDocumento)).toEqual([
    'TD01',
    'TD02',
    'TD03',
    'TD04',
    'TD05',
    'TD06',
    'TD16',
    'TD17',
    'TD18',
    'TD19',
    'TD20',
    'TD21',
    'TD22',
    'TD23',
    'TD24',
    'TD25',
    'TD26',
    'TD27',
    'TD28',
    'TD29',
  ]);
});

test('carries the official descriptions from the XSD annotations', () => {
  expect(codeLists.TipoDocumento[0]).toEqual({ code: 'TD01', description: 'Fattura' });
  expect(codeLists.TipoDocumento[1]).toEqual({
    code: 'TD02',
    description: 'Acconto / anticipo su fattura',
  });
  expect(codeLists.FormatoTrasmissione).toEqual([
    { code: 'FPA12', description: 'Fattura verso PA' },
    { code: 'FPR12', description: 'Fattura verso privati' },
  ]);
});

// ADR 0016: where the XSD has no description, the text comes whole from another official source.
describe('descriptions the XSD lacks', () => {
  const causale = (code: string): string | undefined =>
    codeLists.CausalePagamento.find((entry) => entry.code === code)?.description;

  // Istruzioni CU 2026, agg. 24/02/2026, pp. 82-83:
  // https://www.agenziaentrate.gov.it/portale/documents/20143/9602395/CU_istr_2026_agg+24+02.pdf/4184818b-05a3-acce-5956-70811c7d2233
  test('CausalePagamento has the text of the CU instructions, without the final ";"', () => {
    expect(causale('A')).toBe(
      'prestazioni di lavoro autonomo rientranti nell’esercizio di arte o professione abituale',
    );
    expect(causale('ZO')).toBe('titolo diverso dai precedenti.');
    expect(codeLists.CausalePagamento.filter((entry) => entry.description === undefined)).toEqual(
      [],
    );
  });

  test('W leaves out the year, which changes with every edition', () => {
    expect(causale('W')).toBe(
      'corrispettivi erogati per prestazioni relative a contratti d’appalto cui si sono resi applicabili le disposizioni contenute nell’art. 25-ter del D.P.R. n. 600 del 29 settembre 1973',
    );
  });

  // Istruzioni CU 2025, agg. 20/02/2025, pp. 84-85: the list of causali no longer has X and Y.
  // https://www.agenziaentrate.gov.it/portale/documents/20143/8486798/CU_istr_2025_gg+20+02+2025.pdf/6f4e54f0-5502-0147-acc1-07ae5d2f6f8b
  // Istruzioni CU 2024, p. 79: the last edition with X and Y.
  // https://www.agenziaentrate.gov.it/portale/documents/20143/5817509/CU+2024+_istruzioni.pdf/f7848bb5-49a0-fbec-79f7-1f6bc15fdf3a
  test('X and Y, gone from the CU since 2025, have the text of the CU 2024', () => {
    expect(causale('X')).toMatch(/^canoni corrisposti nel 2004 da società o enti residenti/);
    expect(causale('Y')).toMatch(/^canoni corrisposti dal 1° gennaio 2005 al 26 luglio 2005/);
  });

  // Specifiche tecniche del formato FatturaPA 1.2.2, p. 53: "per il codice ZO indicare il valore Z".
  test('Z has the text of ZO, which it stood for', () => {
    expect(causale('Z')).toBe(causale('ZO'));
  });

  // Rappresentazione tabellare della fattura ordinaria, p. 4, element 2.1.1.6.1:
  // https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/RappresentazioneTabellareFattOrdinaria-1.pdf
  test('BolloVirtuale SI has the text of the Rappresentazione tabellare', () => {
    expect(codeLists.BolloVirtuale).toEqual([
      { code: 'SI', description: 'Bollo assolto ai sensi del decreto MEF 17 giugno 2014 (art. 6)' },
    ]);
  });
});

test('has the sizes of the XSD 1.2.3 lists', () => {
  expect(codeLists.Natura).toHaveLength(24);
  expect(codeLists.RegimeFiscale).toHaveLength(19);
  expect(codeLists.ModalitaPagamento).toHaveLength(23);
  expect(codeLists.TipoCassa).toHaveLength(22);
  expect(codeLists.CausalePagamento).toHaveLength(29);
  expect(codes(codeLists.RegimeFiscale)).not.toContain('RF03');
  expect(codes(codeLists.RegimeFiscale)).toContain('RF20');
});

test('collapses the whitespace of multi-line annotations', () => {
  for (const list of Object.values(codeLists)) {
    for (const entry of list) {
      if ('description' in entry) expect(entry.description).toMatch(/^\S(.*\S)?$/);
    }
  }
});
