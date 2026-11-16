// The warnings on the amounts that createInvoice computes: an invoice written by hand, or received,
// whose contributo cassa, ritenuta, total or only instalment don't match the arithmetic of the
// format. The SdI doesn't check these amounts, so they are warnings, never errors.
import { describe, expect, test } from 'vitest';
import {
  type CreateInvoiceInput,
  createInvoice,
  type FatturaElettronica,
  type Problem,
  validate,
} from '../src/index.js';
import { official, officialExamples } from './helpers/fixtures.js';
import { firstBody, fpr12Input } from './helpers/invoices.js';

const DOCUMENTO = 'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento';
const CODES = new Set([
  'warn.importoContributoCassa',
  'warn.importoRitenuta',
  'warn.importoTotaleDocumento',
  'warn.importoPagamento',
]);

/** The warnings of this group on `fattura`. */
function warnings(fattura: FatturaElettronica): Problem[] {
  return validate(fattura, { today: '2025-01-20' }).problems.filter((p) => CODES.has(p.code));
}

/**
 * A professional's invoice, from createInvoice: fee 1000.00 at 22% subject to ritenuta, rivalsa
 * INPS TC22 at 4% on 1000.00 (40.00, subject to ritenuta), RT01 at 20% (208.00), total 1268.80,
 * one instalment of 1060.80.
 */
function professionista(): FatturaElettronica {
  const input: CreateInvoiceInput = fpr12Input();
  const body = input.FatturaElettronicaBody[0];
  if (body === undefined) throw new Error('The input has no body');
  body.DatiBeniServizi.DettaglioLinee = [
    {
      NumeroLinea: '1',
      Descrizione: 'Consulenza',
      PrezzoUnitario: '1000.00',
      AliquotaIVA: '22.00',
      Ritenuta: 'SI',
    },
  ];
  const documento = body.DatiGenerali.DatiGeneraliDocumento;
  documento.DatiCassaPrevidenziale = [
    {
      TipoCassa: 'TC22',
      AlCassa: '4.00',
      ImponibileCassa: '1000.00',
      AliquotaIVA: '22.00',
      Ritenuta: 'SI',
    },
  ];
  documento.DatiRitenuta = [
    { TipoRitenuta: 'RT01', AliquotaRitenuta: '20.00', CausalePagamento: 'A' },
  ];
  body.DatiPagamento = [
    { CondizioniPagamento: 'TP02', DettaglioPagamento: [{ ModalitaPagamento: 'MP05' }] },
  ];
  return createInvoice(input);
}

function documento(fattura: FatturaElettronica) {
  return firstBody(fattura).DatiGenerali.DatiGeneraliDocumento;
}

test('the invoice of createInvoice has none of these warnings', () => {
  expect(warnings(professionista())).toEqual([]);
});

// FPR02 and FPR03 have summaries that don't match their lines (see test/fixtures/official).
test.each(officialExamples.filter((name) => !/FPR0[23]$/.test(name)))(
  'the official example %s has none of these warnings',
  (name) => {
    const problems = validate(official(name)).problems;
    expect(problems.filter((p) => CODES.has(p.code))).toEqual([]);
  },
);

// ImponibileCassa: "importo totale del volume di affari sul quale occorre applicare il contributo
// di cassa previdenziale"; AlCassa: "aliquota contributiva (espressa in percentuale %) prevista per
// la cassa di previdenza"; ImportoContributoCassa: "importo del contributo relativo alla cassa di
// previdenza della categoria professionale" (Specifiche tecniche FatturaPA 1.4, pag. 19,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Specifiche_tecniche_del_formato_FatturaPA_V1.4.pdf).
describe('warn.importoContributoCassa', () => {
  const path = `${DOCUMENTO}.DatiCassaPrevidenziale[0].ImportoContributoCassa`;

  test('an ImportoContributoCassa other than ImponibileCassa × AlCassa / 100 is a warning', () => {
    const fattura = professionista();
    const cassa = documento(fattura).DatiCassaPrevidenziale?.[0];
    if (cassa === undefined) throw new Error('No cassa');
    cassa.ImportoContributoCassa = '40.01';
    expect(warnings(fattura)).toContainEqual({
      code: 'warn.importoContributoCassa',
      path,
      message: expect.stringContaining('ImponibileCassa'),
      severity: 'warning',
      source: 'Specifiche tecniche del formato FatturaPA 1.4, p. 19',
      expected: '40.00',
      actual: '40.01',
    });
  });

  test('rounds the contributo to the cent, half-up', () => {
    const fattura = professionista();
    const cassa = documento(fattura).DatiCassaPrevidenziale?.[0];
    if (cassa === undefined) throw new Error('No cassa');
    // 12.50 × 1% = 0.125 → 0.13
    cassa.ImponibileCassa = '12.50';
    cassa.AlCassa = '1.00';
    cassa.ImportoContributoCassa = '0.13';
    expect(warnings(fattura).filter((p) => p.path === path)).toEqual([]);
    cassa.ImportoContributoCassa = '0.12';
    expect(warnings(fattura)).toContainEqual(
      expect.objectContaining({ path, expected: '0.13', actual: '0.12' }),
    );
  });

  test('without ImponibileCassa there is nothing to compare', () => {
    const fattura = professionista();
    const cassa = documento(fattura).DatiCassaPrevidenziale?.[0];
    if (cassa === undefined) throw new Error('No cassa');
    delete cassa.ImponibileCassa;
    cassa.ImportoContributoCassa = '41.00';
    expect(warnings(fattura).filter((p) => p.path === path)).toEqual([]);
  });
});

function ritenuta(fattura: FatturaElettronica) {
  const result = documento(fattura).DatiRitenuta?.[0];
  if (result === undefined) throw new Error('No ritenuta');
  return result;
}

// The Ritenuta flag of a line: "la linea della fattura si riferisce ad una cessione/prestazione
// soggetta a ritenuta"; of a cassa: "il contributo cassa è soggetto a ritenuta" (Specifiche
// tecniche FatturaPA 1.4, pagg. 26 and 19,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Specifiche_tecniche_del_formato_FatturaPA_V1.4.pdf).
describe('warn.importoRitenuta', () => {
  const path = `${DOCUMENTO}.DatiRitenuta[0].ImportoRitenuta`;

  test('an ImportoRitenuta above AliquotaRitenuta % of the flagged amounts is a warning', () => {
    const fattura = professionista();
    ritenuta(fattura).ImportoRitenuta = '208.01';
    expect(warnings(fattura)).toContainEqual({
      code: 'warn.importoRitenuta',
      path,
      message: expect.stringContaining('AliquotaRitenuta'),
      severity: 'warning',
      source: 'Specifiche tecniche del formato FatturaPA 1.4, pp. 19, 26',
      expected: '208.00',
      actual: '208.01',
    });
  });

  // The withholding of an agent is "commisurata al 50 per cento dell'ammontare delle provvigioni",
  // or to 20% with employees (art. 25-bis, c. 2 DPR 600/73,
  // https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1973-09-29;600~art25bis;
  // from 2027 art. 39, c. 2 of the Testo unico annexed to D.Lgs. 33/2025,
  // https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2025-03-24;33):
  // an ImportoRitenuta below the full base is legitimate.
  test('an ImportoRitenuta below the full base, as for an agent, is not a warning', () => {
    const fattura = professionista();
    // 20% of 50% of 1040.00; the customer pays 1268.80 - 104.00
    ritenuta(fattura).ImportoRitenuta = '104.00';
    const dettaglio = firstBody(fattura).DatiPagamento?.[0]?.DettaglioPagamento[0];
    if (dettaglio === undefined) throw new Error('No DettaglioPagamento');
    dettaglio.ImportoPagamento = '1164.80';
    expect(warnings(fattura)).toEqual([]);
  });

  test('with more DatiRitenuta there is nothing to compare', () => {
    const fattura = professionista();
    const documentoFattura = documento(fattura);
    documentoFattura.DatiRitenuta = [
      {
        TipoRitenuta: 'RT01',
        ImportoRitenuta: '300.00',
        AliquotaRitenuta: '20.00',
        CausalePagamento: 'A',
      },
      {
        TipoRitenuta: 'RT04',
        ImportoRitenuta: '10.00',
        AliquotaRitenuta: '1.00',
        CausalePagamento: 'A',
      },
    ];
    expect(warnings(fattura).filter((p) => p.code === 'warn.importoRitenuta')).toEqual([]);
  });

  test('a RT03 ritenuta is not compared', () => {
    const fattura = professionista();
    ritenuta(fattura).TipoRitenuta = 'RT03';
    ritenuta(fattura).ImportoRitenuta = '300.00';
    expect(warnings(fattura).filter((p) => p.code === 'warn.importoRitenuta')).toEqual([]);
  });
});

// ImportoTotaleDocumento: "Importo totale del documento al netto dell'eventuale sconto e
// comprensivo di imposta a debito del cessionario / committente" (Rappresentazione tabellare del
// tracciato FatturaPA, 2.1.1.9,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/RappresentazioneTabellareFattOrdinaria-1.pdf).
// Arrotondamento 2.1.1.10: "Nel campo deve essere indicato il valore dell'arrotondamento e non il
// valore dell'ImportoTotaleDocumento (2.1.1.9) arrotondato" (Suggerimenti per la compilazione
// della FatturaPA 1.6, p. 55,
// https://www.fatturapa.gov.it/export/documenti/Suggerimenti_Compilazione_FatturaPA_1.6.pdf).
describe('warn.importoTotaleDocumento', () => {
  const path = `${DOCUMENTO}.ImportoTotaleDocumento`;

  test('a total other than the summaries plus the Arrotondamento is a warning', () => {
    const fattura = professionista();
    documento(fattura).ImportoTotaleDocumento = '1060.80';
    expect(warnings(fattura)).toContainEqual({
      code: 'warn.importoTotaleDocumento',
      path,
      message: expect.stringContaining('DatiRiepilogo'),
      severity: 'warning',
      source: 'Rappresentazione tabellare del tracciato fattura ordinaria, 2.1.1.9',
      expected: '1268.80',
      actual: '1060.80',
    });
  });

  test('the Arrotondamento of the document counts', () => {
    const fattura = professionista();
    documento(fattura).Arrotondamento = '0.20';
    documento(fattura).ImportoTotaleDocumento = '1269.00';
    expect(warnings(fattura).filter((p) => p.path === path)).toEqual([]);
  });

  test('with a ScontoMaggiorazione of the document the total is not compared', () => {
    const fattura = professionista();
    documento(fattura).ScontoMaggiorazione = [{ Tipo: 'SC', Importo: '68.80' }];
    documento(fattura).ImportoTotaleDocumento = '1200.00';
    expect(warnings(fattura).filter((p) => p.path === path)).toEqual([]);
  });
});

function dettagli(fattura: FatturaElettronica) {
  return (firstBody(fattura).DatiPagamento ?? []).flatMap(
    (pagamento) => pagamento.DettaglioPagamento,
  );
}

// The ritenuta is withheld by the customer "all'atto del pagamento" (art. 25 DPR 600/73,
// https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1973-09-29;600~art25!vig=2026-01-01),
// so it lowers what the customer pays. The Agenzia's example 6.1: total 12852.00 + 2698.92,
// ritenuta 2520.00, ImportoPagamento 13030.92 (Suggerimenti per la compilazione della FatturaPA
// 1.6, pagg. 106-109,
// https://www.fatturapa.gov.it/export/documenti/Suggerimenti_Compilazione_FatturaPA_1.6.pdf).
describe('warn.importoPagamento', () => {
  const path = 'FatturaElettronicaBody[0].DatiPagamento[0].DettaglioPagamento[0].ImportoPagamento';

  test('an only instalment other than the total less the ritenuta is a warning', () => {
    const fattura = professionista();
    const [dettaglio] = dettagli(fattura);
    if (dettaglio === undefined) throw new Error('No DettaglioPagamento');
    dettaglio.ImportoPagamento = '1268.80';
    expect(warnings(fattura)).toEqual([
      {
        code: 'warn.importoPagamento',
        path,
        message: expect.stringContaining('ImportoTotaleDocumento'),
        severity: 'warning',
        source: 'Suggerimenti per la compilazione della FatturaPA 1.6, pp. 106–117',
        expected: '1060.80',
        actual: '1268.80',
      },
    ]);
  });

  // Split payment: the VAT is in the invoice, but "l'imposta è in ogni caso versata" by the
  // customer (art. 17-ter, c. 1 DPR 633/72,
  // https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633~art17ter!vig=2026-01-01).
  // The Agenzia's example 6.3 has riepilogo 465.50 + 97.65 with EsigibilitaIVA S and
  // ImportoPagamento 465.50 (Suggerimenti 1.6, p. 117); its Imposta is an error of the source,
  // 465.50 × 21% being 97.755. The test doesn't use those amounts: it checks the rule on its own
  // invoice, where the payment is the total less the ritenuta and the split VAT.
  test('in split payment the customer pays without the VAT', () => {
    const fattura = professionista();
    const riepilogo = firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0];
    const [dettaglio] = dettagli(fattura);
    if (riepilogo === undefined || dettaglio === undefined) throw new Error('No riepilogo');
    riepilogo.EsigibilitaIVA = 'S';
    // 1268.80 - 208.00 - 228.80
    dettaglio.ImportoPagamento = '832.00';
    expect(warnings(fattura)).toEqual([]);
  });

  test('with more instalments there is nothing to compare', () => {
    const fattura = professionista();
    const [pagamento] = firstBody(fattura).DatiPagamento ?? [];
    if (pagamento === undefined) throw new Error('No DatiPagamento');
    pagamento.CondizioniPagamento = 'TP01';
    pagamento.DettaglioPagamento = [
      { ModalitaPagamento: 'MP05', ImportoPagamento: '600.00' },
      { ModalitaPagamento: 'MP05', ImportoPagamento: '600.00' },
    ];
    expect(warnings(fattura)).toEqual([]);
  });
});
