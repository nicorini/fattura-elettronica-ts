import { describe, expect, test } from 'vitest';
import type { DatiCassaPrevidenziale, DatiRiepilogo, FatturaElettronica } from '../src/index.js';
import { firstBody, firstLine, fpa12, fpr12 } from './helpers/invoices.js';
import { error, found, vatProblems, warning } from './helpers/vat.js';

const LINEA = 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0]';
const CASSA =
  'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale[0]';
const RIEPILOGO = 'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo';

/** fpr12 with its only line at `aliquota` and `natura`, and a DatiRiepilogo that matches. */
function withLine(aliquota: string, natura?: DatiRiepilogo['Natura']): FatturaElettronica {
  const fattura = fpr12();
  const linea = firstLine(fattura);
  linea.AliquotaIVA = aliquota;
  if (natura !== undefined) linea.Natura = natura;
  firstBody(fattura).DatiBeniServizi.DatiRiepilogo = [riepilogo(aliquota, natura)];
  return fattura;
}

/** A DatiRiepilogo of 100.00 at `aliquota`, with its Imposta and, with a Natura, its law. */
function riepilogo(aliquota: string, natura?: DatiRiepilogo['Natura']): DatiRiepilogo {
  const imposta = ((100 * Number(aliquota)) / 100).toFixed(2);
  return {
    AliquotaIVA: aliquota,
    ...(natura === undefined ? {} : { Natura: natura }),
    ImponibileImporto: '100.00',
    Imposta: imposta,
    ...(natura === undefined ? {} : { RiferimentoNormativo: 'Art. 10 DPR 633/72' }),
  };
}

/** A DatiCassaPrevidenziale of 4.00 at `aliquota`. */
function cassa(aliquota: string, natura?: DatiRiepilogo['Natura']): DatiCassaPrevidenziale {
  return {
    TipoCassa: 'TC22',
    AlCassa: '4.00',
    ImportoContributoCassa: '4.00',
    AliquotaIVA: aliquota,
    ...(natura === undefined ? {} : { Natura: natura }),
  };
}

// 00424: "IF ( AliquotaIVALinea != 0.00 && AliquotaIVALinea < 1.00 )", the same for the cassa and
// the DatiRiepilogo (Elenco controlli SdI 2.0, p. 31,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
describe('00424 rate not as a percentage', () => {
  test('0.00 and 1.00 are rates', () => {
    expect(found(withLine('1.00'))).toEqual([]);
    expect(found(withLine('0.00', 'N2.1'))).toEqual([]);
  });

  test('0.22 on line, cassa and DatiRiepilogo is an error on each', () => {
    const fattura = withLine('0.22');
    const body = firstBody(fattura);
    body.DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [cassa('0.22')];
    body.DatiBeniServizi.DatiRiepilogo = [
      { ...riepilogo('0.22'), ImponibileImporto: '104.00', Imposta: '0.23' },
    ];
    expect(found(fattura)).toEqual([
      error('00424', `${CASSA}.AliquotaIVA`, 31),
      error('00424', `${LINEA}.AliquotaIVA`, 31),
      error('00424', `${RIEPILOGO}[0].AliquotaIVA`, 31),
    ]);
  });
});

// 00400 and 00401: "IF (AliquotaIVA == 0.00) IF (non esiste Natura) ERRORE (00400) ELSE IF
// (esiste Natura) ERRORE (00401)" (Elenco controlli SdI 2.0, p. 10). The Allegato A 1.9.1 makes an
// exception: "Nel caso in cui, invece, l'elemento TipoDocumento assume il valore TD16, è possibile
// indicare sia la natura delle operazioni, sia un valore diverso da zero per l'elemento
// AliquotaIVA" (p. 52, https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1).
describe('00400 and 00401 Natura of a line', () => {
  test('a line at 0% without Natura is 00400', () => {
    const fattura = withLine('0.00', 'N2.1');
    delete firstLine(fattura).Natura;
    expect(found(fattura)).toEqual([
      error('00400', `${LINEA}.Natura`, 10),
      // The Natura N2.1 of the summary is no longer on any line.
      warning('00444', `${RIEPILOGO}[0].Natura`, 7),
    ]);
  });

  test('a line at 22% with Natura is 00401', () => {
    const fattura = fpr12();
    firstLine(fattura).Natura = 'N2.1';
    expect(found(fattura)).toContainEqual(error('00401', `${LINEA}.Natura`, 10));
  });

  test('TD16 may have a Natura with a rate: no 00401 nor 00430', () => {
    const fattura = withLine('22.00', 'N6.3');
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.TipoDocumento = 'TD16';
    const summary = firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0];
    if (summary !== undefined) summary.Imposta = '22.00';
    expect(found(fattura)).toEqual([]);
  });
});

// 00413 and 00414: the same as 00400 and 00401 for DatiCassaPrevidenziale (Elenco controlli SdI
// 2.0, p. 18). The Allegato A 1.9.1 has no TD16 exception for them (pp. 43, 115).
describe('00413 and 00414 Natura of the cassa', () => {
  const withCassa = (block: DatiCassaPrevidenziale, tipo: 'TD01' | 'TD16' = 'TD01') => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiGenerali.DatiGeneraliDocumento.TipoDocumento = tipo;
    body.DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [block];
    body.DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00' },
      { ...riepilogo('0.00', 'N1'), ImponibileImporto: '4.00' },
    ];
    return fattura;
  };

  test('a cassa at 0% with Natura is right', () => {
    expect(found(withCassa(cassa('0.00', 'N1')))).toEqual([]);
  });

  test('a cassa at 0% without Natura is 00413', () => {
    expect(found(withCassa(cassa('0.00')))).toContainEqual(error('00413', `${CASSA}.Natura`, 18));
  });

  test('a cassa at 22% with Natura is 00414, even in a TD16', () => {
    const fattura = withCassa({ ...cassa('22.00', 'N1'), ImportoContributoCassa: '0.00' }, 'TD16');
    expect(found(fattura)).toContainEqual(error('00414', `${CASSA}.Natura`, 18));
  });
});

// 00429 and 00430: the same as 00400 and 00401 for DatiRiepilogo (Elenco controlli SdI 2.0,
// p. 35), with the TD16 exception for 00430 of the Allegato A 1.9.1 ("ad eccezione del caso in cui
// l'elemento TipoDocumento assume valore TD16", p. 56).
describe('00429 and 00430 Natura of a DatiRiepilogo', () => {
  test('a DatiRiepilogo at 0% without Natura is 00429', () => {
    const fattura = withLine('0.00', 'N2.1');
    const summary = firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0];
    if (summary !== undefined) delete summary.Natura;
    expect(found(fattura)).toContainEqual(error('00429', `${RIEPILOGO}[0].Natura`, 35));
  });

  test('a DatiRiepilogo at 22% with Natura is 00430', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo = [
      { ...riepilogo('22.00', 'N2.1'), Imposta: '22.00' },
    ];
    expect(found(fattura)).toContainEqual(error('00430', `${RIEPILOGO}[0].Natura`, 35));
  });
});

// 00419: "IF ( TotRiepiloghi < TotAliquoteIVA ) ERRORE (00419)", where TotAliquoteIVA counts the
// distinct rates of DatiCassaPrevidenziale and DettaglioLinee (Elenco controlli SdI 2.0, p. 22).
// 00443: "Per ogni BloccoDettaglioLinee IF ( AliquotaIVALinea != da tutte le AliquotaIVARiepilogo )
// ERRORE (00443)", the same for the cassa (p. 37).
describe('00419 and 00443 a DatiRiepilogo for each rate', () => {
  const twoRates = () => {
    const fattura = fpr12();
    firstBody(fattura).DatiBeniServizi.DettaglioLinee.push({
      NumeroLinea: '2',
      Descrizione: 'Libro',
      PrezzoUnitario: '100.00',
      PrezzoTotale: '100.00',
      AliquotaIVA: '10.00',
    });
    return fattura;
  };

  test('two rates with one DatiRiepilogo each are right', () => {
    const fattura = twoRates();
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo.push(riepilogo('10.00'));
    expect(found(fattura)).toEqual([]);
  });

  // 00422 (p. 25) takes every rate of lines and cassa: with no DatiRiepilogo at that rate, the
  // sum of ImponibileImporto is zero, so the lines at that rate give 00422 too.
  test('two rates and one DatiRiepilogo: 00419 and 00422 on the summaries, 00443 on the line', () => {
    expect(found(twoRates())).toEqual([
      error('00443', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].AliquotaIVA', 37),
      error('00419', RIEPILOGO, 22),
      error('00422', RIEPILOGO, 25),
    ]);
  });

  test('two DatiRiepilogo, but not for the rate of the line: 00443 and 00422', () => {
    const fattura = twoRates();
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo.push(riepilogo('4.00'));
    expect(found(fattura)).toEqual([
      error('00443', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].AliquotaIVA', 37),
      error('00422', RIEPILOGO, 25),
      warning('00443', `${RIEPILOGO}[1].AliquotaIVA`, 7),
    ]);
  });

  test('a cassa at a rate with no DatiRiepilogo is 00443', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [
      cassa('0.00', 'N1'),
    ];
    expect(found(fattura)).toEqual([
      error('00443', `${CASSA}.AliquotaIVA`, 37),
      error('00444', `${CASSA}.Natura`, 38),
      error('00419', RIEPILOGO, 22),
      error('00422', RIEPILOGO, 25),
    ]);
  });

  test('a rate with no DatiRiepilogo and lines within the tolerance of 00422 is not 00422', () => {
    const fattura = twoRates();
    Object.assign(firstBody(fattura).DatiBeniServizi.DettaglioLinee[1] ?? {}, {
      PrezzoUnitario: '1.00',
      PrezzoTotale: '1.00',
    });
    expect(found(fattura)).toEqual([
      error('00443', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].AliquotaIVA', 37),
      error('00419', RIEPILOGO, 22),
      expect.objectContaining({ code: 'warn.tolerance', path: RIEPILOGO }),
    ]);
  });
});

// 00443 and 00444 the other way round: the Rappresentazione tabellare del tracciato fattura
// ordinaria, p. 7, on 2.2.2.1 <AliquotaIVA> of DatiRiepilogo: "Viene controllato che il valore
// espresso in questo elemento sia anche presente nell'elemento 2.2.1.12 <AliquotaIVA> di uno dei
// blocchi 2.2.1 <DettaglioLinee> presenti in fattura o nell'elemento 2.1.1.7.5 <AliquotaIVA> di
// uno dei blocchi 2.1.1.7 <DatiCassaPrevidenziale>" (00443), and the same on 2.2.2.2 <Natura>
// (00444):
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/RappresentazioneTabellareFattOrdinaria-1.pdf
// The Elenco controlli (pp. 37-38) and the Allegato A (p. 118) check only lines and cassa against
// the summaries, and 00422 (p. 25) visits only the rates of lines and cassa: a warning, no 00422.
describe('00443 and 00444 the other way round: a DatiRiepilogo without lines nor cassa', () => {
  test('a DatiRiepilogo at a rate that no line nor cassa has is a warning', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo.push(riepilogo('10.00'));
    expect(found(fattura)).toEqual([warning('00443', `${RIEPILOGO}[1].AliquotaIVA`, 7)]);
  });

  test('a DatiRiepilogo with a Natura that no line nor cassa has is a warning', () => {
    const fattura = withLine('0.00', 'N2.1');
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo.push({
      ...riepilogo('0.00', 'N4'),
      ImponibileImporto: '0.00',
    });
    expect(found(fattura)).toEqual([warning('00444', `${RIEPILOGO}[1].Natura`, 7)]);
  });

  test('a summary of the cassa alone is right', () => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [cassa('10.00')];
    body.DatiBeniServizi.DatiRiepilogo.push({
      ...riepilogo('10.00'),
      ImponibileImporto: '4.00',
      Imposta: '0.40',
    });
    expect(found(fattura)).toEqual([]);
  });
});

// 00444: every Natura of lines and cassa must be in a DatiRiepilogo (Elenco controlli SdI 2.0,
// p. 38). For the lines the pseudocode prints "ERRORE (00443)"; the title of the page and the
// Allegato A 1.9.1 (p. 118: "tutti i valori di natura dell'operazione presenti nelle linee di
// dettaglio [...] devono essere presenti anche nei dati di riepilogo") give 00444.
describe('00444 a DatiRiepilogo for each Natura', () => {
  test('two lines at 0% with different Natura need both in the summaries', () => {
    const fattura = withLine('0.00', 'N2.1');
    const body = firstBody(fattura);
    body.DatiBeniServizi.DettaglioLinee.push({
      ...firstLine(fattura),
      NumeroLinea: '2',
      Natura: 'N4',
    });
    body.DatiBeniServizi.DatiRiepilogo[0] = {
      ...riepilogo('0.00', 'N2.1'),
      ImponibileImporto: '200.00',
    };
    expect(found(fattura)).toEqual([
      error('00444', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].Natura', 38),
    ]);
    body.DatiBeniServizi.DatiRiepilogo = [riepilogo('0.00', 'N2.1'), riepilogo('0.00', 'N4')];
    expect(found(fattura)).toEqual([]);
  });

  // python-a38#27 and #33, FatturaElettronica.NET#292 and #296: the stamp duty charged back on a
  // line at 0% with its Natura (here N1, excluded by art. 15 DPR 633/72) needs its own summary.
  test('the stamp duty on a line at 0% with Natura N1 has its own summary', () => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiGenerali.DatiGeneraliDocumento.DatiBollo = {
      BolloVirtuale: 'SI',
      ImportoBollo: '2.00',
    };
    body.DatiBeniServizi.DettaglioLinee.push({
      NumeroLinea: '2',
      Descrizione: 'Imposta di bollo',
      PrezzoUnitario: '2.00',
      PrezzoTotale: '2.00',
      AliquotaIVA: '0.00',
      Natura: 'N1',
    });
    expect(found(fattura)).toEqual([
      error('00443', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].AliquotaIVA', 37),
      error('00444', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].Natura', 38),
      error('00419', RIEPILOGO, 22),
      error('00422', RIEPILOGO, 25),
    ]);
    body.DatiBeniServizi.DatiRiepilogo.push({
      ...riepilogo('0.00', 'N1'),
      ImponibileImporto: '2.00',
      RiferimentoNormativo: 'Escluso art. 15 DPR 633/72',
    });
    expect(found(fattura)).toEqual([]);
  });
});

// 00445: "non è più ammesso il valore generico N2, N3 o N6 come codice natura dell'operazione",
// on lines, cassa and summaries, from 1 January 2021 (Elenco controlli SdI 2.0, p. 39). The XSD
// still lists them.
describe('00445 generic Natura', () => {
  test.each(['N2.1', 'N2.2', 'N3.5', 'N6.3', 'N6.9', 'N7'] as const)('%s is allowed', (natura) => {
    expect(found(withLine('0.00', natura))).toEqual([]);
  });

  test.each(['N2', 'N3', 'N6'] as const)('%s is 00445 on line and summary', (natura) => {
    expect(found(withLine('0.00', natura))).toEqual([
      error('00445', `${LINEA}.Natura`, 39),
      error('00445', `${RIEPILOGO}[0].Natura`, 39),
    ]);
  });

  test('on the cassa too', () => {
    const fattura = withLine('0.00', 'N2.1');
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale = [
      cassa('0.00', 'N2'),
    ];
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo.push({
      ...riepilogo('0.00', 'N2.2'),
      ImponibileImporto: '0.00',
    });
    expect(found(fattura)).toContainEqual(error('00445', `${CASSA}.Natura`, 39));
  });
});

// 00420: a DatiRiepilogo with EsigibilitaIVA "S" and Natura N6 or N6.1-N6.9 (Elenco controlli SdI
// 2.0, p. 23): split payment and reverse charge don't go together.
describe('00420 reverse charge with split payment', () => {
  test('N6.3 with EsigibilitaIVA I is right, with S is 00420', () => {
    const fattura = withLine('0.00', 'N6.3');
    const summary = firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0];
    if (summary === undefined) throw new Error('No DatiRiepilogo');
    summary.EsigibilitaIVA = 'I';
    expect(found(fattura)).toEqual([]);
    summary.EsigibilitaIVA = 'S';
    expect(found(fattura)).toEqual([error('00420', `${RIEPILOGO}[0].EsigibilitaIVA`, 23)]);
  });

  test('split payment with another Natura is right, in an FPA12 too', () => {
    const fattura = fpa12();
    const linea = firstLine(fattura);
    linea.AliquotaIVA = '0.00';
    linea.Natura = 'N4';
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo = [
      { ...riepilogo('0.00', 'N4'), EsigibilitaIVA: 'S' },
    ];
    expect(found(fattura)).toEqual([]);
  });
});

// The Specifiche tecniche del formato FatturaPA 1.4, p. 27: RiferimentoNormativo, "normativa di
// riferimento (obbligatorio nei casi di operazioni di cui all'elemento Natura)"
// (https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fatturapa/).
// No check of the SdI has it: a warning.
describe('warn.riferimentoNormativo', () => {
  test('a DatiRiepilogo with Natura and no RiferimentoNormativo is a warning', () => {
    const fattura = withLine('0.00', 'N2.1');
    const summary = firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0];
    if (summary !== undefined) delete summary.RiferimentoNormativo;
    expect(vatProblems(fattura)).toEqual([
      {
        code: 'warn.riferimentoNormativo',
        path: `${RIEPILOGO}[0].RiferimentoNormativo`,
        message: expect.stringContaining('RiferimentoNormativo'),
        severity: 'warning',
        source: 'Specifiche tecniche del formato FatturaPA 1.4, p. 27',
      },
    ]);
  });
});
