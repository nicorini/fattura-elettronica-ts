// Cases that users of other FatturaPA libraries met with real files, each with the behavior this
// library has: read, reported with a code, or refused. Where a case is already the subject of
// another test, it is linked by name instead of tested twice.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { build, type FatturaElettronica, type Problem, parse, validate } from '../src/index.js';
import { firstBody, firstLine, fpr12 } from './helpers/invoices.js';
import { libxml2Verdict } from './helpers/oracle.js';

const LINEA = 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0]';
const PAGAMENTO = 'FatturaElettronicaBody[0].DatiPagamento[0].DettaglioPagamento[0]';

/** The invoice is valid, and build then parse gives it back unchanged. */
function expectReadAndWritten(fattura: FatturaElettronica): string {
  expect(validate(fattura)).toEqual({ valid: true, problems: [] });
  const xml = build(fattura);
  expect(libxml2Verdict(xml)).toEqual({ valid: true, errors: [] });
  expect(parse(xml)).toEqual(fattura);
  return xml;
}

/** The errors of `fattura`, as code and path. */
const errors = (input: FatturaElettronica | string): Pick<Problem, 'code' | 'path'>[] =>
  validate(input)
    .problems.filter((problem) => problem.severity === 'error')
    .map(({ code, path }) => ({ code, path }));

/** Sets the line to `quantita` × `prezzo` = `totale`, and the summary and total to match. */
function setLine(
  fattura: FatturaElettronica,
  line: { Quantita?: string; PrezzoUnitario: string; PrezzoTotale: string },
  riepilogo: { ImponibileImporto: string; Imposta: string; totale: string },
): void {
  const linea = firstLine(fattura);
  delete linea.Quantita;
  Object.assign(linea, line);
  const body = firstBody(fattura);
  Object.assign(body.DatiBeniServizi.DatiRiepilogo[0] ?? {}, {
    ImponibileImporto: riepilogo.ImponibileImporto,
    Imposta: riepilogo.Imposta,
  });
  body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = riepilogo.totale;
}

describe('values other libraries rounded or lost', () => {
  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/61
  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/226
  test('keeps Quantita, PrezzoUnitario and PrezzoTotale with 8 decimals as written', () => {
    const fattura = fpr12();
    // 3.12345678 × 1.12345678 = 3.5090686965…: PrezzoTotale and ImponibileImporto are rounded, and
    // within the tolerance of the SdI. ImponibileImporto is PrezzoTotale rounded to the cent, so
    // only PrezzoTotale, rounded to 8 decimals, gets the warning.
    setLine(
      fattura,
      { Quantita: '3.12345678', PrezzoUnitario: '1.12345678', PrezzoTotale: '3.50906870' },
      { ImponibileImporto: '3.51', Imposta: '0.77', totale: '4.28' },
    );
    const result = validate(fattura);
    expect(result.valid).toBe(true);
    expect(result.problems.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: 'warn.tolerance', path: `${LINEA}.PrezzoTotale` },
    ]);
    const xml = build(fattura);
    expect(libxml2Verdict(xml)).toEqual({ valid: true, errors: [] });
    expect(parse(xml)).toEqual(fattura);
  });

  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/96
  test('leaves out a missing Quantita instead of writing it as 0', () => {
    const fattura = fpr12();
    setLine(
      fattura,
      { PrezzoUnitario: '50.00', PrezzoTotale: '50.00' },
      { ImponibileImporto: '50.00', Imposta: '11.00', totale: '61.00' },
    );
    const xml = expectReadAndWritten(fattura);
    expect(xml).not.toContain('<Quantita>');
    expect(firstLine(parse(xml))).not.toHaveProperty('Quantita');
  });

  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/105
  test('reads &amp; in Descrizione as & and writes it back escaped', () => {
    const fattura = fpr12();
    firstLine(fattura).Descrizione = 'Viti & bulloni';
    const xml = expectReadAndWritten(fattura);
    expect(xml).toContain('<Descrizione>Viti &amp; bulloni</Descrizione>');
  });
});

describe('repeated and optional blocks other libraries dropped', () => {
  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/82
  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/37
  test('reads an empty Attachment and several attachments', () => {
    const fattura = fpr12();
    firstBody(fattura).Allegati = [
      { NomeAttachment: 'vuoto.txt', Attachment: '' },
      { NomeAttachment: 'ordine.txt', FormatoAttachment: 'TXT', Attachment: 'aGVsbG8=' },
    ];
    const xml = expectReadAndWritten(fattura);
    expect(xml).toContain('<Attachment></Attachment>');
  });

  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/72
  test('reads BolloVirtuale SI without ImportoBollo, which the XSD allows', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiBollo = { BolloVirtuale: 'SI' };
    expectReadAndWritten(fattura);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/363
  test('reads several Causale, in order', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.Causale = ['PRIMA RIGA', 'SECONDA RIGA'];
    expectReadAndWritten(fattura);
  });

  // PHP#80 RiferimentoAmministrazione, #92 DatiDDT on several lines, #49 NumeroCivico in
  // IndirizzoResa, #42 NumeroLicenzaGuida, #50 DatiContratto:
  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues?q=80+92+49+42+50
  test('reads the elements other libraries lost', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.CedentePrestatore.RiferimentoAmministrazione = 'AMM-1';
    firstLine(fattura).RiferimentoAmministrazione = 'RIGA-1';
    const body = firstBody(fattura);
    body.DatiBeniServizi.DettaglioLinee.push({
      NumeroLinea: '2',
      Descrizione: 'Trasporto',
      PrezzoUnitario: '0.00',
      PrezzoTotale: '0.00',
      AliquotaIVA: '22.00',
    });
    body.DatiGenerali.DatiContratto = [
      { IdDocumento: 'CONTRATTO-1', Data: '2024-12-01' },
      { RiferimentoNumeroLinea: ['2'], IdDocumento: 'CONTRATTO-2' },
    ];
    body.DatiGenerali.DatiDDT = [
      { NumeroDDT: 'DDT-1', DataDDT: '2025-01-10', RiferimentoNumeroLinea: ['1', '2'] },
      { NumeroDDT: 'DDT-2', DataDDT: '2025-01-11', RiferimentoNumeroLinea: ['2'] },
    ];
    body.DatiGenerali.DatiTrasporto = {
      DatiAnagraficiVettore: {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: '02876990587' },
        Anagrafica: { Denominazione: 'TRASPORTI SRL' },
        NumeroLicenzaGuida: 'AB1234567',
      },
      IndirizzoResa: {
        Indirizzo: 'VIA NAPOLI',
        NumeroCivico: '10/B',
        CAP: '80100',
        Comune: 'NAPOLI',
        Provincia: 'NA',
        Nazione: 'IT',
      },
    };
    expectReadAndWritten(fattura);
  });
});

describe('values the XSD refuses, as the SdI does', () => {
  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/403
  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/410
  test('a negative GiorniTerminiPagamento and NumeroColli are xsd.range', () => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiPagamento = [
      {
        CondizioniPagamento: 'TP02',
        DettaglioPagamento: [
          { ModalitaPagamento: 'MP05', GiorniTerminiPagamento: '-30', ImportoPagamento: '122.00' },
        ],
      },
    ];
    body.DatiGenerali.DatiTrasporto = { NumeroColli: '-1' };
    expect(errors(fattura)).toEqual([
      {
        code: 'xsd.range',
        path: 'FatturaElettronicaBody[0].DatiGenerali.DatiTrasporto.NumeroColli',
      },
      { code: 'xsd.range', path: `${PAGAMENTO}.GiorniTerminiPagamento` },
    ]);
    expect(libxml2Verdict(build(fattura, { validate: false })).valid).toBe(false);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/438: the XSD checks the
  // shape of the IBAN, not its check digits; the SdI checks no more than that.
  test('an IBAN is checked against the pattern of the XSD only', () => {
    const withIban = (IBAN: string): FatturaElettronica => {
      const fattura = fpr12();
      firstBody(fattura).DatiPagamento = [
        {
          CondizioniPagamento: 'TP02',
          DettaglioPagamento: [{ ModalitaPagamento: 'MP05', ImportoPagamento: '122.00', IBAN }],
        },
      ];
      return fattura;
    };
    expectReadAndWritten(withIban('IT60X0542811101000000123456'));
    for (const iban of ['ITQ0103071210000000011561', 'IT60 X054 2811 1010 0000 0123 456']) {
      expect(errors(withIban(iban))).toEqual([{ code: 'xsd.pattern', path: `${PAGAMENTO}.IBAN` }]);
    }
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/375: CAPType is 5 digits
  // for every country, so a foreign postcode is written as the XSD allows.
  test('a CAP is always 5 digits, even abroad', () => {
    const fattura = fpr12();
    const sede = fattura.FatturaElettronicaHeader.CessionarioCommittente.Sede;
    Object.assign(sede, { Comune: 'LIEGE', Nazione: 'BE' });
    delete sede.Provincia;
    sede.CAP = '4040';
    expect(errors(fattura)).toEqual([
      { code: 'xsd.pattern', path: 'FatturaElettronicaHeader.CessionarioCommittente.Sede.CAP' },
    ]);
    sede.CAP = '04040';
    expectReadAndWritten(fattura);
  });
});

describe('XML other libraries could not read or judged wrongly', () => {
  const base = build(fpr12());

  // Asset ok_bug_attribute_with_space.xml of
  // https://github.com/Slamdunk/php-validatore-fattura-elettronica/tree/bc3961137877a5ffa7dc0bf7a5c10a6e09b39186/tests/TestAsset
  test('reads and accepts a root that declares an unused namespace with a space in it', () => {
    const xml = base.replace(
      'versione="FPR12"',
      'versione="FPR12" xmlns:pfx6="http://www.example.com/XSD riepilogo_fattura_ordinaria_v1.2_mod.xsd"',
    );
    expect(xml).not.toBe(base);
    expect(parse(xml)).toEqual(fpr12());
    expect(validate(xml)).toEqual({ valid: true, problems: [] });
    // libxml2-wasm stops at the URI while parsing; PHP's libxml2 reads the file (asset "ok_").
    expect(libxml2Verdict(xml).errors).toEqual([expect.stringMatching(/is not a valid URI/)]);
  });

  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/59: the SdI refused a file
  // with "schemaLocation value = '…' must have even number of URI's". The value is a list of
  // pairs, namespace and location (XML Schema Part 1, §2.6.3,
  // https://www.w3.org/TR/xmlschema-1/#xsi_schemaLocation).
  test('xsi:schemaLocation with an odd number of URIs is xsd.pattern; build drops it', () => {
    const NS = 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2';
    const withLocation = (value: string): string =>
      base.replace('versione="FPR12"', `versione="FPR12" xsi:schemaLocation="${value}"`);
    expect(validate(withLocation(`${NS} Schema_VFPR12.xsd`)).valid).toBe(true);
    expect(validate(withLocation(' ')).valid).toBe(true);
    const odd = withLocation(NS);
    expect(validate(odd).problems).toEqual([
      expect.objectContaining({
        code: 'xsd.pattern',
        sdiCode: '00200',
        path: 'xsi:schemaLocation',
        severity: 'error',
      }),
    ]);
    // libxml2 only warns: here validate follows the SdI, which refuses the file.
    expect(libxml2Verdict(odd).valid).toBe(true);
    expect(build(parse(odd))).toBe(base);
  });

  test('xsi:schemaLocation with an odd number of URIs on an inner element has its own path', () => {
    const xml = base.replace(
      '<DatiTrasmissione>',
      '<DatiTrasmissione xsi:schemaLocation="http://www.example.com">',
    );
    expect(validate(xml).problems).toContainEqual(
      expect.objectContaining({
        code: 'xsd.pattern',
        path: 'FatturaElettronicaHeader.DatiTrasmissione.xsi:schemaLocation',
      }),
    );
  });
});

/**
 * Cases that are the subject of another test: the file and the name of the test (or part of it),
 * which must exist.
 */
const linked: readonly { case: string; file: string; tests: readonly string[] }[] = [
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/421
    case: 'windows-1252 declared in the prolog',
    file: 'parse.test.ts',
    tests: ['reads windows-1252 bytes, € included'],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/289
    case: 'root with the ns2: or ns3: prefix',
    file: 'parse.test.ts',
    tests: ["test.each(['ns2:', 'ns3:', 'fattura:'])('reads the root with the %s prefix'"],
  },
  {
    // https://github.com/Truelite/python-a38/issues/40, .NET#401
    case: 'Importo of ScontoMaggiorazione with up to 8 decimals, Percentuale with 2',
    file: 'validate-structure.test.ts',
    tests: ['a discount Importo with 8 decimals', 'a discount percentage with 3 decimals'],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/424, #403
    case: 'VAT over 100%, NumeroLinea outside 1-9999',
    file: 'validate-structure.test.ts',
    tests: ['VAT rate over 100%', 'NumeroLinea 0', 'NumeroLinea 10000'],
  },
  {
    // https://github.com/Truelite/python-a38/issues/38
    case: 'several DatiRitenuta',
    file: 'sdi-vat-ritenuta-sconti.test.ts',
    tests: ['several DatiRitenuta (RT01 and ENASARCO RT04) are right'],
  },
  {
    // https://github.com/Truelite/python-a38/issues/18
    case: 'Natura N2.1, N2.2, N6.x: up to 4 characters',
    file: 'sdi-vat-rates.test.ts',
    tests: ["test.each(['N2.1', 'N2.2', 'N3.5', 'N6.3', 'N6.9', 'N7'] as const)('%s is allowed'"],
  },
  {
    // https://github.com/Truelite/python-a38/issues/27, .NET#292, #296
    case: 'Natura on lines at 0% for the stamp duty too (00444)',
    file: 'sdi-vat-rates.test.ts',
    tests: ['the stamp duty on a line at 0% with Natura N1 has its own summary'],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/265, #370, #374, #314,
    // #409, #385
    case: "TD16-TD28, San Marino, Campione d'Italia (OO), Greece (EL), Northern Ireland (XI)",
    file: 'sdi-document.test.ts',
    tests: [
      "('%s from Livigno or Campione (OO) is valid'",
      'TD28 from San Marino is valid',
      'TD17 from Greece (EL) and TD18 from Northern Ireland (XI) are valid',
    ],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/394
    case: 'discounts in cascade and the tolerance of one cent in 00423',
    file: 'sdi-vat-amounts.test.ts',
    tests: [
      'Caso 2: percentages apply in cascade',
      'a cascade of discounts a cent away from the exact result passes',
    ],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/439, #440, #309
    case: 'PEC with a comma or a numeric domain; CodiceDestinatario of 6 or 7 characters',
    file: 'sdi-document.test.ts',
    tests: [
      'a PEC with a comma breaks the XSD pattern, and nothing else',
      'a PEC of another domain is valid, even with a numeric domain',
      'FPA12 with 6 characters and FPR12 with 7 are valid',
    ],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/373
    case: 'codice fiscale in lower case',
    file: 'sdi-document.test.ts',
    tests: [
      'a codice fiscale in lower case breaks the XSD pattern, and nothing else',
      'a valid codice fiscale in lower case is a warning',
    ],
  },
  {
    // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/106
    case: 'customer with neither P.IVA nor codice fiscale: valid for the XSD, 00417 for the SdI',
    file: 'sdi-document.test.ts',
    tests: ['a customer with neither is an error'],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/378, #379, #387, #388,
    // #386, #396
    case: '00471-00476 with a customer without P.IVA, sole trader',
    file: 'sdi-document.test.ts',
    tests: [
      'a sole trader billing himself by codice fiscale is not judged offline',
      'TD21 to a customer with only a codice fiscale is not judged offline',
      'a foreign supplier and a customer with only a codice fiscale is valid',
    ],
  },
  {
    // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/412, #220
    case: 'tags out of order: valid for the library, refused by the SdI',
    file: 'validate.test.ts',
    tests: ['FPR02 has ContattiTrasmittente out of order, which libxml2 refuses too'],
  },
  {
    // TD29 and RF20 are new in XSD 1.2.3
    case: 'TD29 and RF20',
    file: 'code-lists.test.ts',
    tests: ['lists the document types TD01–TD06 and TD16–TD29, in XSD order'],
  },
];

describe('cases tested elsewhere', () => {
  test.each(linked)('$case: the linked tests exist', ({ file, tests }) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const name of tests) expect(source).toContain(name);
  });

  test('RF20, new in XSD 1.2.3, is accepted', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.RegimeFiscale = 'RF20';
    expectReadAndWritten(fattura);
  });
});
