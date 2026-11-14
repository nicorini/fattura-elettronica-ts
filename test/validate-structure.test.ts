import { describe, expect, test } from 'vitest';
import { build, type FatturaElettronica, type Problem, validate } from '../src/index.js';
import { firstBody, firstLine, fpa12, fpr12 } from './helpers/invoices.js';
import { libxml2Verdict } from './helpers/oracle.js';

/** Problems of structure only: the checks of the SdI are tested on their own. */
const structural = (problems: readonly Problem[]): Problem[] =>
  problems.filter((problem) => !/^(?:sdi|warn)\./.test(problem.code));

const base = build(fpr12());

/** The XML of {@link fpr12} with `from` replaced by `to`; `from` must be there. */
function alter(from: string | RegExp, to: string): string {
  const xml = base.replace(from, to);
  if (xml === base) throw new Error(`${String(from)} not found in the base invoice`);
  return xml;
}

const lineOf = (name: string, value: string): string => `<${name}>${value}</${name}>`;

const HEADER = 'FatturaElettronicaHeader';
const TRASMISSIONE = `${HEADER}.DatiTrasmissione`;
const ANAGRAFICA_CEDENTE = `${HEADER}.CedentePrestatore.DatiAnagrafici.Anagrafica`;
const DOCUMENTO = 'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento';
const LINEA = 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0]';

interface InvalidXml {
  readonly name: string;
  readonly xml: string;
  readonly code: string;
  readonly path: string;
}

const invalidXml: InvalidXml[] = [
  {
    name: 'a missing required element',
    xml: alter(/\n\s*<ProgressivoInvio>00001<\/ProgressivoInvio>/, ''),
    code: 'xsd.required',
    path: `${TRASMISSIONE}.ProgressivoInvio`,
  },
  {
    name: 'an unknown element',
    xml: alter('<ProgressivoInvio>', '<Progressivo>1</Progressivo><ProgressivoInvio>'),
    code: 'xsd.unexpected',
    path: `${TRASMISSIONE}.Progressivo`,
  },
  {
    name: 'an attribute on an element',
    xml: alter('<DatiTrasmissione>', '<DatiTrasmissione id="1">'),
    code: 'xsd.unexpected',
    path: TRASMISSIONE,
  },
  {
    name: 'an unknown attribute on the root',
    xml: alter('versione="FPR12"', 'versione="FPR12" lingua="it"'),
    code: 'xsd.unexpected',
    path: 'lingua',
  },
  {
    name: 'text in a block of elements',
    xml: alter('<DatiTrasmissione>', '<DatiTrasmissione>testo'),
    code: 'xsd.unexpected',
    path: TRASMISSIONE,
  },
  {
    name: 'an element inside a value',
    xml: alter('<Numero>1</Numero>', '<Numero>1<Sub>2</Sub></Numero>'),
    code: 'xsd.unexpected',
    path: `${DOCUMENTO}.Numero`,
  },
  {
    name: 'two elements swapped',
    xml: alter(
      /(<ProgressivoInvio>00001<\/ProgressivoInvio>)(\s*)(<FormatoTrasmissione>FPR12<\/FormatoTrasmissione>)/,
      '$3$2$1',
    ),
    code: 'xsd.order',
    path: `${TRASMISSIONE}.ProgressivoInvio`,
  },
  {
    name: 'a repeated element after the next one',
    xml: alter(
      '</DatiRiepilogo>',
      '</DatiRiepilogo><DettaglioLinee><NumeroLinea>2</NumeroLinea><Descrizione>X</Descrizione><PrezzoUnitario>0.00</PrezzoUnitario><PrezzoTotale>0.00</PrezzoTotale><AliquotaIVA>22.00</AliquotaIVA></DettaglioLinee>',
    ),
    code: 'xsd.order',
    path: 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1]',
  },
  {
    name: 'a default xmlns that puts the children in the namespace',
    xml: alter(
      'versione="FPR12"',
      'versione="FPR12" xmlns="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"',
    ),
    code: 'xsd.namespace',
    path: HEADER,
  },
  {
    name: 'a child with the prefix of the root',
    xml: alter(/<(\/?)ProgressivoInvio>/g, '<$1p:ProgressivoInvio>'),
    code: 'xsd.namespace',
    path: `${TRASMISSIONE}.ProgressivoInvio`,
  },
  {
    name: 'a non repeatable element twice',
    xml: alter(
      '<ProgressivoInvio>00001</ProgressivoInvio>',
      '<ProgressivoInvio>00001</ProgressivoInvio><ProgressivoInvio>00002</ProgressivoInvio>',
    ),
    code: 'xsd.maxOccurs',
    path: `${TRASMISSIONE}.ProgressivoInvio`,
  },
  {
    name: 'both alternatives of a choice',
    xml: alter(
      '<Denominazione>ALPHA SRL</Denominazione>',
      '<Denominazione>ALPHA SRL</Denominazione><Nome>A</Nome><Cognome>B</Cognome>',
    ),
    code: 'xsd.choice',
    path: ANAGRAFICA_CEDENTE,
  },
  {
    name: 'no alternative of a choice',
    xml: alter('<Denominazione>ALPHA SRL</Denominazione>', ''),
    code: 'xsd.choice',
    path: ANAGRAFICA_CEDENTE,
  },
  {
    name: 'half of the alternative of a choice',
    xml: alter(/\n\s*<Cognome>ROSSI<\/Cognome>/, ''),
    code: 'xsd.required',
    path: `${HEADER}.CessionarioCommittente.DatiAnagrafici.Anagrafica.Cognome`,
  },
  {
    name: 'an unknown code',
    xml: alter(lineOf('TipoDocumento', 'TD01'), lineOf('TipoDocumento', 'TD30')),
    code: 'xsd.enumeration',
    path: `${DOCUMENTO}.TipoDocumento`,
  },
  {
    name: 'RF03, a code of XSD 1.2 only',
    xml: alter(lineOf('RegimeFiscale', 'RF01'), lineOf('RegimeFiscale', 'RF03')),
    code: 'xsd.enumeration',
    path: `${HEADER}.CedentePrestatore.DatiAnagrafici.RegimeFiscale`,
  },
  {
    name: 'a code in lower case',
    xml: alter(lineOf('CodiceDestinatario', 'ABC1234'), lineOf('CodiceDestinatario', 'abc1234')),
    code: 'xsd.pattern',
    path: `${TRASMISSIONE}.CodiceDestinatario`,
  },
  {
    name: 'an amount with 3 decimals',
    xml: alter(lineOf('Imposta', '22.00'), lineOf('Imposta', '22.000')),
    code: 'xsd.pattern',
    path: 'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo[0].Imposta',
  },
  {
    name: 'an amount without decimals',
    xml: alter(lineOf('PrezzoTotale', '100.00'), lineOf('PrezzoTotale', '100')),
    code: 'xsd.pattern',
    path: `${LINEA}.PrezzoTotale`,
  },
  {
    name: 'an amount that is not a number',
    xml: alter(lineOf('PrezzoTotale', '100.00'), lineOf('PrezzoTotale', 'cento')),
    code: 'xsd.pattern',
    path: `${LINEA}.PrezzoTotale`,
  },
  {
    name: 'a character outside Latin-1',
    xml: alter(lineOf('Descrizione', 'Consulenza'), lineOf('Descrizione', 'Consulenza €')),
    code: 'xsd.pattern',
    path: `${LINEA}.Descrizione`,
  },
  {
    name: 'a date that does not exist',
    xml: alter(lineOf('Data', '2025-01-15'), lineOf('Data', '2025-02-29')),
    code: 'xsd.pattern',
    path: `${DOCUMENTO}.Data`,
  },
  {
    name: 'a date in another format',
    xml: alter(lineOf('Data', '2025-01-15'), lineOf('Data', '15/01/2025')),
    code: 'xsd.pattern',
    path: `${DOCUMENTO}.Data`,
  },
  {
    name: 'an integer with decimals',
    xml: alter(lineOf('NumeroLinea', '1'), lineOf('NumeroLinea', '1.0')),
    code: 'xsd.pattern',
    path: `${LINEA}.NumeroLinea`,
  },
  {
    name: 'a value too long',
    xml: alter(lineOf('Numero', '1'), lineOf('Numero', '1'.repeat(21))),
    code: 'xsd.pattern',
    path: `${DOCUMENTO}.Numero`,
  },
  {
    name: 'an empty value',
    xml: alter(lineOf('Descrizione', 'Consulenza'), '<Descrizione/>'),
    code: 'xsd.pattern',
    path: `${LINEA}.Descrizione`,
  },
  {
    name: 'a code longer than allowed',
    xml: alter(/<IdCodice>01234567897<\/IdCodice>/, lineOf('IdCodice', '1'.repeat(29))),
    code: 'xsd.length',
    path: `${TRASMISSIONE}.IdTrasmittente.IdCodice`,
  },
  {
    name: 'an empty code',
    xml: alter(/<IdCodice>01234567897<\/IdCodice>/, '<IdCodice></IdCodice>'),
    code: 'xsd.length',
    path: `${TRASMISSIONE}.IdTrasmittente.IdCodice`,
  },
  {
    name: 'VAT rate over 100%',
    xml: alter(lineOf('AliquotaIVA', '22.00'), lineOf('AliquotaIVA', '101.00')),
    code: 'xsd.range',
    path: `${LINEA}.AliquotaIVA`,
  },
  {
    name: 'NumeroLinea 0',
    xml: alter(lineOf('NumeroLinea', '1'), lineOf('NumeroLinea', '0')),
    code: 'xsd.range',
    path: `${LINEA}.NumeroLinea`,
  },
  {
    name: 'NumeroLinea 10000',
    xml: alter(lineOf('NumeroLinea', '1'), lineOf('NumeroLinea', '10000')),
    code: 'xsd.range',
    path: `${LINEA}.NumeroLinea`,
  },
  {
    name: 'an invoice date before 1970',
    xml: alter(lineOf('Data', '2025-01-15'), lineOf('Data', '1969-12-31')),
    code: 'xsd.range',
    path: `${DOCUMENTO}.Data`,
  },
  {
    name: 'a discount percentage with 3 decimals',
    xml: alter(
      '<PrezzoTotale>',
      '<ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>10.000</Percentuale></ScontoMaggiorazione><PrezzoTotale>',
    ),
    code: 'xsd.pattern',
    path: `${LINEA}.ScontoMaggiorazione[0].Percentuale`,
  },
  {
    name: 'a codice fiscale in lower case',
    xml: alter(
      lineOf('CodiceFiscale', 'RSSMRA80A01H501U'),
      lineOf('CodiceFiscale', 'rssmra80a01h501u'),
    ),
    code: 'xsd.pattern',
    path: `${HEADER}.CessionarioCommittente.DatiAnagrafici.CodiceFiscale`,
  },
];

describe('validate on an altered XML', () => {
  test.each(invalidXml)(
    'reports $code on $name, which libxml2 refuses too',
    ({ xml, code, path }) => {
      expect(libxml2Verdict(xml).valid).toBe(false);
      const result = validate(xml);
      expect(result.valid).toBe(false);
      expect(result.problems).toContainEqual(
        expect.objectContaining({ code, sdiCode: '00200', path, severity: 'error' }),
      );
    },
  );

  test('every xsd code has at least one altered XML', () => {
    const codes = new Set(invalidXml.map((entry) => entry.code));
    expect([...codes].sort()).toEqual(
      [
        'xsd.choice',
        'xsd.enumeration',
        'xsd.length',
        'xsd.maxOccurs',
        'xsd.namespace',
        'xsd.order',
        'xsd.pattern',
        'xsd.range',
        'xsd.required',
        'xsd.unexpected',
      ].sort(),
    );
  });

  test('a default xmlns is reported on the outermost elements it moves, not on all of them', () => {
    const xml = alter(
      'versione="FPR12"',
      'versione="FPR12" xmlns="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"',
    );
    expect(structural(validate(xml).problems)).toEqual([
      expect.objectContaining({ code: 'xsd.namespace', path: HEADER }),
      expect.objectContaining({ code: 'xsd.namespace', path: 'FatturaElettronicaBody[0]' }),
    ]);
  });
});

const validXml: { name: string; xml: string }[] = [
  {
    name: 'a discount Importo with 8 decimals',
    xml: alter(
      '<PrezzoTotale>',
      '<ScontoMaggiorazione><Tipo>SC</Tipo><Importo>1.12345678</Importo></ScontoMaggiorazione><PrezzoTotale>',
    ),
  },
  { name: 'Quantita without UnitaMisura', xml: base },
  {
    name: 'spaces around a decimal, which xs:decimal collapses',
    xml: alter(lineOf('PrezzoTotale', '100.00'), lineOf('PrezzoTotale', ' 100.00\n')),
  },
  {
    name: 'line breaks in a Latin text, which normalizedString turns into spaces',
    xml: alter(lineOf('Descrizione', 'Consulenza'), lineOf('Descrizione', 'Riga 1\nRiga 2\tè')),
  },
  {
    name: 'an empty Attachment and one in base64 with line breaks',
    xml: alter(
      '</DatiBeniServizi>',
      '</DatiBeniServizi><Allegati><NomeAttachment>a.txt</NomeAttachment><Attachment/></Allegati><Allegati><NomeAttachment>b.txt</NomeAttachment><Attachment>aGVs\nbG8=</Attachment></Allegati>',
    ),
  },
  {
    name: 'a date with a time zone',
    xml: alter(lineOf('Data', '2025-01-15'), lineOf('Data', '2025-01-15+01:00')),
  },
  {
    name: 'an integer with a sign and leading zeros',
    xml: alter(lineOf('NumeroLinea', '1'), lineOf('NumeroLinea', '+0001')),
  },
  {
    name: 'xsi:schemaLocation on the root',
    xml: alter('versione="FPR12"', 'versione="FPR12" xsi:schemaLocation="a b"'),
  },
  {
    name: 'a comment and a CDATA value',
    xml: alter(
      lineOf('Descrizione', 'Consulenza'),
      '<!-- c --><Descrizione><![CDATA[A & B]]></Descrizione>',
    ),
  },
  {
    name: 'a choice element at its place with the optional ones after it',
    xml: alter('</Cognome>', '</Cognome><Titolo>DOTT</Titolo>'),
  },
];

describe('validate on a valid XML', () => {
  test.each(validXml)('accepts $name, as libxml2 does', ({ xml }) => {
    expect(libxml2Verdict(xml)).toEqual({ valid: true, errors: [] });
    expect(structural(validate(xml).problems)).toEqual([]);
  });
});

describe('the invoices built for the tests', () => {
  test.each([
    ['FPR12', fpr12],
    ['FPA12', fpa12],
  ])('the %s one is valid for validate and for libxml2', (_, invoice) => {
    expect(validate(invoice())).toEqual({ valid: true, problems: [] });
    expect(libxml2Verdict(build(invoice()))).toEqual({ valid: true, errors: [] });
  });
});

interface InvalidObject {
  readonly name: string;
  readonly alter: (fattura: FatturaElettronica) => void;
  readonly code: string;
  readonly path: string;
  /**
   * What build writes is valid for the XSD, but the object is not: a property outside the model
   * is dropped, a value that is not a string would be converted.
   */
  readonly stricterThanXsd?: true;
}

// Writing to a field with the wrong type: what a JavaScript caller without types can do.
const loose = (object: object): Record<string, unknown> => object as Record<string, unknown>;

const invalidObjects: InvalidObject[] = [
  {
    name: 'a number in a field',
    alter: (fattura) => {
      loose(firstLine(fattura)).PrezzoTotale = 100;
    },
    code: 'input.type',
    path: `${LINEA}.PrezzoTotale`,
  },
  {
    name: 'null in a field',
    stricterThanXsd: true,
    alter: (fattura) => {
      loose(firstLine(fattura)).Descrizione = null;
    },
    code: 'input.type',
    path: `${LINEA}.Descrizione`,
  },
  {
    name: 'a string where a block goes',
    alter: (fattura) => {
      loose(firstBody(fattura)).DatiGenerali = 'X';
    },
    code: 'input.type',
    path: 'FatturaElettronicaBody[0].DatiGenerali',
  },
  {
    name: 'a misspelled property',
    stricterThanXsd: true,
    alter: (fattura) => {
      loose(firstLine(fattura)).Descrizone = 'X';
    },
    code: 'xsd.unexpected',
    path: `${LINEA}.Descrizone`,
  },
  {
    name: 'a missing required field',
    alter: (fattura) => {
      delete loose(firstLine(fattura)).PrezzoTotale;
    },
    code: 'xsd.required',
    path: `${LINEA}.PrezzoTotale`,
  },
  {
    name: 'an empty array for a required repeatable field',
    alter: (fattura) => {
      firstBody(fattura).DatiBeniServizi.DettaglioLinee = [];
    },
    code: 'xsd.required',
    path: 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee',
  },
  {
    name: 'two values for a non repeatable field',
    alter: (fattura) => {
      loose(firstLine(fattura)).Descrizione = ['A', 'B'];
    },
    code: 'input.type',
    path: `${LINEA}.Descrizione`,
  },
  {
    name: 'an array of one for a non repeatable field',
    stricterThanXsd: true,
    alter: (fattura) => {
      loose(firstLine(fattura)).Descrizione = ['A'];
    },
    code: 'input.type',
    path: `${LINEA}.Descrizione`,
  },
  {
    name: 'a single value where the model has an array',
    stricterThanXsd: true,
    alter: (fattura) => {
      loose(fattura).FatturaElettronicaBody = firstBody(fattura);
    },
    code: 'input.type',
    path: 'FatturaElettronicaBody',
  },
  {
    name: 'both alternatives of a choice',
    alter: (fattura) => {
      loose(fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.Anagrafica).Nome =
        'MARIO';
    },
    code: 'xsd.choice',
    path: ANAGRAFICA_CEDENTE,
  },
  {
    name: 'an unknown versione',
    alter: (fattura) => {
      loose(fattura).versione = 'FPR13';
    },
    code: 'xsd.enumeration',
    path: 'versione',
  },
  {
    name: 'a control character, which XML can not hold',
    alter: (fattura) => {
      firstLine(fattura).Descrizione = 'A\u0001B';
    },
    code: 'xsd.pattern',
    path: `${LINEA}.Descrizione`,
  },
];

describe('validate on an altered object', () => {
  test.each(invalidObjects)(
    'reports $code on $name, and libxml2 refuses what build writes',
    ({ alter: change, code, path, stricterThanXsd }) => {
      const fattura = fpr12();
      change(fattura);
      const result = validate(fattura);
      expect(result.valid).toBe(false);
      expect(result.problems).toContainEqual(
        expect.objectContaining({ code, sdiCode: '00200', path, severity: 'error' }),
      );
      expect(libxml2Verdict(build(fattura, { validate: false })).valid).toBe(
        stricterThanXsd === true,
      );
    },
  );

  test('a single value where the model has an array is input.type, never converted', () => {
    const fattura = fpr12();
    loose(firstBody(fattura).DatiBeniServizi).DettaglioLinee = firstLine(fattura);
    expect(validate(fattura).problems).toEqual([
      {
        code: 'input.type',
        sdiCode: '00200',
        path: 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee',
        message:
          'DettaglioLinee è un campo ripetibile: deve essere un array, anche con un solo elemento, non un oggetto.',
        severity: 'error',
      },
    ]);
  });

  test.each([
    [
      'null among the lines',
      (f: FatturaElettronica) => {
        loose(firstBody(f).DatiBeniServizi).DettaglioLinee = [firstLine(f), null];
      },
    ],
    [
      'a string among the summaries',
      (f: FatturaElettronica) => {
        loose(firstBody(f).DatiBeniServizi).DatiRiepilogo = ['X'];
      },
    ],
    [
      'null as a body',
      (f: FatturaElettronica) => {
        loose(f).FatturaElettronicaBody = [null];
      },
    ],
    [
      'a number as the cassa',
      (f: FatturaElettronica) => {
        loose(firstBody(f).DatiGenerali.DatiGeneraliDocumento).DatiCassaPrevidenziale = [1];
      },
    ],
    [
      'null as ScontoMaggiorazione and DatiPagamento',
      (f: FatturaElettronica) => {
        loose(firstLine(f)).ScontoMaggiorazione = [null];
        loose(firstBody(f)).DatiPagamento = [null];
        loose(firstBody(f).DatiGenerali).DatiFattureCollegate = [null];
      },
    ],
  ])('the checks of the SdI read %s without failing', (_, change) => {
    const fattura = fpr12();
    change(fattura);
    const codes = validate(fattura).problems.map(({ code }) => code);
    expect(codes).toContain('input.type');
    expect(codes).not.toContain('internal.rule');
  });

  // Attachment is xs:base64Binary, whose "lexical forms [...] are limited to the 65 characters of
  // the Base64 Alphabet [...] together with the characters defined in [XML 1.0 (Second Edition)]
  // as white space. No other characters are allowed" (XML Schema Part 2: Datatypes, §3.2.16,
  // https://www.w3.org/TR/xmlschema-2/#base64Binary). libxml2 skips such characters, so it is not
  // the oracle here.
  test('an Attachment with a character outside base64 is xsd.pattern', () => {
    const fattura = fpr12();
    firstBody(fattura).Allegati = [{ NomeAttachment: 'a.txt', Attachment: 'aGVs!bG8=' }];
    expect(validate(fattura).problems).toEqual([
      expect.objectContaining({
        code: 'xsd.pattern',
        sdiCode: '00200',
        path: 'FatturaElettronicaBody[0].Allegati[0].Attachment',
      }),
    ]);
  });

  test('an array on a non repeatable field is input.type', () => {
    const fattura = fpr12();
    loose(firstBody(fattura)).DatiGenerali = [firstBody(fattura).DatiGenerali];
    expect(structural(validate(fattura).problems)).toEqual([
      expect.objectContaining({
        code: 'input.type',
        path: 'FatturaElettronicaBody[0].DatiGenerali',
        message: 'DatiGenerali non è un campo ripetibile: deve essere un oggetto, non un array.',
      }),
    ]);
  });

  test('a property set to undefined is a missing field', () => {
    const fattura = fpr12();
    loose(firstLine(fattura)).UnitaMisura = undefined;
    expect(validate(fattura).problems).toEqual([]);
  });

  test('a problem has code, SdI code, path, Italian message and severity', () => {
    const fattura = fpr12();
    loose(firstLine(fattura)).PrezzoTotale = 100;
    expect(validate(fattura).problems).toEqual([
      {
        code: 'input.type',
        sdiCode: '00200',
        path: `${LINEA}.PrezzoTotale`,
        message:
          'PrezzoTotale deve essere una stringa, non un valore di tipo number: i numeri si scrivono come testo, ad esempio con decimal().',
        severity: 'error',
      },
    ]);
  });

  test('a value that is not an object at all is input.type on the empty path', () => {
    expect(validate(42 as unknown as FatturaElettronica).problems).toEqual([
      expect.objectContaining({ code: 'input.type', path: '' }),
    ]);
  });
});

describe('the order of the problems', () => {
  test('follows the document, whatever the order they are found in, with no limit', () => {
    const fattura = fpr12();
    const linee = firstBody(fattura).DatiBeniServizi.DettaglioLinee;
    for (let i = 0; i < 150; i++) linee.push({ ...firstLine(fattura), NumeroLinea: '0' });
    firstBody(fattura).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: '15100.00', Imposta: '3322.00' },
    ];
    loose(fattura).Inventato = 'X';
    loose(fattura.FatturaElettronicaHeader.DatiTrasmissione).ProgressivoInvio = 1;
    const paths = validate(fattura).problems.map((problem) => problem.path);
    expect(paths).toHaveLength(152);
    expect(paths[0]).toBe(`${TRASMISSIONE}.ProgressivoInvio`);
    expect(paths[1]).toBe(
      'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].NumeroLinea',
    );
    expect(paths[150]).toBe(
      'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[150].NumeroLinea',
    );
    expect(paths[151]).toBe('Inventato');
  });

  test('puts the attributes of the root before its elements', () => {
    const fattura = fpr12();
    loose(fattura.FatturaElettronicaHeader.DatiTrasmissione).ProgressivoInvio = 1;
    loose(fattura).SistemaEmittente = 'X'.repeat(11);
    expect(validate(fattura).problems.map((problem) => problem.path)).toEqual([
      'SistemaEmittente',
      `${TRASMISSIONE}.ProgressivoInvio`,
    ]);
  });
});

describe('validate on something that is not a FatturaPA', () => {
  test.each([
    ['malformed XML', '<p:FatturaElettronica', 'xml.malformed'],
    ['another root', '<?xml version="1.0"?><Fattura/>', 'xml.notFatturaPA'],
    [
      'a DOCTYPE',
      alter('<p:FatturaElettronica', '<!DOCTYPE p:FatturaElettronica><p:FatturaElettronica'),
      'xml.doctype',
    ],
    ['bytes not in UTF-8', new Uint8Array([0x3c, 0xff, 0xfe, 0x3e]), 'xml.encoding'],
  ])('gives a problem for %s, without throwing', (_, input, code) => {
    expect(validate(input)).toEqual({
      valid: false,
      problems: [{ code, path: '', message: expect.any(String), severity: 'error' }],
    });
  });
});
