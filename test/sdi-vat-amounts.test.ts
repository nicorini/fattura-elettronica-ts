import { describe, expect, test } from 'vitest';
import { validate } from '../src/index.js';
import { official } from './helpers/fixtures.js';
import { firstBody, firstLine, fpr12 } from './helpers/invoices.js';
import { vatProblems } from './helpers/vat.js';

const SERVIZI = 'FatturaElettronicaBody[0].DatiBeniServizi';

// 00423: "IF ( PrezzoTotale != ( PrezzoUnitario ± MaggiorazioneTot o ScontoTot ) * Quantità )",
// Quantita "se non presente si considera pari a 1" (Elenco controlli SdI 2.0, pp. 26-30,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
describe('00423 PrezzoTotale', () => {
  const linePath = 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0].PrezzoTotale';

  test('PrezzoUnitario × Quantita is right', () => {
    expect(vatProblems(fpr12())).toEqual([]);
  });

  test('a PrezzoTotale off by more than a cent is an error, with expected and actual', () => {
    const fattura = fpr12();
    firstLine(fattura).PrezzoUnitario = '50.02';
    expect(vatProblems(fattura)).toEqual([
      {
        code: 'sdi.00423',
        sdiCode: '00423',
        path: linePath,
        message: expect.stringContaining('PrezzoTotale'),
        severity: 'error',
        source: 'Elenco controlli SdI 2.0, p. 26',
        expected: '100.04',
        actual: '100.00',
      },
    ]);
  });

  test('without Quantita the quantity is 1', () => {
    const fattura = fpr12();
    const linea = firstLine(fattura);
    delete linea.Quantita;
    linea.PrezzoUnitario = '100.00';
    expect(vatProblems(fattura)).toEqual([]);
  });

  // Allegato A 1.9.1, p. 51: scarto "Se non viene verificata la suddetta corrispondenza e la
  // differenza è superiore a ±1 centesimo di euro (tolleranza ammessa)"
  // (https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1).
  // A difference of exactly 0.01 passes, as on the real SdI (FatturaElettronica.NET#394).
  test('a difference of exactly 0.01 passes, with a warn.tolerance', () => {
    const fattura = fpr12();
    firstLine(fattura).PrezzoUnitario = '50.005';
    expect(vatProblems(fattura)).toEqual([
      {
        code: 'warn.tolerance',
        path: linePath,
        message: expect.stringContaining('00423'),
        severity: 'warning',
        source: 'Elenco controlli SdI 2.0, p. 26',
        expected: '100.01',
        actual: '100.00',
      },
    ]);
  });

  test('a difference just above 0.01 is an error', () => {
    const fattura = fpr12();
    firstLine(fattura).PrezzoUnitario = '50.00500001';
    expect(vatProblems(fattura)).toEqual([
      expect.objectContaining({ code: 'sdi.00423', expected: '100.01000002', actual: '100.00' }),
    ]);
  });

  // The SdI compares with the exact product: in Caso 2 the result is 42092.05875 and "per effetto
  // della tolleranza, è ammissibile anche un <PrezzoTotale> con i valori 42092.05 oppure 42092.06"
  // (Elenco controlli SdI 2.0, p. 29), so the error stays on the exact product. The
  // warn.tolerance is the library's own: a PrezzoTotale equal to the product rounded to the cent,
  // half-up away from zero, is how a seller writes it and gets no warning.
  describe('with a price of many decimals', () => {
    const withPrice = (prezzoTotale: string) => {
      const fattura = fpr12();
      const linea = firstLine(fattura);
      linea.Quantita = '3.00';
      linea.PrezzoUnitario = '1.23456789';
      linea.PrezzoTotale = prezzoTotale;
      return fattura;
    };
    const lineProblems = (fattura: ReturnType<typeof fpr12>) =>
      vatProblems(fattura).filter((problem) => problem.path === linePath);

    test('the exact product rounded to the cent is no problem: 3.70370367 → 3.70', () => {
      expect(lineProblems(withPrice('3.70'))).toEqual([]);
    });

    test('the exact product itself is no problem', () => {
      expect(lineProblems(withPrice('3.70370367'))).toEqual([]);
    });

    test('a cent off the rounded product is a warn.tolerance with the rounded expected', () => {
      expect(lineProblems(withPrice('3.71'))).toEqual([
        expect.objectContaining({ code: 'warn.tolerance', expected: '3.70', actual: '3.71' }),
      ]);
    });

    test('the error is judged on the exact product', () => {
      // 3.69 is 0.01370367 off the exact product, though only 0.01 off the rounded 3.70.
      expect(lineProblems(withPrice('3.69'))).toEqual([
        expect.objectContaining({ code: 'sdi.00423', expected: '3.70370367', actual: '3.69' }),
      ]);
    });
  });

  test('a negative line (a deposit taken back) is checked with its sign', () => {
    const fattura = fpr12();
    const linea = firstLine(fattura);
    linea.PrezzoUnitario = '-50.00';
    expect(vatProblems(fattura)).toEqual([
      expect.objectContaining({ code: 'sdi.00423', expected: '-100.00', actual: '100.00' }),
    ]);
  });

  // The three worked examples of the Elenco controlli 2.0: Caso 1 on p. 28, Caso 2 on p. 29, Caso 3
  // on p. 30. 100 pieces at 500.00 with three or four discounts.
  const caso = (sconti: { Percentuale?: string; Importo?: string }[], prezzoTotale: string) => {
    const fattura = fpr12();
    const linea = firstLine(fattura);
    linea.Quantita = '100.00';
    linea.PrezzoUnitario = '500.00';
    linea.ScontoMaggiorazione = sconti.map((sconto) => ({ Tipo: 'SC', ...sconto }));
    linea.PrezzoTotale = prezzoTotale;
    return fattura;
  };
  const amountProblems = (fattura: ReturnType<typeof fpr12>) =>
    vatProblems(fattura).filter((problem) => problem.path === linePath);

  test('Caso 1: discounts as amounts are summed: 48000.00', () => {
    const sconti = [{ Importo: '10.05' }, { Importo: '5.25' }, { Importo: '4.70' }];
    expect(amountProblems(caso(sconti, '48000.00'))).toEqual([]);
  });

  test('Caso 2: percentages apply in cascade: 42092.05875, and 42092.05 or 42092.06 pass', () => {
    const sconti = [{ Percentuale: '8.50' }, { Percentuale: '5.15' }, { Percentuale: '3.00' }];
    expect(amountProblems(caso(sconti, '42092.05875'))).toEqual([]);
    // 42092.06 is the exact result rounded to the cent: no warning.
    expect(amountProblems(caso(sconti, '42092.06'))).toEqual([]);
    expect(amountProblems(caso(sconti, '42092.05'))).toEqual([
      expect.objectContaining({ code: 'warn.tolerance', expected: '42092.06' }),
    ]);
    expect(amountProblems(caso(sconti, '42092.07'))).toEqual([
      expect.objectContaining({ code: 'sdi.00423', expected: '42092.05875' }),
    ]);
  });

  // Caso 3 (p. 30): the second block has Percentuale 5.15 and Importo 23.56, and the worked
  // result counts the Importo: "( Risultato1 - <Importo> secondo sconto ) = Risultato2",
  // "457.50 - 23.56 = 433.94", "410.5612 * 100.00 = 41056.12". The Importo is the Percentuale of
  // 457.50 rounded to the cent (23.56125 → 23.56), so the two agree and only the Importo counts.
  // With the Percentuale the result would be 41055.9975, off by more than 0.01.
  test('Caso 3: blocks apply in order, and an Importo that agrees with its Percentuale counts alone: 41056.12', () => {
    const sconti = [
      { Percentuale: '8.50' },
      { Percentuale: '5.15', Importo: '23.56' },
      { Importo: '15.00' },
      { Percentuale: '2.00' },
    ];
    expect(amountProblems(caso(sconti, '41056.12'))).toEqual([]);
    expect(amountProblems(caso(sconti, '41056.00'))).toEqual([
      expect.objectContaining({ code: 'sdi.00423', expected: '41056.12', actual: '41056.00' }),
    ]);
  });

  test('a maggiorazione raises the price', () => {
    const fattura = fpr12();
    const linea = firstLine(fattura);
    linea.PrezzoUnitario = '40.00';
    linea.ScontoMaggiorazione = [{ Tipo: 'MG', Percentuale: '25.00' }];
    expect(vatProblems(fattura)).toEqual([]);
  });

  // A negative Importo: the Elenco controlli 2.0, p. 27, gives the direction with Tipo ("IF ( Tipo
  // == "SC" ) add Importo to ScontoTot ELSE-IF ( Tipo == "MG" ) add Importo to
  // MaggiorazioneTot") and never speaks of the sign of Importo, which the XSD allows
  // (Amount8DecimalType, "[\-]?[0-9]{1,11}\.[0-9]{2,8}"). With the sign, a discount of -10.00
  // on 100.00 gives 110.00; as an absolute value, 90.00. Both readings passing is no problem,
  // one is a warning, none the error.
  describe('with a negative Importo', () => {
    const withDiscount = (tipo: 'SC' | 'MG', importo: string, prezzoTotale: string) => {
      const fattura = fpr12();
      const linea = firstLine(fattura);
      linea.Quantita = '1.00';
      linea.PrezzoUnitario = '100.00';
      linea.ScontoMaggiorazione = [{ Tipo: tipo, Importo: importo }];
      linea.PrezzoTotale = prezzoTotale;
      return fattura;
    };

    test.each([
      ['SC', '110.00'],
      ['SC', '90.00'],
      ['MG', '90.00'],
      ['MG', '110.00'],
    ] as const)(
      '%s of -10.00 with PrezzoTotale %s, one of the readings, is a warning',
      (tipo, totale) => {
        expect(amountProblems(withDiscount(tipo, '-10.00', totale))).toEqual([
          {
            code: 'sdi.00423.warn',
            path: linePath,
            message: expect.stringContaining('Importo negativo'),
            severity: 'warning',
            source: 'Elenco controlli SdI 2.0, p. 27',
            expected: tipo === 'SC' ? '110.00' : '90.00',
            actual: totale,
          },
        ]);
      },
    );

    test('a PrezzoTotale that fits neither reading is the error, expected with the sign', () => {
      expect(amountProblems(withDiscount('SC', '-10.00', '100.00'))).toEqual([
        expect.objectContaining({ code: 'sdi.00423', expected: '110.00', actual: '100.00' }),
      ]);
    });

    test('when both readings fit, only the tolerance of the reading with the sign counts', () => {
      // -0.01 off: 100.01 with the sign, 99.99 as an absolute value, both within 0.01 of 100.00.
      expect(amountProblems(withDiscount('SC', '-0.01', '100.00'))).toEqual([
        expect.objectContaining({ code: 'warn.tolerance', expected: '100.01', actual: '100.00' }),
      ]);
    });
  });

  // "In caso di presenza contemporanea di Importo e Percentuale, si considera solo il primo ai
  // fini del calcolo" (Elenco controlli SdI 2.0, p. 27,
  // https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
  // "Il primo" is ambiguous: Importo is named first, Percentuale comes first in the XSD, and
  // Caso 3 (p. 30) uses an Importo that agrees with its Percentuale. Only a secondary source, a
  // 2016 note by Zucchetti, says "IL SISTEMA DA' PRIORITA' ALL'IMPORTO"
  // (https://fattureoutsourcing.zucchetti.it/documenti/ARROTONDAMENTI_E_SCONTO.pdf). So both
  // readings count: none fitting is the error, one a warning, both no problem.
  describe('with Importo and Percentuale in the same block', () => {
    const withBoth = (sconti: { Importo: string; Percentuale: string }[], prezzoTotale: string) => {
      const fattura = fpr12();
      const linea = firstLine(fattura);
      linea.Quantita = '1.00';
      linea.PrezzoUnitario = '100.00';
      linea.ScontoMaggiorazione = sconti.map((sconto) => ({ Tipo: 'SC', ...sconto }));
      linea.PrezzoTotale = prezzoTotale;
      return fattura;
    };

    // Importo 10.00 gives 90.00, Percentuale 20.00 gives 80.00.
    test.each(['90.00', '80.00'])(
      'PrezzoTotale %s, one of the readings, is a warning',
      (totale) => {
        expect(
          amountProblems(withBoth([{ Importo: '10.00', Percentuale: '20.00' }], totale)),
        ).toEqual([
          {
            code: 'sdi.00423.warn',
            path: linePath,
            message: expect.stringContaining('Percentuale'),
            severity: 'warning',
            source: 'Elenco controlli SdI 2.0, p. 27',
            expected: '90.00',
            actual: totale,
          },
        ]);
      },
    );

    test('a PrezzoTotale that fits neither reading is the error, expected with the Importo', () => {
      expect(
        amountProblems(withBoth([{ Importo: '10.00', Percentuale: '20.00' }], '85.00')),
      ).toEqual([
        expect.objectContaining({ code: 'sdi.00423', expected: '90.00', actual: '85.00' }),
      ]);
    });

    // Agreeing means |Importo| is the Percentuale of the current price rounded to the cent, half-up
    // away from zero, as in Caso 3 (p. 30): 1.00% of 1.50 is 0.015, so 0.02 agrees and a cent
    // below or above does not. 100 pieces make the readings differ by more than the tolerance.
    describe('at the rounding boundary', () => {
      const atBoundary = (importo: string, prezzoTotale: string) => {
        const fattura = withBoth([{ Importo: importo, Percentuale: '1.00' }], prezzoTotale);
        const linea = firstLine(fattura);
        linea.Quantita = '100.00';
        linea.PrezzoUnitario = '1.50';
        return fattura;
      };

      test('an Importo equal to the Percentuale rounded half-up agrees: no problem', () => {
        expect(amountProblems(atBoundary('0.02', '148.00'))).toEqual([]);
      });

      // With the Percentuale the result is 148.50 either way.
      test.each([
        ['0.01', '149.00'],
        ['0.03', '147.00'],
      ])(
        'an Importo of %s, a cent off the rounded Percentuale, is still a warning',
        (importo, totale) => {
          expect(amountProblems(atBoundary(importo, totale))).toEqual([
            expect.objectContaining({ code: 'sdi.00423.warn', expected: totale, actual: totale }),
          ]);
        },
      );
    });

    // The agreement is on the absolute value: a negative Importo that agrees with its Percentuale
    // counts alone, and only its sign is open: 120.00 with the sign, 80.00 as an absolute value.
    test('a negative Importo that agrees with its Percentuale leaves only the sign open', () => {
      expect(
        amountProblems(withBoth([{ Importo: '-20.00', Percentuale: '20.00' }], '80.00')),
      ).toEqual([
        expect.objectContaining({
          code: 'sdi.00423.warn',
          message: expect.not.stringContaining('Percentuale'),
          expected: '120.00',
          actual: '80.00',
        }),
      ]);
    });

    // Agreement depends on the price of the cascade. The first block disagrees (5.00 against
    // 10.00): with its Importo the price is 95.00, with its Percentuale 90.00. The second block's
    // -45.00 agrees with 50.00% only on 90.00, where it counts alone, with its sign (135.00) or as
    // an absolute value (45.00).
    test('a block that agrees only in some readings counts its Importo in those', () => {
      const sconti = [
        { Importo: '5.00', Percentuale: '10.00' },
        { Importo: '-45.00', Percentuale: '50.00' },
      ];
      expect(amountProblems(withBoth(sconti, '45.00'))).toEqual([
        expect.objectContaining({ code: 'sdi.00423.warn', expected: '140.00', actual: '45.00' }),
      ]);
    });

    test('Importo and Percentuale that agree are no problem', () => {
      expect(
        amountProblems(withBoth([{ Importo: '20.00', Percentuale: '20.00' }], '80.00')),
      ).toEqual([]);
    });

    // With a negative Importo too there are three readings: the Importo with its sign (110.00),
    // as an absolute value (90.00), and the Percentuale (80.00).
    test.each(['110.00', '90.00', '80.00'])(
      'with a negative Importo, PrezzoTotale %s, one of three readings, is a warning',
      (totale) => {
        const fattura = withBoth([{ Importo: '-10.00', Percentuale: '20.00' }], totale);
        expect(amountProblems(fattura)).toEqual([
          expect.objectContaining({ code: 'sdi.00423.warn', expected: '110.00', actual: totale }),
        ]);
      },
    );

    test('with a negative Importo, a PrezzoTotale that fits no reading is the error', () => {
      const fattura = withBoth([{ Importo: '-10.00', Percentuale: '20.00' }], '100.00');
      expect(amountProblems(fattura)).toEqual([
        expect.objectContaining({ code: 'sdi.00423', expected: '110.00', actual: '100.00' }),
      ]);
    });
  });

  // FatturaElettronica.NET#394: a cascade of percentage discounts whose exact result is a cent
  // away from the PrezzoTotale rounded by the seller, accepted by the SdI.
  test('a cascade of discounts a cent away from the exact result passes', () => {
    const fattura = fpr12();
    const linea = firstLine(fattura);
    linea.Quantita = '3.00';
    linea.PrezzoUnitario = '33.33';
    linea.ScontoMaggiorazione = [
      { Tipo: 'SC', Percentuale: '10.00' },
      { Tipo: 'SC', Percentuale: '5.00' },
    ];
    // 33.33 × 0.90 × 0.95 × 3 = 85.49145: written as 85.48, off by 0.01145, is an error;
    // written as 85.50 it is off by 0.00855 and passes.
    linea.PrezzoTotale = '85.50';
    expect(amountProblems(fattura)).toEqual([
      expect.objectContaining({ code: 'warn.tolerance', expected: '85.49', actual: '85.50' }),
    ]);
    linea.PrezzoTotale = '85.48';
    expect(amountProblems(fattura)).toEqual([
      expect.objectContaining({ code: 'sdi.00423', expected: '85.49145', actual: '85.48' }),
    ]);
  });
});

// 00421: "IF ( Imposta != ( AliquotaIVA * ImponibileImporto ) ∕ 100 )", rounded to 2 decimals
// "per difetto, se la terza cifra decimale è inferiore a 5, per eccesso se la terza cifra decimale
// è uguale o maggiore di 5" (Elenco controlli SdI 2.0, p. 24,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
// Tolerance: scarto if the difference "è superiore a ±1 centesimo di euro" (Allegato A 1.9.1,
// p. 56, https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1).
describe('00421 Imposta', () => {
  const impostaPath = 'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo[0].Imposta';
  const withImposta = (imposta: string, imponibile = '100.00') => {
    const fattura = fpr12();
    const riepilogo = firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0];
    if (riepilogo === undefined) throw new Error('No DatiRiepilogo');
    riepilogo.ImponibileImporto = imponibile;
    riepilogo.Imposta = imposta;
    return fattura;
  };
  const impostaProblems = (fattura: ReturnType<typeof fpr12>) =>
    vatProblems(fattura).filter((problem) => problem.path === impostaPath);

  test('rounds half-up: 22% of 10.25 is 2.255, so 2.26', () => {
    expect(impostaProblems(withImposta('2.26', '10.25'))).toEqual([]);
  });

  test('a difference of exactly 0.01 passes, with a warn.tolerance', () => {
    expect(impostaProblems(withImposta('22.01'))).toEqual([
      {
        code: 'warn.tolerance',
        path: impostaPath,
        message: expect.stringContaining('00421'),
        severity: 'warning',
        source: 'Elenco controlli SdI 2.0, p. 24',
        expected: '22.00',
        actual: '22.01',
      },
    ]);
  });

  test('a difference above 0.01 is an error, with expected and actual', () => {
    expect(impostaProblems(withImposta('22.02'))).toEqual([
      {
        code: 'sdi.00421',
        sdiCode: '00421',
        path: impostaPath,
        message: expect.stringContaining('Imposta'),
        severity: 'error',
        source: 'Elenco controlli SdI 2.0, p. 24',
        expected: '22.00',
        actual: '22.02',
      },
    ]);
  });

  test('the computed tax is rounded before comparing: 2.255 → 2.26, so 2.24 is an error', () => {
    // Against the unrounded 2.255 the difference would be 0.015; against 2.26 it is 0.02.
    expect(impostaProblems(withImposta('2.24', '10.25'))).toEqual([
      expect.objectContaining({ code: 'sdi.00421', expected: '2.26', actual: '2.24' }),
    ]);
  });

  // The rule says nothing about negative amounts (credit notes). The library rounds them away from
  // zero, like the mature C# and Python libraries; the ±0.01 € tolerance accepts -2.25 too.
  test('a credit note rounds away from zero: 22% of -10.25 is -2.26', () => {
    expect(impostaProblems(withImposta('-2.26', '-10.25'))).toEqual([]);
  });
});

// 00422: "Per ogni valore distinto di AliquotaIVA", Σ ImponibileImporto of the DatiRiepilogo =
// Σ PrezzoTotale of the lines + Σ ImportoContributoCassa + Σ Arrotondamento of the DatiRiepilogo,
// where the rates are those of the lines and of DatiCassaPrevidenziale (Elenco controlli SdI 2.0,
// p. 25, https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
// Tolerance: scarto if the difference "è superiore a ±1 euro" (Allegato A 1.9.1, p. 56,
// https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1).
describe('00422 ImponibileImporto', () => {
  const imponibilePath =
    'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo[0].ImponibileImporto';
  const imponibileProblems = (fattura: ReturnType<typeof fpr12>) =>
    vatProblems(fattura).filter((problem) => problem.path.endsWith('ImponibileImporto'));
  /** fpr12 with the given ImponibileImporto and an Imposta that agrees with it. */
  const withImponibile = (imponibile: string, imposta: string) => {
    const fattura = fpr12();
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: imponibile, Imposta: imposta },
    ];
    return fattura;
  };

  test('a difference of exactly 1.00 passes, with a warn.tolerance', () => {
    expect(imponibileProblems(withImponibile('101.00', '22.22'))).toEqual([
      {
        code: 'warn.tolerance',
        path: imponibilePath,
        message: expect.stringContaining('00422'),
        severity: 'warning',
        source: 'Elenco controlli SdI 2.0, p. 25',
        expected: '100.00',
        actual: '101.00',
      },
    ]);
  });

  test('a difference above 1.00 is an error, with expected and actual', () => {
    expect(imponibileProblems(withImponibile('101.01', '22.22'))).toEqual([
      {
        code: 'sdi.00422',
        sdiCode: '00422',
        path: imponibilePath,
        message: expect.stringContaining('ImponibileImporto'),
        severity: 'error',
        source: 'Elenco controlli SdI 2.0, p. 25',
        expected: '100.00',
        actual: '101.01',
      },
    ]);
  });

  // ImponibileImporto has 2 decimals (Amount2DecimalType) and PrezzoTotale up to 8
  // (Amount8DecimalType, Schema_VFPR12_v1.2.3.xsd): the sum rounded to the cent is how a seller
  // writes it, and gets no warn.tolerance; the error stays on the exact sum.
  test('the sum of lines of many decimals, rounded to the cent, is no problem', () => {
    const fattura = fpr12();
    const linea = firstLine(fattura);
    linea.Quantita = '3.00';
    linea.PrezzoUnitario = '1.23456789';
    linea.PrezzoTotale = '3.70370367';
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: '3.70', Imposta: '0.81' },
    ];
    expect(imponibileProblems(fattura)).toEqual([]);
    const riepilogo = firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0];
    if (riepilogo === undefined) throw new Error('No DatiRiepilogo');
    riepilogo.ImponibileImporto = '3.71';
    expect(imponibileProblems(fattura)).toEqual([
      expect.objectContaining({ code: 'warn.tolerance', expected: '3.70', actual: '3.71' }),
    ]);
  });

  test('sums every line, cassa and Arrotondamento with the rate', () => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiBeniServizi.DettaglioLinee.push({
      NumeroLinea: '2',
      Descrizione: 'Trasferta',
      PrezzoUnitario: '0.333',
      PrezzoTotale: '0.333',
      AliquotaIVA: '22.00',
    });
    body.DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [
      {
        TipoCassa: 'TC22',
        AlCassa: '4.00',
        ImportoContributoCassa: '4.00',
        ImponibileCassa: '100.00',
        AliquotaIVA: '22.00',
      },
    ];
    // 100.00 + 0.333 + 4.00 - 0.003 = 104.33
    body.DatiBeniServizi.DatiRiepilogo = [
      {
        AliquotaIVA: '22.00',
        Arrotondamento: '-0.003',
        ImponibileImporto: '104.33',
        Imposta: '22.95',
      },
    ];
    expect(vatProblems(fattura)).toEqual([]);
  });

  test('sums the DatiRiepilogo with the same rate, whatever their EsigibilitaIVA', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: '60.00', Imposta: '13.20', EsigibilitaIVA: 'I' },
      { AliquotaIVA: '22.00', ImponibileImporto: '40.00', Imposta: '8.80', EsigibilitaIVA: 'S' },
    ];
    expect(vatProblems(fattura)).toEqual([]);
  });

  test('groups by rate: a line at 10% does not count for the 22%', () => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiBeniServizi.DettaglioLinee.push({
      NumeroLinea: '2',
      Descrizione: 'Libro',
      PrezzoUnitario: '10.00',
      PrezzoTotale: '10.00',
      AliquotaIVA: '10.00',
    });
    body.DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00' },
      { AliquotaIVA: '10.00', ImponibileImporto: '12.00', Imposta: '1.20' },
    ];
    expect(imponibileProblems(fattura)).toEqual([
      expect.objectContaining({
        code: 'sdi.00422',
        path: 'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo[1].ImponibileImporto',
        expected: '10.00',
        actual: '12.00',
      }),
    ]);
  });

  // The official examples have lines of 5.00 and 20.00 at 22% and ImponibileImporto 27.00: off by
  // 2 €, above the tolerance (https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fatturapa/).
  test.each([
    ['IT01234567890_FPR02', 'FatturaElettronicaBody[0]'],
    ['IT01234567890_FPR03', 'FatturaElettronicaBody[0]'],
  ])('%s gives 00422 in %s', (name, body) => {
    const problems = validate(official(name)).problems.filter((p) => p.code === 'sdi.00422');
    expect(problems).toEqual([
      expect.objectContaining({
        path: `${body}.DatiBeniServizi.DatiRiepilogo[0].ImponibileImporto`,
        expected: '25.00',
        actual: '27.00',
      }),
    ]);
  });
});

describe('the checks on amounts read what validate accepts', () => {
  test('a single DettaglioLinee and DatiRiepilogo instead of arrays are still read', () => {
    const fattura = fpr12();
    const servizi = firstBody(fattura).DatiBeniServizi as unknown as Record<string, unknown>;
    servizi.DettaglioLinee = { ...firstLine(fattura), PrezzoTotale: '99.00' };
    servizi.DatiRiepilogo = { AliquotaIVA: '22.00', ImponibileImporto: '99.00', Imposta: '21.78' };
    expect(vatProblems(fattura)).toEqual([
      expect.objectContaining({ code: 'input.type', path: `${SERVIZI}.DettaglioLinee` }),
      expect.objectContaining({ code: 'sdi.00423', expected: '100.00', actual: '99.00' }),
      expect.objectContaining({ code: 'input.type', path: `${SERVIZI}.DatiRiepilogo` }),
    ]);
  });

  test('amounts with spaces around them, which xs:decimal allows', () => {
    const fattura = fpr12();
    firstLine(fattura).PrezzoTotale = ' 100.00\n';
    expect(vatProblems(fattura)).toEqual([]);
  });

  test('a line missing its amounts is a problem of structure only', () => {
    const fattura = fpr12();
    const linea = firstLine(fattura) as unknown as Record<string, unknown>;
    delete linea.PrezzoUnitario;
    delete linea.PrezzoTotale;
    expect(vatProblems(fattura).map((problem) => problem.code)).toEqual([
      'xsd.required',
      'xsd.required',
    ]);
  });
});
