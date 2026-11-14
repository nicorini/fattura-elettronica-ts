import { expect, test } from 'vitest';
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

test('omits the description where the XSD has none', () => {
  expect(codeLists.CausalePagamento[0]).toEqual({ code: 'A' });
  expect(codeLists.BolloVirtuale).toEqual([{ code: 'SI' }]);
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
