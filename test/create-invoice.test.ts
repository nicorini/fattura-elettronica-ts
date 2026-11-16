import { describe, expect, test } from 'vitest';
import {
  CreateInvoiceError,
  type CreateInvoiceInput,
  createInvoice,
  type FatturaElettronica,
  parse,
  validate,
} from '../src/index.js';
import { official, officialExamples } from './helpers/fixtures.js';
import { firstBody, fpr12, fpr12Input } from './helpers/invoices.js';

type BodyInput = CreateInvoiceInput['FatturaElettronicaBody'][number];
type LineaInput = BodyInput['DatiBeniServizi']['DettaglioLinee'][number];

const SERVIZI = 'FatturaElettronicaBody[0].DatiBeniServizi';
const DOCUMENTO = 'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento';

/** The warnings of validate on an amount that createInvoice computes. */
const ARITHMETIC_WARNINGS = new Set([
  'warn.tolerance',
  'warn.importoContributoCassa',
  'warn.importoRitenuta',
  'warn.importoTotaleDocumento',
  'warn.importoPagamento',
]);

/** createInvoice, checking the invariant of every test: its output is exact for validate. */
function create(input: CreateInvoiceInput): FatturaElettronica {
  const fattura = createInvoice(input);
  const problems = validate(fattura, { today: '2025-01-20' }).problems;
  expect(problems.filter((p) => p.severity === 'error' || ARITHMETIC_WARNINGS.has(p.code))).toEqual(
    [],
  );
  return fattura;
}

/** The input of {@link fpr12} with `lines` in place of its only line. */
function withLines(
  ...lines: (Omit<LineaInput, 'NumeroLinea' | 'Descrizione'> & Partial<LineaInput>)[]
): CreateInvoiceInput {
  const input = fpr12Input();
  inputBody(input).DatiBeniServizi.DettaglioLinee = lines.map((linea, index) => ({
    NumeroLinea: String(index + 1),
    Descrizione: `Riga ${index + 1}`,
    ...linea,
  }));
  return input;
}

function inputBody(input: CreateInvoiceInput): BodyInput {
  const body = input.FatturaElettronicaBody[0];
  if (body === undefined) throw new Error('The input has no body');
  return body;
}

function servizi(fattura: FatturaElettronica) {
  return firstBody(fattura).DatiBeniServizi;
}

function totale(fattura: FatturaElettronica): string | undefined {
  return firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento;
}

/** The problems of the CreateInvoiceError that `run` throws. */
function problemsOf(run: () => unknown): CreateInvoiceError['problems'] {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(CreateInvoiceError);
    return (error as CreateInvoiceError).problems;
  }
  throw new Error('createInvoice did not throw');
}

test('fills PrezzoTotale, DatiRiepilogo and ImportoTotaleDocumento from the lines', () => {
  const expected = fpr12();
  firstBody(expected).DatiBeniServizi.DatiRiepilogo = [
    { AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00' },
  ];
  expect(create(fpr12Input())).toEqual(expected);
});

// 00423: "IF ( PrezzoTotale != ( PrezzoUnitario ± MaggiorazioneTot o ScontoTot ) * Quantità )",
// Quantita "se non presente si considera pari a 1"; sconti "a cascata", each on the price left by
// the ones before it (Elenco controlli SdI 2.0, pp. 26-30,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
describe('PrezzoTotale', () => {
  test('applies each ScontoMaggiorazione to the price left by the ones before it', () => {
    const fattura = create(
      withLines({
        Quantita: '2.00',
        PrezzoUnitario: '100.00',
        ScontoMaggiorazione: [
          { Tipo: 'SC', Percentuale: '10.00' },
          { Tipo: 'SC', Importo: '5.00' },
          { Tipo: 'MG', Percentuale: '50.00' },
        ],
        AliquotaIVA: '22.00',
      }),
    );
    // (100 − 10% = 90; − 5 = 85; + 50% = 127.50) × 2
    expect(servizi(fattura).DettaglioLinee[0]?.PrezzoTotale).toBe('255.00');
  });

  test('takes a quantity of 1 when Quantita is missing', () => {
    const fattura = create(withLines({ PrezzoUnitario: '12.50', AliquotaIVA: '22.00' }));
    expect(servizi(fattura).DettaglioLinee[0]?.PrezzoTotale).toBe('12.50');
  });

  test('rounds to the cent only at the end, half-up', () => {
    const fattura = create(
      withLines(
        { Quantita: '3.00', PrezzoUnitario: '0.33333333', AliquotaIVA: '22.00' },
        { Quantita: '3.00', PrezzoUnitario: '1.115', AliquotaIVA: '22.00' },
      ),
    );
    expect(servizi(fattura).DettaglioLinee.map((linea) => linea.PrezzoTotale)).toEqual([
      '1.00',
      '3.35',
    ]);
  });

  test('rounds a negative amount away from zero, as big.js does: -2.345 gives -2.35', () => {
    const fattura = create(withLines({ PrezzoUnitario: '-2.345', AliquotaIVA: '22.00' }));
    expect(servizi(fattura).DettaglioLinee[0]?.PrezzoTotale).toBe('-2.35');
    // -2.35 × 22% = -0.517
    expect(servizi(fattura).DatiRiepilogo[0]?.Imposta).toBe('-0.52');
  });

  test('keeps a PrezzoTotale written by the user, and sums it as it is', () => {
    const fattura = create(
      withLines({
        Quantita: '3.00',
        PrezzoUnitario: '1.23456789',
        PrezzoTotale: '3.70370367',
        AliquotaIVA: '22.00',
      }),
    );
    expect(servizi(fattura).DettaglioLinee[0]?.PrezzoTotale).toBe('3.70370367');
    expect(servizi(fattura).DatiRiepilogo[0]?.ImponibileImporto).toBe('3.70');
  });
});

// One DatiRiepilogo per rate and Natura: 00419 wants one for each rate of lines and cassa (p. 22),
// 00422 that its ImponibileImporto be their sum plus its Arrotondamento (p. 25), 00421 that its
// Imposta be ImponibileImporto × AliquotaIVA / 100 rounded to the cent (p. 24), so the tax is
// rounded once per summary and not per line (Elenco controlli SdI 2.0,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
describe('DatiRiepilogo', () => {
  test('groups the lines by rate and Natura, in order of first appearance', () => {
    const fattura = create(
      withLines(
        { PrezzoUnitario: '10.00', AliquotaIVA: '10.00' },
        { PrezzoUnitario: '100.00', AliquotaIVA: '22.00' },
        { PrezzoUnitario: '2.00', AliquotaIVA: '0.00', Natura: 'N4' },
        { PrezzoUnitario: '5.00', AliquotaIVA: ' 10.00 ' },
        { PrezzoUnitario: '3.00', AliquotaIVA: '0.00', Natura: 'N2.2' },
      ),
    );
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '10.00', ImponibileImporto: '15.00', Imposta: '1.50' },
      { AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00' },
      { AliquotaIVA: '0.00', Natura: 'N4', ImponibileImporto: '2.00', Imposta: '0.00' },
      { AliquotaIVA: '0.00', Natura: 'N2.2', ImponibileImporto: '3.00', Imposta: '0.00' },
    ]);
    expect(totale(fattura)).toBe('143.50');
  });

  test('computes the tax on the summary, not on each line', () => {
    const linea = { PrezzoUnitario: '1.03', AliquotaIVA: '10.00' };
    const fattura = create(withLines(linea, linea, linea));
    // Per line 0.103 → 0.10, three times 0.30; on the summary 3.09 × 10% = 0.309 → 0.31.
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '10.00', ImponibileImporto: '3.09', Imposta: '0.31' },
    ]);
  });

  test('puts the DatiCassaPrevidenziale after the lines', () => {
    const input = withLines({ PrezzoUnitario: '100.00', AliquotaIVA: '10.00' });
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [
      {
        TipoCassa: 'TC04',
        AlCassa: '4.00',
        ImportoContributoCassa: '4.00',
        ImponibileCassa: '100.00',
        AliquotaIVA: '22.00',
      },
    ];
    const fattura = create(input);
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '10.00', ImponibileImporto: '100.00', Imposta: '10.00' },
      { AliquotaIVA: '22.00', ImponibileImporto: '4.00', Imposta: '0.88' },
    ]);
  });

  test('completes a DatiRiepilogo of the user with the same rate and Natura', () => {
    const input = withLines(
      { PrezzoUnitario: '100.00', AliquotaIVA: '22.00' },
      { PrezzoUnitario: '50.00', AliquotaIVA: '0.00', Natura: 'N4' },
    );
    inputBody(input).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '0.00', Natura: 'N4', RiferimentoNormativo: 'Art. 10 DPR 633/72' },
      { AliquotaIVA: 22, EsigibilitaIVA: 'S', Arrotondamento: '0.004' },
    ];
    const fattura = create(input);
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      {
        AliquotaIVA: '22.00',
        EsigibilitaIVA: 'S',
        Arrotondamento: '0.004',
        ImponibileImporto: '100.00',
        Imposta: '22.00',
      },
      {
        AliquotaIVA: '0.00',
        Natura: 'N4',
        RiferimentoNormativo: 'Art. 10 DPR 633/72',
        ImponibileImporto: '50.00',
        Imposta: '0.00',
      },
    ]);
  });

  test('adds the Arrotondamento of the summary to its ImponibileImporto', () => {
    const input = withLines({ PrezzoUnitario: '100.00', AliquotaIVA: '22.00' });
    inputBody(input).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', Arrotondamento: '-0.50' },
    ];
    const fattura = create(input);
    expect(servizi(fattura).DatiRiepilogo[0]).toMatchObject({
      ImponibileImporto: '99.50',
      Imposta: '21.89',
    });
  });

  test('keeps the amounts of the user, and computes the Imposta on their ImponibileImporto', () => {
    const input = withLines({ PrezzoUnitario: '100.00', AliquotaIVA: '22.00' });
    inputBody(input).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', Arrotondamento: '0.40', ImponibileImporto: '100.40' },
    ];
    const fattura = create(input);
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      {
        AliquotaIVA: '22.00',
        Arrotondamento: '0.40',
        ImponibileImporto: '100.40',
        Imposta: '22.09',
      },
    ]);
  });

  test('leaves a DatiRiepilogo of the user with no line of its rate as it is, after the others', () => {
    const input = withLines({ PrezzoUnitario: '100.00', AliquotaIVA: '22.00' });
    const extra = { AliquotaIVA: '10.00', ImponibileImporto: '0.00', Imposta: '0.00' };
    inputBody(input).DatiBeniServizi.DatiRiepilogo = [extra];
    const fattura = create(input);
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00' },
      extra,
    ]);
  });
});

type CassaInput = NonNullable<
  BodyInput['DatiGenerali']['DatiGeneraliDocumento']['DatiCassaPrevidenziale']
>[number];

/** An input of {@link withLines} with these DatiCassaPrevidenziale. */
function withCasse(
  lines: Parameters<typeof withLines>,
  ...casse: CassaInput[]
): CreateInvoiceInput {
  const input = withLines(...lines);
  inputBody(input).DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = casse;
  return input;
}

function casse(fattura: FatturaElettronica) {
  return firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale ?? [];
}

// ImponibileCassa: "importo totale del volume di affari sul quale occorre applicare il contributo
// di cassa previdenziale"; ImportoContributoCassa: "importo del contributo alla cassa di
// appartenenza" (Specifiche tecniche FatturaPA 1.4, pag. 19,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Specifiche_tecniche_del_formato_FatturaPA_V1.4.pdf).
describe('DatiCassaPrevidenziale', () => {
  // The contributo integrativo is in the VAT base of the service: "concorrono a formare la base
  // imponibile le maggiorazioni ... addebitate dai soggetti iscritti in albi professionali a
  // titolo di contributo integrativo dovuto alla cassa di previdenza" (art. 16 D.L. 41/1995,
  // https://www.edizionieuropee.it/law/html/88/zn95_19_196.html), as the Agenzia repeats in
  // Circolare 5/E/2021, §3.4, p. 21
  // (https://www.dirittobancario.it/wp-content/uploads/sites/default/files/allegati/circolare_agenzia_delle_entrate_14_maggio_2021_n._5-e.pdf).
  test('computes the contributo of a professional cassa at 4%, in the summary of its VAT rate', () => {
    const fattura = create(
      withCasse([{ PrezzoUnitario: '1000.00', AliquotaIVA: '22.00' }], {
        TipoCassa: 'TC04',
        AlCassa: '4.00',
        ImponibileCassa: '1000.00',
        AliquotaIVA: '22.00',
      }),
    );
    expect(casse(fattura)[0]?.ImportoContributoCassa).toBe('40.00');
    // (1000 + 40) × 22% = 228.80
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '22.00', ImponibileImporto: '1040.00', Imposta: '228.80' },
    ]);
    expect(totale(fattura)).toBe('1268.80');
  });

  // The rivalsa INPS of the gestione separata is "una percentuale nella misura del 4 per cento dei
  // compensi lordi" (art. 1, c. 212 L. 662/1996), and it "concorre a formare la base imponibile
  // dell'imposta sul valore aggiunto" (messaggio INPS 7751 del 7/5/2012, pag. 2,
  // https://servizi2.inps.it/MessaggiZIP/Messaggio%20numero%207751%20del%2007-05-2012.pdf), where
  // the law is quoted in note 1. In the format it is the cassa "TC22 INPS" (Specifiche tecniche
  // FatturaPA 1.4, pag. 55).
  test('computes the rivalsa INPS as a TC22 cassa, subject to VAT', () => {
    const input = withCasse([{ PrezzoUnitario: '750.00', AliquotaIVA: '22.00', Ritenuta: 'SI' }], {
      TipoCassa: 'TC22',
      AlCassa: '4.00',
      ImponibileCassa: '750.00',
      AliquotaIVA: '22.00',
      Ritenuta: 'SI',
    });
    // The same message: the rivalsa "deve essere assoggettata al prelievo alla fonte" (pag. 2).
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.DatiRitenuta = [
      { TipoRitenuta: 'RT01', AliquotaRitenuta: '20.00', CausalePagamento: 'A' },
    ];
    const fattura = create(input);
    expect(casse(fattura)[0]?.ImportoContributoCassa).toBe('30.00');
    // (750 + 30) × 22% = 171.60
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '22.00', ImponibileImporto: '780.00', Imposta: '171.60' },
    ]);
    expect(totale(fattura)).toBe('951.60');
    // (750 + 30) × 20%
    expect(ritenute(fattura)[0]?.ImportoRitenuta).toBe('156.00');
  });

  // The forfettari invoice with "aliquota 0" and Natura N2.2 "Non soggette - altri casi", and fill
  // the box "Dati cassa previdenziale" (AdE, "Fattura elettronica per i forfettari",
  // https://www.agenziaentrate.gov.it/portale/fattura-elettronica-per-i-forfettari).
  test('puts the contributo of a forfettario in the summary of Natura N2.2, with no tax', () => {
    const input = withCasse([{ PrezzoUnitario: '1000.00', AliquotaIVA: '0.00', Natura: 'N2.2' }], {
      TipoCassa: 'TC22',
      AlCassa: '4.00',
      ImponibileCassa: '1000.00',
      AliquotaIVA: '0.00',
      Natura: 'N2.2',
    });
    input.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.RegimeFiscale = 'RF19';
    const fattura = create(input);
    expect(casse(fattura)[0]?.ImportoContributoCassa).toBe('40.00');
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '0.00', Natura: 'N2.2', ImponibileImporto: '1040.00', Imposta: '0.00' },
    ]);
    expect(totale(fattura)).toBe('1040.00');
  });

  // A studio associato "È possibile inserire in fattura elettronica riferimenti a più Casse
  // previdenziali", one block each (FAQ AdE "Compilazione della fattura elettronica",
  // https://www.agenziaentrate.gov.it/portale/it/web/guest/schede/comunicazioni/fatture-e-corrispettivi/faq-fe/risposte-alle-domande-piu-frequenti-categoria/compilazione-della-fattura-elettronica).
  test('computes each block on its own base, rounding once to the cent, half-up', () => {
    const fattura = create(
      withCasse(
        [
          { PrezzoUnitario: '500.25', AliquotaIVA: '22.00' },
          { PrezzoUnitario: '333.33', AliquotaIVA: '22.00' },
        ],
        { TipoCassa: 'TC21', AlCassa: '2.00', ImponibileCassa: '500.25', AliquotaIVA: '22.00' },
        { TipoCassa: 'TC04', AlCassa: 4, ImponibileCassa: 333.33, AliquotaIVA: 22 },
      ),
    );
    // 500.25 × 2% = 10.005 → 10.01; 333.33 × 4% = 13.3332 → 13.33
    expect(casse(fattura).map((cassa) => cassa.ImportoContributoCassa)).toEqual(['10.01', '13.33']);
    // 500.25 + 333.33 + 10.01 + 13.33 = 856.92; × 22% = 188.5224
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '22.00', ImponibileImporto: '856.92', Imposta: '188.52' },
    ]);
  });

  test('keeps an ImportoContributoCassa written by the user, and sums it as it is', () => {
    const fattura = create(
      withCasse([{ PrezzoUnitario: '1000.00', AliquotaIVA: '22.00' }], {
        TipoCassa: 'TC04',
        AlCassa: '4.00',
        ImportoContributoCassa: 39,
        AliquotaIVA: '22.00',
      }),
    );
    expect(casse(fattura)[0]?.ImportoContributoCassa).toBe('39.00');
    expect(servizi(fattura).DatiRiepilogo[0]?.ImponibileImporto).toBe('1039.00');
  });
});

type RitenutaInput = NonNullable<
  BodyInput['DatiGenerali']['DatiGeneraliDocumento']['DatiRitenuta']
>[number];

/** `input` with these DatiRitenuta. */
function withRitenute(input: CreateInvoiceInput, ...ritenute: RitenutaInput[]): CreateInvoiceInput {
  inputBody(input).DatiGenerali.DatiGeneraliDocumento.DatiRitenuta = ritenute;
  return input;
}

function ritenute(fattura: FatturaElettronica) {
  return firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiRitenuta ?? [];
}

// The Ritenuta flag of a line: "linea soggetta a ritenuta"; of a cassa: "il contributo cassa è
// soggetto a ritenuta" (Specifiche tecniche FatturaPA 1.4, pagg. 19 and 26,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Specifiche_tecniche_del_formato_FatturaPA_V1.4.pdf).
// The base is what the flags mark; the rate is the one the user writes.
describe('DatiRitenuta', () => {
  // A professional's fee bears "una ritenuta del 20 per cento a titolo di acconto" (art. 25 DPR
  // 600/73; from 2027 art. 38, c. 1 D.Lgs. 33/2025, GU n. 71 del 26/3/2025, S.O. n. 8/L). The base
  // holds the fees and the rivalsa INPS of the gestione separata, but not the spese anticipate in
  // nome e per conto del cliente (AdE, "Importi su cui si applica la ritenuta",
  // https://www.agenziaentrate.gov.it/portale/schede/pagamenti/versamento-modello-f24-ritenute-su-reddito-di-lavoro-autonomo-f24_rit_red_lav_aut/importi-su-cui-si-applica-la-ritenuta-f24_rit_red_lav_aut).
  test('computes RT01 at 20% on the fees and the rivalsa INPS, leaving out the N1 expenses', () => {
    const input = withRitenute(
      withCasse(
        [
          { PrezzoUnitario: '1000.00', AliquotaIVA: '22.00', Ritenuta: 'SI' },
          { PrezzoUnitario: '55.30', AliquotaIVA: '0.00', Natura: 'N1' },
        ],
        {
          TipoCassa: 'TC22',
          AlCassa: '4.00',
          ImponibileCassa: '1000.00',
          AliquotaIVA: '22.00',
          Ritenuta: 'SI',
        },
      ),
      { TipoRitenuta: 'RT01', AliquotaRitenuta: '20.00', CausalePagamento: 'A' },
    );
    const fattura = create(input);
    // (1000 + 40) × 20% = 208.00
    expect(ritenute(fattura)).toEqual([
      {
        TipoRitenuta: 'RT01',
        ImportoRitenuta: '208.00',
        AliquotaRitenuta: '20.00',
        CausalePagamento: 'A',
      },
    ]);
  });

  // Out of the base: "l'eventuale addebito in via di rivalsa del contributo per la cassa
  // nazionale" (the same AdE page), the 4% contributo integrativo of a professional cassa.
  test('leaves out a professional cassa without Ritenuta SI', () => {
    const input = withRitenute(
      withCasse([{ PrezzoUnitario: '1250.00', AliquotaIVA: '22.00', Ritenuta: 'SI' }], {
        TipoCassa: 'TC04',
        AlCassa: '4.00',
        ImponibileCassa: '1250.00',
        AliquotaIVA: '22.00',
      }),
      { TipoRitenuta: 'RT01', AliquotaRitenuta: 20, CausalePagamento: 'A' },
    );
    const fattura = create(input);
    expect(casse(fattura)[0]?.ImportoContributoCassa).toBe('50.00');
    // 1250 × 20% = 250.00; the riepilogo and the total keep the cassa and ignore the ritenuta
    expect(ritenute(fattura)[0]?.ImportoRitenuta).toBe('250.00');
    expect(ritenute(fattura)[0]?.AliquotaRitenuta).toBe('20.00');
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '22.00', ImponibileImporto: '1300.00', Imposta: '286.00' },
    ]);
    expect(totale(fattura)).toBe('1586.00');
  });

  // The withholding of an agent is "commisurata al 50 per cento dell'ammontare delle provvigioni"
  // (art. 25-bis, c. 2 DPR 600/73; from 2027 art. 39, c. 2 D.Lgs. 33/2025) at the rate of the first
  // IRPEF bracket, 23% (AdE, "Aliquote e calcolo dell'Irpef",
  // https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef).
  // The format doesn't say which share: the user writes the amount, and it stays.
  test('keeps an ImportoRitenuta written by hand, as for the reduced base of an agent', () => {
    const input = withRitenute(
      withLines({ PrezzoUnitario: '750.00', AliquotaIVA: '22.00', Ritenuta: 'SI' }),
      {
        TipoRitenuta: 'RT01',
        ImportoRitenuta: 86.25,
        AliquotaRitenuta: '23.00',
        CausalePagamento: 'A',
      },
    );
    // 750 × 50% × 23% = 86.25, less than 750 × 23% = 172.50
    expect(ritenute(create(input))[0]?.ImportoRitenuta).toBe('86.25');
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
describe('ImportoTotaleDocumento', () => {
  test('adds the Arrotondamento of the document to imponibili and imposte', () => {
    const input = withLines({ PrezzoUnitario: '99.99', AliquotaIVA: '22.00' });
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.Arrotondamento = '0.01';
    // 99.99 + 22.00 (21.9978) + 0.01
    expect(totale(create(input))).toBe('122.00');
  });

  test('keeps a total written by the user, which validate flags', () => {
    const input = fpr12Input();
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = 150;
    const fattura = createInvoice(input);
    expect(totale(fattura)).toBe('150.00');
    expect(validate(fattura).problems).toContainEqual(
      expect.objectContaining({
        code: 'warn.importoTotaleDocumento',
        expected: '122.00',
        actual: '150.00',
      }),
    );
  });

  // A ScontoMaggiorazione of the document applies "sull'importo totale del documento" and "non è
  // legato in alcun modo agli sconti/maggiorazioni previsti a livello di linea" (Suggerimenti 1.6,
  // p. 53): no source says whether that total is with or without VAT.
  test('is not computed with a ScontoMaggiorazione of the document: an error asks for it', () => {
    const input = fpr12Input();
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.ScontoMaggiorazione = [
      { Tipo: 'SC', Importo: '2.00' },
    ];
    expect(problemsOf(() => createInvoice(input))).toEqual([
      {
        code: 'create.importoTotaleDocumento',
        path: `${DOCUMENTO}.ImportoTotaleDocumento`,
        message: expect.stringContaining('ScontoMaggiorazione'),
      },
    ]);
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = '120.00';
    expect(totale(create(input))).toBe('120.00');
  });
});

type PagamentoInput = NonNullable<BodyInput['DatiPagamento']>[number];

/** `input` with these DatiPagamento. */
function withPagamenti(
  input: CreateInvoiceInput,
  ...pagamenti: PagamentoInput[]
): CreateInvoiceInput {
  inputBody(input).DatiPagamento = pagamenti;
  return input;
}

function importiPagamento(fattura: FatturaElettronica): (string | undefined)[] {
  return (firstBody(fattura).DatiPagamento ?? []).flatMap((pagamento) =>
    pagamento.DettaglioPagamento.map((dettaglio) => dettaglio.ImportoPagamento),
  );
}

// The ritenuta is withheld by the customer "all'atto del pagamento" (art. 25 DPR 600/73), so it
// lowers what the customer pays, not the total. The Agenzia's examples of a professional subject
// to ritenuta: 6.1, riepilogo 12852.00 + 2698.92, ImportoRitenuta 2520.00, ImportoPagamento
// 13030.92 (pagg. 106-109); 6.2, 1664.00 + 349.44, ritenuta 332.80, ImportoPagamento 1680.64
// (pagg. 110-113) (Suggerimenti per la compilazione della FatturaPA 1.6,
// https://www.fatturapa.gov.it/export/documenti/Suggerimenti_Compilazione_FatturaPA_1.6.pdf).
describe('DatiPagamento', () => {
  test('pays the total less the ritenuta: example 6.1, cassa TC02 not subject to ritenuta', () => {
    const input = withPagamenti(
      withRitenute(
        withCasse([{ PrezzoUnitario: '12600.00', AliquotaIVA: '21.00', Ritenuta: 'SI' }], {
          TipoCassa: 'TC02',
          AlCassa: '2.00',
          ImponibileCassa: '12600.00',
          AliquotaIVA: '21.00',
        }),
        { TipoRitenuta: 'RT01', AliquotaRitenuta: '20.00', CausalePagamento: 'A' },
      ),
      { CondizioniPagamento: 'TP02', DettaglioPagamento: [{ ModalitaPagamento: 'MP02' }] },
    );
    const fattura = create(input);
    expect(casse(fattura)[0]?.ImportoContributoCassa).toBe('252.00');
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '21.00', ImponibileImporto: '12852.00', Imposta: '2698.92' },
    ]);
    expect(ritenute(fattura)[0]?.ImportoRitenuta).toBe('2520.00');
    expect(totale(fattura)).toBe('15550.92');
    expect(importiPagamento(fattura)).toEqual(['13030.92']);
  });

  test('pays the total less the ritenuta: example 6.2, rivalsa INPS subject to ritenuta', () => {
    const input = withPagamenti(
      withRitenute(
        withCasse([{ PrezzoUnitario: '1600.00', AliquotaIVA: '21.00', Ritenuta: 'SI' }], {
          TipoCassa: 'TC22',
          AlCassa: '4.00',
          ImponibileCassa: '1600.00',
          AliquotaIVA: '21.00',
          Ritenuta: 'SI',
        }),
        { TipoRitenuta: 'RT01', AliquotaRitenuta: '20.00', CausalePagamento: 'A' },
      ),
      { CondizioniPagamento: 'TP02', DettaglioPagamento: [{ ModalitaPagamento: 'MP02' }] },
    );
    const fattura = create(input);
    expect(servizi(fattura).DatiRiepilogo).toEqual([
      { AliquotaIVA: '21.00', ImponibileImporto: '1664.00', Imposta: '349.44' },
    ]);
    expect(ritenute(fattura)[0]?.ImportoRitenuta).toBe('332.80');
    expect(totale(fattura)).toBe('2013.44');
    expect(importiPagamento(fattura)).toEqual(['1680.64']);
  });

  // Split payment: the suppliers "emettono la fattura secondo quanto previsto dall'art. 21 del
  // decreto n. 633 del 1972 con l'annotazione 'scissione dei pagamenti'" (DM 23 gennaio 2015,
  // art. 2, c. 1, GU n. 27 del 3/2/2015,
  // https://www.gazzettaufficiale.it/eli/id/2015/02/03/15A00695/sg): the VAT is in the invoice,
  // but the customer "versa" it to the Erario (art. 17-ter, c. 1 DPR 633/72). The Agenzia's
  // example 6.3 has riepilogo 465.50 + 97.65 with EsigibilitaIVA S and ImportoPagamento 465.50
  // (Suggerimenti 1.6, p. 117).
  test('pays the total less the VAT in split payment, which stays in the total', () => {
    const input = withPagamenti(
      withLines(
        { PrezzoUnitario: '465.50', AliquotaIVA: '21.00' },
        { PrezzoUnitario: '10.00', AliquotaIVA: '0.00', Natura: 'N1' },
      ),
      { CondizioniPagamento: 'TP02', DettaglioPagamento: [{ ModalitaPagamento: 'MP05' }] },
    );
    inputBody(input).DatiBeniServizi.DatiRiepilogo = [{ AliquotaIVA: 21, EsigibilitaIVA: 'S' }];
    const fattura = create(input);
    expect(servizi(fattura).DatiRiepilogo[0]).toEqual({
      AliquotaIVA: '21.00',
      ImponibileImporto: '465.50',
      Imposta: '97.76',
      EsigibilitaIVA: 'S',
    });
    expect(totale(fattura)).toBe('573.26');
    // 573.26 − 97.76: the N1 line is paid, the split VAT is not
    expect(importiPagamento(fattura)).toEqual(['475.50']);
  });

  test('subtracts every ritenuta, also one written by hand, and the split VAT together', () => {
    const input = withPagamenti(
      withRitenute(
        withLines({ PrezzoUnitario: '1000.00', AliquotaIVA: '22.00', Ritenuta: 'SI' }),
        {
          TipoRitenuta: 'RT01',
          ImportoRitenuta: '200.00',
          AliquotaRitenuta: '20.00',
          CausalePagamento: 'A',
        },
        { TipoRitenuta: 'RT04', ImportoRitenuta: 15.5, AliquotaRitenuta: 2, CausalePagamento: 'A' },
      ),
      { CondizioniPagamento: 'TP02', DettaglioPagamento: [{ ModalitaPagamento: 'MP05' }] },
    );
    inputBody(input).DatiBeniServizi.DatiRiepilogo = [{ AliquotaIVA: 22, EsigibilitaIVA: 'S' }];
    // 1000 + 220 − 200 − 15.50 − 220
    expect(importiPagamento(create(input))).toEqual(['784.50']);
  });

  test('keeps an ImportoPagamento written by the user, which validate flags', () => {
    const input = withPagamenti(fpr12Input(), {
      CondizioniPagamento: 'TP02',
      DettaglioPagamento: [{ ModalitaPagamento: 'MP05', ImportoPagamento: 100 }],
    });
    const fattura = createInvoice(input);
    expect(importiPagamento(fattura)).toEqual(['100.00']);
    expect(validate(fattura).problems).toContainEqual(
      expect.objectContaining({
        code: 'warn.importoPagamento',
        expected: '122.00',
        actual: '100.00',
      }),
    );
  });

  test('adds no DatiPagamento', () => {
    expect(firstBody(create(fpr12Input())).DatiPagamento).toBeUndefined();
  });

  // TP01 is "pagamento a rate" (Specifiche tecniche FatturaPA 1.4, p. 59): how the total splits
  // into instalments is an agreement between the parties, not in the format.
  test('asks for the amount of each instalment without one, across all DatiPagamento', () => {
    const input = withPagamenti(
      fpr12Input(),
      {
        CondizioniPagamento: 'TP01',
        DettaglioPagamento: [
          { ModalitaPagamento: 'MP05', ImportoPagamento: '61.00' },
          { ModalitaPagamento: 'MP05' },
        ],
      },
      { CondizioniPagamento: 'TP01', DettaglioPagamento: [{ ModalitaPagamento: 'MP05' }] },
    );
    const body = 'FatturaElettronicaBody[0]';
    expect(problemsOf(() => createInvoice(input))).toEqual([
      {
        code: 'create.importoPagamento',
        path: `${body}.DatiPagamento[0].DettaglioPagamento[1].ImportoPagamento`,
        message: expect.stringContaining('più DettaglioPagamento'),
      },
      {
        code: 'create.importoPagamento',
        path: `${body}.DatiPagamento[1].DettaglioPagamento[0].ImportoPagamento`,
        message: expect.stringContaining('più DettaglioPagamento'),
      },
    ]);
  });
});

describe('the input', () => {
  test('takes amounts, rates and quantities as numbers, padded to 2 decimals', () => {
    const fattura = create(withLines({ Quantita: 2, PrezzoUnitario: 50.5, AliquotaIVA: 22 }));
    expect(servizi(fattura).DettaglioLinee[0]).toMatchObject({
      Quantita: '2.00',
      PrezzoUnitario: '50.50',
      PrezzoTotale: '101.00',
      AliquotaIVA: '22.00',
    });
  });

  test('keeps every field of the user as it is, and never changes the input', () => {
    const input = withLines({ Quantita: '3.00', PrezzoUnitario: '1.23456789', AliquotaIVA: 22 });
    const copy = structuredClone(input);
    const fattura = create(input);
    expect(input).toEqual(copy);
    expect(servizi(fattura).DettaglioLinee[0]).toEqual({
      NumeroLinea: '1',
      Descrizione: 'Riga 1',
      Quantita: '3.00',
      PrezzoUnitario: '1.23456789',
      PrezzoTotale: '3.70',
      AliquotaIVA: '22.00',
    });
  });

  test('computes each body of a lot on its own', () => {
    const input = fpr12Input();
    const second = structuredClone(inputBody(input));
    second.DatiGenerali.DatiGeneraliDocumento.Numero = '2';
    second.DatiBeniServizi.DettaglioLinee = [
      { NumeroLinea: '1', Descrizione: 'Libro', PrezzoUnitario: '20.00', AliquotaIVA: '4.00' },
    ];
    input.FatturaElettronicaBody.push(second);
    const fattura = create(input);
    expect(
      fattura.FatturaElettronicaBody.map((body) => body.DatiBeniServizi.DatiRiepilogo),
    ).toEqual([
      [{ AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00' }],
      [{ AliquotaIVA: '4.00', ImponibileImporto: '20.00', Imposta: '0.80' }],
    ]);
    expect(
      fattura.FatturaElettronicaBody.map(
        (body) => body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento,
      ),
    ).toEqual(['122.00', '20.80']);
  });
});

describe('CreateInvoiceError', () => {
  test.each([
    ['0.1 + 0.2', 0.1 + 0.2],
    ['an exponent', 1e-7],
    ['NaN', Number.NaN],
    ['a string that is not a decimal', '12,50'],
  ])('create.number for %s', (_, value) => {
    expect(
      problemsOf(() => createInvoice(withLines({ PrezzoUnitario: value, AliquotaIVA: '22.00' }))),
    ).toEqual([
      {
        code: 'create.number',
        path: `${SERVIZI}.DettaglioLinee[0].PrezzoUnitario`,
        message: expect.any(String),
      },
    ]);
  });

  // "In caso di presenza contemporanea di Importo e Percentuale, si considera solo il primo ai
  // fini del calcolo", without telling which one is first (Elenco controlli SdI 2.0, p. 27).
  test('create.scontoAmbiguo for a block with both Importo and Percentuale', () => {
    const input = withLines({
      PrezzoUnitario: '100.00',
      ScontoMaggiorazione: [{ Tipo: 'SC', Percentuale: '10.00', Importo: '5.00' }],
      AliquotaIVA: '22.00',
    });
    expect(problemsOf(() => createInvoice(input))).toEqual([
      {
        code: 'create.scontoAmbiguo',
        path: `${SERVIZI}.DettaglioLinee[0].ScontoMaggiorazione[0]`,
        message: expect.stringContaining('Percentuale'),
      },
    ]);
  });

  test('create.scontoAmbiguo for a negative Importo, whose direction Tipo already gives', () => {
    const input = withLines({
      PrezzoUnitario: '100.00',
      ScontoMaggiorazione: [{ Tipo: 'SC', Importo: '-5.00' }],
      AliquotaIVA: '22.00',
    });
    expect(problemsOf(() => createInvoice(input))).toEqual([
      {
        code: 'create.scontoAmbiguo',
        path: `${SERVIZI}.DettaglioLinee[0].ScontoMaggiorazione[0].Importo`,
        message: expect.stringContaining('Tipo'),
      },
    ]);
  });

  // The format doesn't link lines and cassa, and with more blocks only the user knows the share of
  // each professional: ImponibileCassa is the "importo totale del volume di affari sul quale
  // occorre applicare il contributo" (Specifiche tecniche FatturaPA 1.4, pag. 19), not a sum the
  // library can pick.
  test('create.imponibileCassa for each cassa with neither ImponibileCassa nor its contributo', () => {
    const input = withCasse(
      [{ PrezzoUnitario: '1000.00', AliquotaIVA: '22.00' }],
      { TipoCassa: 'TC04', AlCassa: '4.00', AliquotaIVA: '22.00' },
      { TipoCassa: 'TC22', AlCassa: '4.00', ImportoContributoCassa: '40.00', AliquotaIVA: '22.00' },
      { TipoCassa: 'TC02', AlCassa: '4.00', AliquotaIVA: '22.00' },
    );
    expect(problemsOf(() => createInvoice(input))).toEqual(
      [0, 2].map((index) => ({
        code: 'create.imponibileCassa',
        path: `${DOCUMENTO}.DatiCassaPrevidenziale[${index}].ImponibileCassa`,
        message: expect.stringContaining('ImportoContributoCassa'),
      })),
    );
  });

  // The library computes only a single RT01 or RT02 (ritenuta persone fisiche / giuridiche,
  // Specifiche tecniche FatturaPA 1.4, pag. 53). RT03-RT06 are contributi previdenziali whose
  // amount depends on yearly ceilings the invoice doesn't hold, and with more blocks the format
  // doesn't say which one a Ritenuta flag belongs to.
  test('create.importoRitenuta for an RT03-RT06 block without ImportoRitenuta', () => {
    const input = withRitenute(withLines({ PrezzoUnitario: '1000.00', AliquotaIVA: '22.00' }), {
      TipoRitenuta: 'RT04',
      AliquotaRitenuta: '8.50',
      CausalePagamento: 'ZO',
    });
    expect(problemsOf(() => createInvoice(input))).toEqual([
      {
        code: 'create.importoRitenuta',
        path: `${DOCUMENTO}.DatiRitenuta[0].ImportoRitenuta`,
        message: expect.stringContaining('RT04'),
      },
    ]);
  });

  test('create.importoRitenuta for each block without ImportoRitenuta, when there are more', () => {
    const input = withRitenute(
      withLines({ PrezzoUnitario: '1000.00', AliquotaIVA: '22.00', Ritenuta: 'SI' }),
      { TipoRitenuta: 'RT01', AliquotaRitenuta: '20.00', CausalePagamento: 'A' },
      {
        TipoRitenuta: 'RT04',
        ImportoRitenuta: '85.00',
        AliquotaRitenuta: '8.50',
        CausalePagamento: 'ZO',
      },
      { TipoRitenuta: 'RT02', AliquotaRitenuta: '20.00', CausalePagamento: 'A' },
    );
    expect(problemsOf(() => createInvoice(input))).toEqual(
      [0, 2].map((index) => ({
        code: 'create.importoRitenuta',
        path: `${DOCUMENTO}.DatiRitenuta[${index}].ImportoRitenuta`,
        message: expect.stringContaining('più DatiRitenuta'),
      })),
    );
  });

  test('collects every problem of the input before throwing, with a message naming the first', () => {
    const input = withLines(
      { PrezzoUnitario: 0.1 + 0.2, AliquotaIVA: '22.00' },
      {
        Quantita: 'due',
        PrezzoUnitario: '10.00',
        ScontoMaggiorazione: [{ Tipo: 'SC', Percentuale: '10.00', Importo: '1.00' }],
        AliquotaIVA: '22.00',
      },
    );
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.ScontoMaggiorazione = [
      { Tipo: 'SC', Importo: '2.00' },
    ];
    inputBody(input).DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [
      { TipoCassa: 'TC04', AlCassa: '4.00', AliquotaIVA: '22.00' },
    ];
    let thrown: unknown;
    try {
      createInvoice(input);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(CreateInvoiceError);
    expect(thrown).toBeInstanceOf(Error);
    const error = thrown as CreateInvoiceError;
    expect(error.problems.map(({ code, path }) => [code, path])).toEqual([
      ['create.number', `${SERVIZI}.DettaglioLinee[0].PrezzoUnitario`],
      ['create.number', `${SERVIZI}.DettaglioLinee[1].Quantita`],
      ['create.scontoAmbiguo', `${SERVIZI}.DettaglioLinee[1].ScontoMaggiorazione[0]`],
      ['create.imponibileCassa', `${DOCUMENTO}.DatiCassaPrevidenziale[0].ImponibileCassa`],
      ['create.importoTotaleDocumento', `${DOCUMENTO}.ImportoTotaleDocumento`],
    ]);
    expect(error.name).toBe('CreateInvoiceError');
    expect(error.message).toMatch(
      /^L'ingresso di createInvoice ha 5 problemi\. Il primo: .*PrezzoUnitario/,
    );
  });
});

describe('the official examples', () => {
  // FPR02 and FPR03 have summaries that don't match their lines (see test/fixtures/official). No
  // example has an ImportoTotaleDocumento, which is optional: the one createInvoice adds is
  // checked by the tests above, and left out of the comparison. None has a DatiCassaPrevidenziale
  // or a DatiRitenuta; each body has one DettaglioPagamento, so its ImportoPagamento is computed.
  const examples = officialExamples.filter((name) => !/FPR0[23]$/.test(name));

  test.each(examples)('%s: without the computed fields, gives the original back', (name) => {
    const original = parse(official(name));
    const input: CreateInvoiceInput = structuredClone(original);
    for (const body of input.FatturaElettronicaBody) {
      for (const linea of body.DatiBeniServizi.DettaglioLinee) delete linea.PrezzoTotale;
      for (const riepilogo of body.DatiBeniServizi.DatiRiepilogo ?? []) {
        delete riepilogo.ImponibileImporto;
        delete riepilogo.Imposta;
      }
      for (const pagamento of body.DatiPagamento ?? []) {
        for (const dettaglio of pagamento.DettaglioPagamento) delete dettaglio.ImportoPagamento;
      }
    }
    const fattura = createInvoice(input);
    for (const body of fattura.FatturaElettronicaBody) {
      delete body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento;
    }
    expect(fattura).toEqual(original);
  });
});
