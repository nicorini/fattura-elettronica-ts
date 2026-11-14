import { describe, expect, test } from 'vitest';
import { type Anagrafica, type FatturaElettronica, ParseError, parse } from '../src/index.js';
import { official, officialBytes, officialExamples } from './helpers/fixtures.js';
import { objectLeaves, xmlLeaves } from './helpers/leaves.js';

test('reads an official example into the model', () => {
  const fattura = parse(official('IT01234567890_FPA01'));

  expect(fattura.versione).toBe('FPA12');
  const { DatiTrasmissione, CedentePrestatore } = fattura.FatturaElettronicaHeader;
  expect(DatiTrasmissione).toEqual({
    IdTrasmittente: { IdPaese: 'IT', IdCodice: '01234567890' },
    ProgressivoInvio: '00001',
    FormatoTrasmissione: 'FPA12',
    CodiceDestinatario: 'AAAAAA',
  });
  expect(CedentePrestatore.DatiAnagrafici.Anagrafica).toEqual({ Denominazione: 'ALPHA SRL' });

  expect(fattura.FatturaElettronicaBody).toHaveLength(1);
  const [body] = fattura.FatturaElettronicaBody;
  expect(body?.DatiGenerali.DatiGeneraliDocumento.Causale).toHaveLength(2);
  expect(body?.DatiBeniServizi.DettaglioLinee).toEqual([
    {
      NumeroLinea: '1',
      Descrizione: 'DESCRIZIONE DELLA FORNITURA',
      Quantita: '5.00',
      PrezzoUnitario: '1.00',
      PrezzoTotale: '5.00',
      AliquotaIVA: '22.00',
    },
  ]);
  expect(body?.DatiPagamento?.[0]?.DettaglioPagamento[0]?.ImportoPagamento).toBe('6.10');
});

test.each(officialExamples)('reads %s without losing data', (name) => {
  const xml = official(name);
  const leaves = xmlLeaves(xml);
  expect(leaves.length).toBeGreaterThan(50);
  expect(objectLeaves(parse(xml))).toEqual(leaves);
});

test('reads bytes the same as text', () => {
  const name = 'IT01234567890_FPR01';
  expect(parse(officialBytes(name))).toEqual(parse(official(name)));
});

test('reads every body of a batch, in order', () => {
  const fattura = parse(official('IT01234567890_FPA03'));
  expect(
    fattura.FatturaElettronicaBody.map((body) => body.DatiGenerali.DatiGeneraliDocumento.Numero),
  ).toEqual(['12', '456']);
});

describe('encodings', () => {
  const buyer = (fattura: FatturaElettronica): Anagrafica =>
    fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.Anagrafica;
  const accented = (encoding: string): string =>
    official('IT01234567890_FPR01')
      .replace(/^<\?xml[^>]*\?>/, `<?xml version="1.0" encoding="${encoding}"?>`)
      .replace('DITTA BETA', 'CAFFÈ ÀÉ PERCHÉ');
  // One byte per character: Latin-1, plus € at 0x80 as in windows-1252.
  const singleByte = (text: string): Uint8Array =>
    Uint8Array.from(text, (char) => (char === '€' ? 0x80 : char.charCodeAt(0)));

  test('reads windows-1252 bytes, € included', () => {
    const xml = accented('windows-1252').replace('CAFFÈ', 'CAFFÈ €');
    expect(buyer(parse(singleByte(xml)))).toEqual({ Denominazione: 'CAFFÈ € ÀÉ PERCHÉ' });
  });

  test('reads ISO-8859-1 bytes', () => {
    expect(buyer(parse(singleByte(accented('ISO-8859-1'))))).toEqual({
      Denominazione: 'CAFFÈ ÀÉ PERCHÉ',
    });
  });

  test('reads UTF-8 bytes with and without BOM, and a declaration in lowercase', () => {
    const bytes = new TextEncoder().encode(accented('utf-8'));
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]);
    expect(buyer(parse(bytes))).toEqual({ Denominazione: 'CAFFÈ ÀÉ PERCHÉ' });
    expect(buyer(parse(withBom))).toEqual({ Denominazione: 'CAFFÈ ÀÉ PERCHÉ' });
  });

  test('reads UTF-8 bytes without an XML declaration', () => {
    const xml = accented('UTF-8').replace(/^<\?xml[^>]*\?>/, '');
    expect(buyer(parse(new TextEncoder().encode(xml)))).toEqual({
      Denominazione: 'CAFFÈ ÀÉ PERCHÉ',
    });
  });

  test('reads a string with a BOM', () => {
    expect(buyer(parse(`﻿${accented('UTF-8')}`))).toEqual({
      Denominazione: 'CAFFÈ ÀÉ PERCHÉ',
    });
  });

  test('refuses an unsupported encoding', () => {
    const bytes = singleByte(accented('ISO-8859-15'));
    expect(() => parse(bytes)).toThrow(expect.objectContaining({ code: 'xml.encoding' }));
  });

  test('refuses UTF-16', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x3c, 0x00]);
    expect(() => parse(bytes)).toThrow(expect.objectContaining({ code: 'xml.encoding' }));
  });

  test('refuses bytes that are not valid in the declared UTF-8', () => {
    const bytes = singleByte(accented('UTF-8'));
    expect(() => parse(bytes)).toThrow(ParseError);
    expect(() => parse(bytes)).toThrow(expect.objectContaining({ code: 'xml.encoding' }));
  });
});

describe('namespaces', () => {
  const NS = 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2';
  const fpr01 = official('IT01234567890_FPR01');
  const expected = parse(fpr01);
  const withPrefix = (prefix: string): string =>
    fpr01
      .replaceAll('p:FatturaElettronica', `${prefix}FatturaElettronica`)
      .replace(
        `xmlns:p="${NS}"`,
        prefix === '' ? `xmlns="${NS}"` : `xmlns:${prefix.slice(0, -1)}="${NS}"`,
      );

  test.each(['ns2:', 'ns3:', 'fattura:'])('reads the root with the %s prefix', (prefix) => {
    expect(parse(withPrefix(prefix))).toEqual(expected);
  });

  test('reads a root without prefix, whose default xmlns qualifies the children too', () => {
    const xml = withPrefix('');
    expect(xml).toMatch(/^<\?xml[^>]*\?>\s*<FatturaElettronica /);
    expect(parse(xml)).toEqual(expected);
  });

  test('reads children qualified with a prefix', () => {
    const xml = fpr01.replace(
      /<DatiTrasmissione>([\s\S]*)<\/DatiTrasmissione>/,
      '<p:DatiTrasmissione>$1</p:DatiTrasmissione>',
    );
    expect(parse(xml)).toEqual(expected);
  });
});

describe('what parse keeps and what it drops', () => {
  const fpr01 = official('IT01234567890_FPR01');
  const descrizione = (xml: string): string | undefined =>
    parse(xml).FatturaElettronicaBody[0]?.DatiBeniServizi.DettaglioLinee[0]?.Descrizione;
  const withDescrizione = (content: string): string =>
    fpr01.replace(/<Descrizione>[^<]*<\/Descrizione>/, `<Descrizione>${content}</Descrizione>`);

  test('keeps the signature as the exact raw XML', () => {
    const signature =
      '<ds:Signature Id="sig-1">\n    <ds:SignedInfo><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></ds:SignedInfo>\n    <ds:SignatureValue>QUJD&#xD;\nREVG</ds:SignatureValue>\n  </ds:Signature>';
    const xml = fpr01.replace('</p:FatturaElettronica>', `  ${signature}\n</p:FatturaElettronica>`);
    expect(parse(xml).Signature).toBe(signature);
  });

  test('reads CDATA as text and decodes entities', () => {
    expect(descrizione(withDescrizione('<![CDATA[A <B> & C]]> &amp; D &#233; &lt;E&gt;'))).toBe(
      'A <B> & C & D é <E>',
    );
  });

  test('keeps the spaces inside values', () => {
    expect(descrizione(withDescrizione('  DUE  SPAZI  '))).toBe('  DUE  SPAZI  ');
  });

  test('drops comments and processing instructions', () => {
    const xml = withDescrizione('PRIMA<!-- nota -->DOPO<?pi dati?>FINE').replace(
      '<FatturaElettronicaHeader>',
      '<!-- commento --><?pi dati?><FatturaElettronicaHeader>',
    );
    expect(parse(xml)).toEqual(parse(withDescrizione('PRIMADOPOFINE')));
  });

  test('ignores unknown elements', () => {
    const xml = fpr01
      .replace(
        '<FatturaElettronicaHeader>',
        '<FatturaElettronicaHeader><Sconosciuto>X</Sconosciuto>',
      )
      .replace('</DatiTrasmissione>', '<Extra><Y>1</Y></Extra></DatiTrasmissione>');
    expect(parse(xml)).toEqual(parse(fpr01));
  });

  test('keeps prices with 8 decimals as written', () => {
    const xml = fpr01.replace(
      /<PrezzoUnitario>[^<]*<\/PrezzoUnitario>/,
      '<PrezzoUnitario>1.12345678</PrezzoUnitario>',
    );
    expect(
      parse(xml).FatturaElettronicaBody[0]?.DatiBeniServizi.DettaglioLinee[0]?.PrezzoUnitario,
    ).toBe('1.12345678');
  });
});

describe('earlier versions of the XSD', () => {
  const fpr01 = official('IT01234567890_FPR01');

  // RegimeFiscaleType lists RF03 in XSD 1.2 and no longer in XSD 1.2.1:
  // https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd
  // https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.2.1/Schema_del_file_xml_FatturaPA_versione_1.2.1.xsd
  test('reads a 1.2 file with RF03 as it is', () => {
    const xml = fpr01.replace(
      '<RegimeFiscale>RF19</RegimeFiscale>',
      '<RegimeFiscale>RF03</RegimeFiscale>',
    );
    const fattura = parse(xml);
    expect(fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.RegimeFiscale).toBe(
      'RF03',
    );
    expect(objectLeaves(fattura)).toEqual(xmlLeaves(xml));
  });

  // XSD 1.2.1 added the SistemaEmittente attribute, made DatiRitenuta repeatable and added TD16–TD27
  // (same links).
  test('reads a 1.2.1 file without losing data', () => {
    const ritenuta = (tipo: string): string =>
      `<DatiRitenuta><TipoRitenuta>${tipo}</TipoRitenuta><ImportoRitenuta>1.00</ImportoRitenuta><AliquotaRitenuta>20.00</AliquotaRitenuta><CausalePagamento>A</CausalePagamento></DatiRitenuta>`;
    const xml = fpr01
      .replace('versione="FPR12"', 'versione="FPR12" SistemaEmittente="GEST-1"')
      .replace('<TipoDocumento>TD01</TipoDocumento>', '<TipoDocumento>TD17</TipoDocumento>')
      .replace(/(<Numero>[^<]*<\/Numero>)/, `$1${ritenuta('RT01')}${ritenuta('RT04')}`);
    const fattura = parse(xml);
    expect(fattura.SistemaEmittente).toBe('GEST-1');
    const documento = fattura.FatturaElettronicaBody[0]?.DatiGenerali.DatiGeneraliDocumento;
    expect(documento?.TipoDocumento).toBe('TD17');
    expect(documento?.DatiRitenuta?.map((r) => r.TipoRitenuta)).toEqual(['RT01', 'RT04']);
    expect(objectLeaves(fattura)).toEqual(xmlLeaves(xml));
  });
});

describe('ParseError', () => {
  const fpr01 = official('IT01234567890_FPR01');
  const thrown = (input: string | Uint8Array): ParseError => {
    try {
      parse(input);
    } catch (error) {
      if (error instanceof ParseError) return error;
      throw error;
    }
    throw new Error('parse did not throw');
  };

  test('xml.malformed, with line and column', () => {
    // Column 6 is where the wrong end tag </B> starts.
    const error = thrown('<?xml version="1.0"?>\n<p:FatturaElettronica>\n  <A></B>\n');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ParseError');
    expect(error).toMatchObject({ code: 'xml.malformed', line: 3, column: 6 });
    expect(error.message).toMatch(/riga 3, colonna 6/);
  });

  test('xml.malformed for an empty input', () => {
    expect(thrown('')).toMatchObject({ code: 'xml.malformed' });
  });

  test.each([
    ['another root', '<Fattura versione="FPR12"/>'],
    ['the root in no namespace', '<FatturaElettronica versione="FPR12"/>'],
    [
      'the root in another namespace',
      '<p:FatturaElettronica xmlns:p="http://example.com/v1.2" versione="FPR12"/>',
    ],
    ['an unknown versione', fpr01.replace('versione="FPR12"', 'versione="FPR13"')],
    ['no versione', fpr01.replace('versione="FPR12"', '')],
  ])('xml.notFatturaPA for %s', (_, xml) => {
    const error = thrown(xml);
    expect(error.code).toBe('xml.notFatturaPA');
    expect(error.line).toBeUndefined();
  });

  test.each([
    [
      'a plain DOCTYPE',
      fpr01.replace('<p:FatturaElettronica', '<!DOCTYPE x>\n<p:FatturaElettronica'),
    ],
    [
      'an entity declared and used (billion laughs)',
      fpr01
        .replace(
          '<p:FatturaElettronica',
          '<!DOCTYPE x [<!ENTITY a "aaaa">]>\n<p:FatturaElettronica',
        )
        .replace('DITTA BETA', '&a;'),
    ],
    [
      'an external entity (XXE)',
      fpr01
        .replace(
          '<p:FatturaElettronica',
          '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>\n<p:FatturaElettronica',
        )
        .replace('DITTA BETA', '&e;'),
    ],
  ])('xml.doctype for %s', (_, xml) => {
    expect(thrown(xml).code).toBe('xml.doctype');
  });

  test('messages are in Italian', () => {
    expect(thrown('<Fattura/>').message).toMatch(/non è una FatturaPA/);
  });
});
