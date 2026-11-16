// The warning on the stamp duty (imposta di bollo, 2 €): an invoice whose operations without VAT
// sum to more than 77,47 € and that lacks BolloVirtuale=SI.
//
// The warning follows the criterion with which the Agenzia finds the invoices that lack the stamp
// and adds it itself, not the law: lines with Natura N1 or N3.4 may owe the stamp by law, but the
// criterion ignores them, and so does the warning.
//
// Sources (pages are the printed ones):
// - Specifiche tecniche del bollo 1.3: Allegato A al provvedimento del Direttore dell'Agenzia delle
//   Entrate del 4/2/2021 n. 34958, versione 1.3 (29/3/2023),
//   https://www.agenziaentrate.gov.it/portale/documents/20143/3226207/Specifiche+tecniche_v1.3.pdf/107243a0-7760-4a49-10b9-ec8e6d69e24e
// - Guida AdE "L'imposta di bollo sulle fatture elettroniche" (giugno 2026),
//   https://www.agenziaentrate.gov.it/portale/documents/d/guest/l-imposta_di_bollo_sulle_fatture_elettronichegiugno2026
import { describe, expect, test } from 'vitest';
import {
  type DatiRiepilogo,
  type DettaglioLinee,
  type FatturaElettronica,
  type FatturaElettronicaBody,
  validate,
} from '../src/index.js';
import { firstBody, fpr12 } from './helpers/invoices.js';

type Natura = NonNullable<DettaglioLinee['Natura']>;

interface Line {
  readonly prezzo: string;
  /** Without a Natura the line is at 22%. */
  readonly natura?: Natura;
  /** `AltriDatiGestionali/TipoDato` of the line. */
  readonly tipoDato?: string;
}

const DOCUMENTO = 'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento';
const SOURCE = 'Specifiche tecniche del bollo 1.3, p. 4';

/** A body with `lines` (quantity 1), its summaries and its total, valid for the SdI. */
function bodyWith(lines: readonly Line[]): FatturaElettronicaBody {
  const body = structuredClone(firstBody(fpr12()));
  const cents = (value: string) => Math.round(Number(value) * 100);
  const euro = (value: number) => (value / 100).toFixed(2);
  body.DatiBeniServizi.DettaglioLinee = lines.map(({ prezzo, natura, tipoDato }, index) => ({
    NumeroLinea: String(index + 1),
    Descrizione: 'Servizio',
    PrezzoUnitario: prezzo,
    PrezzoTotale: prezzo,
    AliquotaIVA: natura === undefined ? '22.00' : '0.00',
    ...(natura === undefined ? {} : { Natura: natura }),
    ...(tipoDato === undefined ? {} : { AltriDatiGestionali: [{ TipoDato: tipoDato }] }),
  }));
  const groups = new Map<Natura | undefined, number>();
  for (const { prezzo, natura } of lines) {
    groups.set(natura, (groups.get(natura) ?? 0) + cents(prezzo));
  }
  let total = 0;
  body.DatiBeniServizi.DatiRiepilogo = [...groups].map(([natura, imponibile]): DatiRiepilogo => {
    const imposta = natura === undefined ? Math.round(imponibile * 0.22) : 0;
    total += imponibile + imposta;
    return natura === undefined
      ? {
          AliquotaIVA: '22.00',
          ImponibileImporto: euro(imponibile),
          Imposta: euro(imposta),
          EsigibilitaIVA: 'I',
        }
      : {
          AliquotaIVA: '0.00',
          Natura: natura,
          ImponibileImporto: euro(imponibile),
          Imposta: '0.00',
          RiferimentoNormativo: 'Art. 10 DPR 633/72',
        };
  });
  body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = euro(total);
  return body;
}

/** An FPR12 invoice with one body made of `lines`. */
function invoiceWith(lines: readonly Line[]): FatturaElettronica {
  const fattura = fpr12();
  fattura.FatturaElettronicaBody = [bodyWith(lines)];
  return fattura;
}

/** The invoice with `BolloVirtuale=SI` on its first body. */
function withBollo(fattura: FatturaElettronica): FatturaElettronica {
  firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiBollo = {
    BolloVirtuale: 'SI',
    ImportoBollo: '2.00',
  };
  return fattura;
}

/** The paths of the `warn.bollo` of `fattura`. */
function bolloWarnings(fattura: FatturaElettronica): string[] {
  return validate(fattura)
    .problems.filter(({ code }) => code === 'warn.bollo')
    .map(({ path }) => path);
}

const WARNING = `${DOCUMENTO}.DatiBollo.BolloVirtuale`;

// Specifiche tecniche del bollo 1.3, §3, p. 4: the Agenzia selects the invoices "dove sono
// presenti (anche o esclusivamente) operazioni [...] per le quali sono soddisfatte le seguenti
// condizioni: a) la sommatoria degli importi (somma calcolata considerando il valore riportato nel
// tag 2.2.1.11 <PrezzoTotale> [...]) risulta maggiore di 77,47 euro; b) è stata indicata la
// "natura" [...]" N2.1, N2.2, N3.5, N3.6 or N4, "c) non è stata indicata nessuna codifica per il
// non assoggettamento" (§4: TipoDato NB1, NB2, NB3), and "la presenza in fattura di operazioni
// assoggettate a IVA non esclude che, per la presenza di altre operazioni, sia dovuta l'imposta
// di bollo". The guida AdE (giugno 2026), p. 6, lists the same natures.
describe('warn.bollo', () => {
  test('an N2.2 line of 77.48 without BolloVirtuale is a warning, and the only problem', () => {
    expect(validate(invoiceWith([{ prezzo: '77.48', natura: 'N2.2' }])).problems).toEqual([
      {
        code: 'warn.bollo',
        path: WARNING,
        message: expect.stringContaining('77.48'),
        severity: 'warning',
        source: SOURCE,
      },
    ]);
  });

  test('exactly 77.47 is not a warning', () => {
    expect(bolloWarnings(invoiceWith([{ prezzo: '77.47', natura: 'N2.2' }]))).toEqual([]);
  });

  test('with BolloVirtuale=SI there is no warning', () => {
    const fattura = withBollo(invoiceWith([{ prezzo: '100.00', natura: 'N2.2' }]));
    expect(validate(fattura).problems).toEqual([]);
  });

  test.each(['N2.1', 'N2.2', 'N3.5', 'N3.6', 'N4'] as const)('a line %s counts', (natura) => {
    expect(bolloWarnings(invoiceWith([{ prezzo: '100.00', natura }]))).toEqual([WARNING]);
  });

  // N1, N3.1, N3.2 and N3.4 are not among the natures of the criterion quoted above (Specifiche
  // tecniche del bollo 1.3, §3, p. 4): the warning leaves them out on purpose, as the Agenzia
  // does, whatever the stamp each one owes by law.
  test.each(['N1', 'N3.1', 'N3.2', 'N3.4'] as const)('a line %s does not count', (natura) => {
    expect(bolloWarnings(invoiceWith([{ prezzo: '100.00', natura }]))).toEqual([]);
  });

  test('lines at 22% do not count, lines of different natures add up', () => {
    expect(
      bolloWarnings(invoiceWith([{ prezzo: '1000.00' }, { prezzo: '50.00', natura: 'N4' }])),
    ).toEqual([]);
    expect(
      bolloWarnings(
        invoiceWith([
          { prezzo: '1000.00' },
          { prezzo: '40.00', natura: 'N2.1' },
          { prezzo: '40.00', natura: 'N4' },
        ]),
      ),
    ).toEqual([WARNING]);
  });

  test('a negative line lowers the sum', () => {
    expect(
      bolloWarnings(
        invoiceWith([
          { prezzo: '100.00', natura: 'N4' },
          { prezzo: '-30.00', natura: 'N4' },
        ]),
      ),
    ).toEqual([]);
  });

  // Specifiche tecniche del bollo 1.3, §4, pp. 5-6: TipoDato "NB1", "NB2" or "NB3" marks "la
  // singola operazione" that, "seppur formalmente rientrante nel campo applicativo dell'imposta di
  // bollo", is not subject to it: the line leaves the sum.
  test.each(['NB1', 'NB2', 'NB3'])('a line with TipoDato %s does not count', (tipoDato) => {
    expect(bolloWarnings(invoiceWith([{ prezzo: '100.00', natura: 'N4', tipoDato }]))).toEqual([]);
    expect(
      bolloWarnings(
        invoiceWith([
          { prezzo: '100.00', natura: 'N4', tipoDato },
          { prezzo: '80.00', natura: 'N4' },
        ]),
      ),
    ).toEqual([WARNING]);
  });

  test('another TipoDato does not take the line out', () => {
    expect(
      bolloWarnings(invoiceWith([{ prezzo: '100.00', natura: 'N4', tipoDato: 'NB4' }])),
    ).toEqual([WARNING]);
  });

  // Specifiche tecniche del bollo 1.3, §3, pp. 4-5, and guida AdE (giugno 2026), pp. 6-7: the
  // criterion leaves out the TipoDocumento TD16, TD17, TD18, TD19 and TD28, the RegimeFiscale
  // RF05 to RF11, and the invoices with CodiceDestinatario "XXXXXXX".
  test.each(['TD16', 'TD17', 'TD18', 'TD19', 'TD28'] as const)(
    'TipoDocumento %s is never a warning',
    (tipo) => {
      const fattura = invoiceWith([{ prezzo: '100.00', natura: 'N4' }]);
      firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.TipoDocumento = tipo;
      expect(bolloWarnings(fattura)).toEqual([]);
    },
  );

  test.each(['RF05', 'RF08', 'RF11'] as const)('RegimeFiscale %s is never a warning', (regime) => {
    const fattura = invoiceWith([{ prezzo: '100.00', natura: 'N4' }]);
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.RegimeFiscale = regime;
    expect(bolloWarnings(fattura)).toEqual([]);
  });

  test.each(['RF04', 'RF12', 'RF19'] as const)('RegimeFiscale %s is a warning', (regime) => {
    const fattura = invoiceWith([{ prezzo: '100.00', natura: 'N2.2' }]);
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.RegimeFiscale = regime;
    expect(bolloWarnings(fattura)).toEqual([WARNING]);
  });

  test('CodiceDestinatario XXXXXXX is never a warning', () => {
    const fattura = invoiceWith([{ prezzo: '100.00', natura: 'N3.6' }]);
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'XXXXXXX';
    expect(bolloWarnings(fattura)).toEqual([]);
  });

  test('each body of a lotto is judged on its own', () => {
    const fattura = withBollo(invoiceWith([{ prezzo: '100.00', natura: 'N4' }]));
    fattura.FatturaElettronicaBody.push(
      bodyWith([{ prezzo: '100.00', natura: 'N4' }]),
      bodyWith([{ prezzo: '50.00', natura: 'N4' }]),
      bodyWith([{ prezzo: '50.00', natura: 'N4' }]),
    );
    expect(bolloWarnings(fattura)).toEqual([
      'FatturaElettronicaBody[1].DatiGenerali.DatiGeneraliDocumento.DatiBollo.BolloVirtuale',
    ]);
  });
});
