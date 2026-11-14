import { describe, expect, test } from 'vitest';
import type { DatiRitenuta, FatturaElettronica } from '../src/index.js';
import { firstBody, firstLine, fpr12 } from './helpers/invoices.js';
import { error, found } from './helpers/vat.js';

const DOCUMENTO = 'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento';
const LINEA = 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0]';

const ritenuta: DatiRitenuta = {
  TipoRitenuta: 'RT01',
  ImportoRitenuta: '20.00',
  AliquotaRitenuta: '20.00',
  CausalePagamento: 'A',
};

// 00411: "2.1.1.5 <DatiRitenuta> non presente a fronte di almeno un blocco 2.2.1 <DettaglioLinee>
// con 2.2.1.13 <Ritenuta> uguale a SI" (Elenco controlli SdI 2.0, p. 17,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
describe('00411 withholding tax on a line', () => {
  test('a line with Ritenuta SI and DatiRitenuta is right', () => {
    const fattura = fpr12();
    firstLine(fattura).Ritenuta = 'SI';
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiRitenuta = [ritenuta];
    expect(found(fattura)).toEqual([]);
  });

  // python-a38#38, FatturaElettronica.NET#363: an invoice may have several DatiRitenuta.
  test('several DatiRitenuta (RT01 and ENASARCO RT04) are right', () => {
    const fattura = fpr12();
    firstLine(fattura).Ritenuta = 'SI';
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiRitenuta = [
      ritenuta,
      { ...ritenuta, TipoRitenuta: 'RT04', ImportoRitenuta: '8.50', AliquotaRitenuta: '8.50' },
    ];
    expect(found(fattura)).toEqual([]);
  });

  test('a line with Ritenuta SI and no DatiRitenuta is 00411', () => {
    const fattura = fpr12();
    firstLine(fattura).Ritenuta = 'SI';
    expect(found(fattura)).toEqual([error('00411', `${DOCUMENTO}.DatiRitenuta`, 17)]);
  });
});

// 00415: "2.1.1.5 <DatiRitenuta> non presente a fronte di 2.1.1.7.6 <Ritenuta> uguale a SI"
// (Elenco controlli SdI 2.0, p. 19).
describe('00415 withholding tax on the cassa', () => {
  const withCassa = (): FatturaElettronica => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [
      {
        TipoCassa: 'TC22',
        AlCassa: '4.00',
        ImportoContributoCassa: '4.00',
        AliquotaIVA: '22.00',
        Ritenuta: 'SI',
      },
    ];
    body.DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: '104.00', Imposta: '22.88' },
    ];
    return fattura;
  };

  test('a cassa with Ritenuta SI and DatiRitenuta is right', () => {
    const fattura = withCassa();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiRitenuta = [ritenuta];
    expect(found(fattura)).toEqual([]);
  });

  test('a cassa with Ritenuta SI and no DatiRitenuta is 00415', () => {
    expect(found(withCassa())).toEqual([error('00415', `${DOCUMENTO}.DatiRitenuta`, 19)]);
  });
});

// 00437 and 00438: a ScontoMaggiorazione with Tipo and neither Percentuale nor Importo, in the
// document (00437) or on a line (00438) (Elenco controlli SdI 2.0, p. 36).
describe('00437 and 00438 discounts without an amount', () => {
  test('a discount of the document with Percentuale or Importo is right', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.ScontoMaggiorazione = [
      { Tipo: 'SC', Percentuale: '10.00' },
      { Tipo: 'MG', Importo: '1.00' },
    ];
    expect(found(fattura)).toEqual([]);
  });

  test('a discount of the document with neither is 00437', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.ScontoMaggiorazione = [
      { Tipo: 'SC', Importo: '1.00' },
      { Tipo: 'SC' },
    ];
    expect(found(fattura)).toEqual([error('00437', `${DOCUMENTO}.ScontoMaggiorazione[1]`, 36)]);
  });

  test('a discount of a line with neither is 00438', () => {
    const fattura = fpr12();
    firstLine(fattura).ScontoMaggiorazione = [{ Tipo: 'SC' }];
    expect(found(fattura)).toEqual([error('00438', `${LINEA}.ScontoMaggiorazione[0]`, 36)]);
  });
});
