// Cases that users of other FatturaPA libraries met with real files, each with the behavior this
// library has: read, reported with a code, or refused. Each case is tested here with the input of
// its issue, even when another file tests the same rule.
import { describe, expect, test } from 'vitest';
import {
  build,
  type DatiGeneraliDocumento,
  type FatturaElettronica,
  type Problem,
  parse,
  validate,
} from '../src/index.js';
import { firstBody, firstLine, fpr12 } from './helpers/invoices.js';
import { libxml2Verdict } from './helpers/oracle.js';

const LINEA = 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0]';
const PAGAMENTO = 'FatturaElettronicaBody[0].DatiPagamento[0].DettaglioPagamento[0]';
const DOCUMENTO = 'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento';
const RIEPILOGO = 'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo[0]';
const CEDENTE = 'FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici';
const CESSIONARIO = 'FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici';
const P_IVA_CEDENTE = '01234567897';
const P_IVA_CLIENTE = '02876990587';
/** A foreign VAT number: the SdI checks only the Italian ones. */
const ID_ESTERO = '12345678901';
/** The codice fiscale of the owner of a sole trader, and of the customer of `fpr12`. */
const CF_TITOLARE = 'RSSMRA80A01H501U';

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

/** An invoice of type `tipo` from a supplier identified in `paese`, to a company with a P.IVA. */
function invoiceFrom(
  tipo: DatiGeneraliDocumento['TipoDocumento'],
  paese: string,
): FatturaElettronica {
  const fattura = fpr12();
  const header = fattura.FatturaElettronicaHeader;
  header.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA = {
    IdPaese: paese,
    IdCodice: paese === 'IT' ? P_IVA_CEDENTE : ID_ESTERO,
  };
  header.CessionarioCommittente.DatiAnagrafici = {
    IdFiscaleIVA: { IdPaese: 'IT', IdCodice: P_IVA_CLIENTE },
    Anagrafica: { Denominazione: 'GAMMA SRL' },
  };
  firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.TipoDocumento = tipo;
  return fattura;
}

/**
 * An invoice of type `tipo` from a sole trader to himself: the same P.IVA on both sides, and the
 * codice fiscale of the owner for the supplier only.
 */
function toHimself(tipo: DatiGeneraliDocumento['TipoDocumento']): FatturaElettronica {
  const fattura = invoiceFrom(tipo, 'IT');
  const header = fattura.FatturaElettronicaHeader;
  header.CedentePrestatore.DatiAnagrafici.CodiceFiscale = CF_TITOLARE;
  header.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA = {
    IdPaese: 'IT',
    IdCodice: P_IVA_CEDENTE,
  };
  return fattura;
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

  // https://github.com/Truelite/python-a38/issues/40
  test('keeps a discount Importo of 0.375 as written', () => {
    const fattura = fpr12();
    // (50.00 - 0.375) × 2.00 = 99.25; 22% of 99.25 is 21.835, rounded to 21.84.
    setLine(
      fattura,
      { Quantita: '2.00', PrezzoUnitario: '50.00', PrezzoTotale: '99.25' },
      { ImponibileImporto: '99.25', Imposta: '21.84', totale: '121.09' },
    );
    firstLine(fattura).ScontoMaggiorazione = [{ Tipo: 'SC', Importo: '0.375' }];
    const xml = expectReadAndWritten(fattura);
    expect(xml).toContain('<Importo>0.375</Importo>');
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

  // https://github.com/Truelite/python-a38/issues/38
  test('reads several DatiRitenuta, in order', () => {
    const fattura = fpr12();
    firstLine(fattura).Ritenuta = 'SI';
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.DatiRitenuta = [
      {
        TipoRitenuta: 'RT01',
        ImportoRitenuta: '20.00',
        AliquotaRitenuta: '20.00',
        CausalePagamento: 'A',
      },
      {
        TipoRitenuta: 'RT04',
        ImportoRitenuta: '8.50',
        AliquotaRitenuta: '8.50',
        CausalePagamento: 'A',
      },
    ];
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

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/401
  test('a discount Percentuale of 14.286 is xsd.pattern: two decimals at most', () => {
    const fattura = fpr12();
    // 50.00 × (1 - 0.14286) × 2.00 = 85.714, written 85.71.
    setLine(
      fattura,
      { Quantita: '2.00', PrezzoUnitario: '50.00', PrezzoTotale: '85.71' },
      { ImponibileImporto: '85.71', Imposta: '18.86', totale: '104.57' },
    );
    firstLine(fattura).ScontoMaggiorazione = [{ Tipo: 'SC', Percentuale: '14.286' }];
    expect(errors(fattura)).toEqual([
      { code: 'xsd.pattern', path: `${LINEA}.ScontoMaggiorazione[0].Percentuale` },
    ]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/424
  test('AliquotaIVA 200.00 is xsd.range', () => {
    const fattura = fpr12();
    firstLine(fattura).AliquotaIVA = '200.00';
    const body = firstBody(fattura);
    Object.assign(body.DatiBeniServizi.DatiRiepilogo[0] ?? {}, {
      AliquotaIVA: '200.00',
      Imposta: '200.00',
    });
    body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = '300.00';
    expect(errors(fattura)).toEqual([
      { code: 'xsd.range', path: `${LINEA}.AliquotaIVA` },
      { code: 'xsd.range', path: `${RIEPILOGO}.AliquotaIVA` },
    ]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/403
  test('NumeroLinea 0 is xsd.range', () => {
    const fattura = fpr12();
    firstLine(fattura).NumeroLinea = '0';
    expect(errors(fattura)).toEqual([{ code: 'xsd.range', path: `${LINEA}.NumeroLinea` }]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/373
  test('a codice fiscale in lower case is xsd.pattern, for supplier and customer', () => {
    const fattura = fpr12();
    const header = fattura.FatturaElettronicaHeader;
    header.CedentePrestatore.DatiAnagrafici.CodiceFiscale = 'rssmra80a01h501u';
    header.CessionarioCommittente.DatiAnagrafici.CodiceFiscale = 'rssmra80a01h501u';
    expect(errors(fattura)).toEqual([
      { code: 'xsd.pattern', path: `${CEDENTE}.CodiceFiscale` },
      { code: 'xsd.pattern', path: `${CESSIONARIO}.CodiceFiscale` },
    ]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/439
  test('a PECDestinatario with a comma is xsd.pattern', () => {
    const fattura = fpr12();
    const trasmissione = fattura.FatturaElettronicaHeader.DatiTrasmissione;
    Object.assign(trasmissione, {
      CodiceDestinatario: '0000000',
      PECDestinatario: 'fatture@pec,it',
    });
    expect(errors(fattura)).toEqual([
      { code: 'xsd.pattern', path: 'FatturaElettronicaHeader.DatiTrasmissione.PECDestinatario' },
    ]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/292
  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/296
  test('an empty Natura is xsd.enumeration, and no check of the SdI judges it', () => {
    const fattura = fpr12();
    Object.assign(firstBody(fattura).DatiBeniServizi.DatiRiepilogo[0] ?? {}, { Natura: '' });
    expect(validate(fattura).problems.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: 'xsd.enumeration', path: `${RIEPILOGO}.Natura` },
    ]);
  });
});

describe('XML other libraries could not read or judged wrongly', () => {
  const base = build(fpr12());
  const NS = 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2';

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/421
  test('reads windows-1252 declared in the prolog, € included', () => {
    const fattura = fpr12();
    // The XSD allows only Latin-1 in Descrizione, so the € is refused there; reading keeps it.
    firstLine(fattura).Descrizione = 'Caffè perché € 2';
    const xml = build(fattura, { validate: false }).replace(
      'encoding="UTF-8"',
      'encoding="windows-1252"',
    );
    // One byte per character: Latin-1, plus € at 0x80 as in windows-1252.
    const bytes = Uint8Array.from(xml, (char) => (char === '€' ? 0x80 : char.charCodeAt(0)));
    expect(parse(bytes)).toEqual(fattura);
  });

  // .NET#289 and #303: ns2 and ns3 are the prefixes of other software, one for the FatturaPA and
  // the other for the signature.
  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues?q=289+303
  test.each([
    ['ns3', 'ns2'],
    ['ns2', 'ns3'],
  ])(
    'reads and accepts a root with the %s: prefix, %s: being the signature',
    (fatturaPA, firma) => {
      const root = base.match(/<(\w+):FatturaElettronica [^>]*>/);
      if (root?.[1] === undefined) throw new Error('No prefixed root');
      const xml = base
        .replace(
          root[0],
          `<${fatturaPA}:FatturaElettronica xmlns:${fatturaPA}="${NS}" xmlns:${firma}="http://www.w3.org/2000/09/xmldsig#" versione="FPR12">`,
        )
        .replace(`</${root[1]}:FatturaElettronica>`, `</${fatturaPA}:FatturaElettronica>`);
      expect(parse(xml)).toEqual(fpr12());
      expect(validate(xml)).toEqual({ valid: true, problems: [] });
    },
  );

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/412
  test('Quantita out of its place in DettaglioLinee is xsd.order, which libxml2 refuses too', () => {
    const xml = base.replace(
      /(<Descrizione>Consulenza<\/Descrizione>)(\s*)(<Quantita>2\.00<\/Quantita>)/,
      '$3$2$1',
    );
    expect(xml).not.toBe(base);
    expect(validate(xml).problems).toEqual([
      expect.objectContaining({ code: 'xsd.order', sdiCode: '00200', severity: 'error' }),
    ]);
    expect(libxml2Verdict(xml).valid).toBe(false);
  });

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

describe('codes other libraries refused', () => {
  // https://github.com/Truelite/python-a38/issues/18
  test('reads Natura N2.1 and N2.2, of four characters, on lines and summaries', () => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    const zero = { AliquotaIVA: '0.00', Imposta: '0.00' };
    body.DatiBeniServizi.DettaglioLinee = [
      {
        NumeroLinea: '1',
        Descrizione: 'Servizio a cliente estero',
        PrezzoUnitario: '60.00',
        PrezzoTotale: '60.00',
        AliquotaIVA: '0.00',
        Natura: 'N2.1',
      },
      {
        NumeroLinea: '2',
        Descrizione: 'Regime forfettario',
        PrezzoUnitario: '40.00',
        PrezzoTotale: '40.00',
        AliquotaIVA: '0.00',
        Natura: 'N2.2',
      },
    ];
    body.DatiBeniServizi.DatiRiepilogo = [
      {
        ...zero,
        Natura: 'N2.1',
        ImponibileImporto: '60.00',
        RiferimentoNormativo: 'Art. 7-ter DPR 633/72',
      },
      {
        ...zero,
        Natura: 'N2.2',
        ImponibileImporto: '40.00',
        RiferimentoNormativo: 'Art. 1, c. 54-89, L. 190/2014',
      },
    ];
    body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = '100.00';
    expectReadAndWritten(fattura);
  });

  // .NET#265 (TD27), #370 (OO from Livigno and Campione d'Italia), #374 (EL for Greece), #314
  // (XI for Northern Ireland), #385 (TD28 from San Marino):
  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues?q=265+370+374+314+385.
  // "Nei casi di TD17 e TD19 è ammessa l'indicazione del valore 'OO' nell'elemento 1.2.1.1.1
  // <IdPaese>" (Allegato A 1.9.1, p. 119). TD29 is new in XSD 1.2.3. #385 asked TD28 to want SM,
  // as the Allegato A 1.7.1 said: "nel caso del TD28, l'elemento 1.2.1.1.1 <IdPaese> deve essere
  // valorizzato con il valore SM" (p. 121,
  // https://www.agenziaentrate.gov.it/portale/documents/20143/451259/Allegato+A+-+Specifiche+tecniche+vers+1.7.1.pdf/5c3de81a-7ad5-34a7-54b0-735b1456972c).
  // The 1.8 dropped it, and TD28 from other countries is valid (00473 tests).
  test.each([
    ['TD17', 'OO'],
    ['TD19', 'OO'],
    ['TD17', 'EL'],
    ['TD18', 'XI'],
    ['TD28', 'SM'],
    ['TD29', 'IT'],
  ] as const)('%s from a supplier of %s is read and accepted', (tipo, paese) => {
    expectReadAndWritten(invoiceFrom(tipo, paese));
  });

  test('RF20, new in XSD 1.2.3, is accepted', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.RegimeFiscale = 'RF20';
    expectReadAndWritten(fattura);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/440
  test('an Email whose domain starts with a digit is accepted', () => {
    const fattura = fpr12();
    const header = fattura.FatturaElettronicaHeader;
    header.DatiTrasmissione.ContattiTrasmittente = { Email: 'test@2bbresine.it' };
    header.CedentePrestatore.Contatti = { Email: 'test@3ddtorneria.it' };
    expectReadAndWritten(fattura);
  });
});

// Sources: Elenco controlli SdI 2.0,
// https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf;
// Allegato A, Specifiche tecniche 1.9.1,
// https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1.
describe('checks of the SdI other libraries got wrong', () => {
  // https://github.com/fatturaelettronicaphp/FatturaElettronica/issues/106: "IF ( non esiste
  // IdFiscaleIVA && non esiste CodiceFiscale ) ERRORE (00417)" (Elenco controlli SdI 2.0, p. 20).
  test('a customer with neither P.IVA nor codice fiscale is valid for the XSD, 00417 for the SdI', () => {
    const fattura = fpr12();
    delete fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.CodiceFiscale;
    expect(errors(fattura)).toEqual([{ code: 'sdi.00417', path: CESSIONARIO }]);
    expect(libxml2Verdict(build(fattura, { validate: false }))).toEqual({
      valid: true,
      errors: [],
    });
  });

  // .NET#409, #388: a sole trader gives goods to himself as a private person (TD27), and the
  // customer has only the codice fiscale. "Nei casi in cui in fattura sia presente il solo
  // IDCessionarioCF per il cessionario, si risale all' IDCessionarioPIVA attraverso interrogazione
  // di Anagrafe Tributaria" (Elenco controlli SdI 2.0, p. 40): offline there is nothing to compare.
  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues?q=409+388
  test('TD27 from a sole trader to himself by codice fiscale is accepted', () => {
    const fattura = fpr12();
    const cedente = fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici;
    cedente.CodiceFiscale = CF_TITOLARE;
    cedente.Anagrafica = { Denominazione: 'ROSSI MARIO DITTA INDIVIDUALE' };
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.TipoDocumento = 'TD27';
    expectReadAndWritten(fattura);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/396: "IF ( TipoDocumento
  // == TD21 ) IF ( IDCedente != IDCessionarioIVA ) ERRORE (00472)" (Elenco controlli SdI 2.0,
  // p. 41) compares the P.IVA; "i tipi documento TD21 e TD27 non ammettono l'indicazione in fattura
  // di un cedente diverso dal cessionario" (Allegato A 1.9.1, p. 119).
  test.each(['TD21', 'TD27'] as const)(
    '%s with the same P.IVA and a codice fiscale for the supplier only is accepted',
    (tipo) => {
      expectReadAndWritten(toHimself(tipo));
    },
  );

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/386: "IF ( IDPaeseCedente
  // != IT && IDPaeseCessionario != IT ) ERRORE (00476)" reads both from IdFiscaleIVA/IdPaese
  // (Elenco controlli SdI 2.0, p. 45), and a customer with only the codice fiscale has none.
  test('a supplier of the Vatican and a customer with only a codice fiscale is accepted', () => {
    const fattura = fpr12();
    const cedente = fattura.FatturaElettronicaHeader.CedentePrestatore;
    cedente.DatiAnagrafici.IdFiscaleIVA = { IdPaese: 'VA', IdCodice: ID_ESTERO };
    cedente.Sede = {
      Indirizzo: 'VIA DEL PELLEGRINO',
      CAP: '00120',
      Comune: 'CITTA DEL VATICANO',
      Nazione: 'VA',
    };
    expectReadAndWritten(fattura);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/387: 00471 compares the
  // IdFiscaleIVA, even when the supplier has a codice fiscale too. "IF ( TipoDocumento == TD16
  // [...] ) IF ( IDCedente == IDCessionarioIVA ) ERRORE (00471)" (Elenco controlli SdI 2.0, p. 40).
  test('TD16 with the same P.IVA is 00471, even with a codice fiscale for the supplier', () => {
    expect(errors(toHimself('TD16'))).toEqual([
      { code: 'sdi.00471', path: `${DOCUMENTO}.TipoDocumento` },
    ]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/378: the Allegato A 1.9.1,
  // p. 119, adds "TD01, TD02, TD03, TD06 [...] TD24, TD25, TD28" to the types of 00471, which the
  // Elenco controlli SdI 2.0 (p. 40) doesn't list: a warning.
  test('TD01 with the same P.IVA is a warning of 00471', () => {
    expect(validate(toHimself('TD01')).problems).toEqual([
      expect.objectContaining({
        code: 'sdi.00471.warn',
        path: `${DOCUMENTO}.TipoDocumento`,
        severity: 'warning',
      }),
    ]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/309: "1.1.4
  // <CodiceDestinatario> di 6 caratteri a fronte di 1.1.3 <FormatoTrasmissione> con valore
  // "FPR12"" is 00427 (Elenco controlli SdI 2.0, p. 33).
  test('an FPR12 invoice with a CodiceDestinatario of 6 characters is 00427', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'ABC123';
    expect(errors(fattura)).toEqual([
      { code: 'sdi.00427', path: 'FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario' },
    ]);
  });

  // https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/394: the SdI accepted the
  // attached invoice, whose line 15 is 0.0930 × 200 with a 48% discount, 9.672, written as 9.66.
  // The Allegato A 1.9.1 refuses a difference "superiore a ±1 centesimo di euro" (p. 51): 0.012 is
  // a warning, not an error.
  test('a discounted line off by 0.012, accepted by the SdI, is valid with a warning', () => {
    const fattura = fpr12();
    setLine(
      fattura,
      { Quantita: '200.00', PrezzoUnitario: '0.0930', PrezzoTotale: '9.66' },
      { ImponibileImporto: '9.66', Imposta: '2.13', totale: '11.79' },
    );
    firstLine(fattura).ScontoMaggiorazione = [{ Tipo: 'SC', Percentuale: '48.00' }];
    const result = validate(fattura);
    expect(result.valid).toBe(true);
    expect(result.problems).toContainEqual(
      expect.objectContaining({ code: 'sdi.00423.warn', path: `${LINEA}.PrezzoTotale` }),
    );
    // 9.65 is off by 0.022, over the tolerance even with the difference rounded to the cent.
    firstLine(fattura).PrezzoTotale = '9.65';
    expect(errors(fattura)).toContainEqual({ code: 'sdi.00423', path: `${LINEA}.PrezzoTotale` });
  });

  // https://github.com/Truelite/python-a38/issues/27: a line at 0% with its Natura, and a summary at
  // 0% without one. 00429 is 00400 for the DatiRiepilogo (Elenco controlli SdI 2.0, p. 35); 00444:
  // "tutti i valori di natura dell'operazione presenti nelle linee di dettaglio [...] devono essere
  // presenti anche nei dati di riepilogo" (Allegato A 1.9.1, p. 118).
  test('a summary at 0% without the Natura of its line is 00429, and the line 00444', () => {
    const fattura = fpr12();
    const body = firstBody(fattura);
    body.DatiBeniServizi.DettaglioLinee.push({
      NumeroLinea: '2',
      Descrizione: 'Altro articolo',
      Quantita: '1.00',
      UnitaMisura: 'kg',
      PrezzoUnitario: '15.50',
      PrezzoTotale: '15.50',
      AliquotaIVA: '0.00',
      Natura: 'N3.1',
    });
    body.DatiBeniServizi.DatiRiepilogo.push({
      AliquotaIVA: '0.00',
      ImponibileImporto: '15.50',
      Imposta: '0.00',
    });
    body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = '137.50';
    expect(errors(fattura)).toEqual([
      {
        code: 'sdi.00444',
        path: 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].Natura',
      },
      {
        code: 'sdi.00429',
        path: 'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo[1].Natura',
      },
    ]);
  });
});
