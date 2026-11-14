import { describe, expect, test } from 'vitest';
import { BuildError, build, type FatturaElettronica, parse } from '../src/index.js';
import { official } from './helpers/fixtures.js';
import { firstLine, fpa12, fpr12 } from './helpers/invoices.js';
import { libxml2Verdict } from './helpers/oracle.js';
import { normalizeXml } from './helpers/xml.js';

/**
 * build without validation, checking that libxml2 finds what it writes valid for the XSD. These
 * tests are about writing, and the official examples break checks of the SdI: the P.IVA
 * 01234567890 has a wrong check digit (00300, 00301), FPR03 has ImponibileImporto off by 2 €.
 */
function checkedBuild(fattura: FatturaElettronica): string {
  const xml = build(fattura, { validate: false });
  expect(libxml2Verdict(xml)).toEqual({ valid: true, errors: [] });
  return xml;
}

// FPR02 is left out: it is not valid for the XSD (ContattiTrasmittente out of order).
const validExamples = [
  'IT01234567890_FPA01',
  'IT01234567890_FPA02',
  'IT01234567890_FPA03',
  'IT01234567890_FPR01',
  'IT01234567890_FPR03',
];

describe('round trip of the official examples', () => {
  test.each(validExamples)('parse(checkedBuild(parse(%s))) is parse of the original', (name) => {
    const fattura = parse(official(name));
    expect(parse(checkedBuild(fattura))).toEqual(fattura);
  });

  test.each(validExamples)('checkedBuild(parse(%s)) is the original, normalized', (name) => {
    const xml = official(name);
    // build never writes xsi:schemaLocation: the comparison is with the original without it.
    const withoutSchemaLocation = xml.replace(/\s+xsi:schemaLocation="[^"]*"/, '');
    expect(withoutSchemaLocation).not.toBe(xml);
    expect(normalizeXml(checkedBuild(parse(xml)))).toBe(normalizeXml(withoutSchemaLocation));
  });
});

describe('the document build writes', () => {
  const xml = checkedBuild(parse(official('IT01234567890_FPR01')));

  test('starts with the UTF-8 declaration and the p: root of the official examples', () => {
    expect(xml.split('\n').slice(0, 4)).toEqual([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      '  <FatturaElettronicaHeader>',
      '    <DatiTrasmissione>',
    ]);
  });

  test('has no xsi:schemaLocation', () => {
    expect(xml).not.toContain('schemaLocation');
  });

  test('indents by 2 spaces and ends with the root and a line break', () => {
    expect(xml).toContain('\n      <IdTrasmittente>\n        <IdPaese>IT</IdPaese>\n');
    expect(xml.endsWith('</FatturaElettronicaBody>\n</p:FatturaElettronica>\n')).toBe(true);
  });
});

describe('escaping', () => {
  const fpr01 = official('IT01234567890_FPR01');
  const withDescrizione = (content: string): string =>
    fpr01.replace(/<Descrizione>[^<]*<\/Descrizione>/, `<Descrizione>${content}</Descrizione>`);
  const descrizione = (xml: string): string | undefined =>
    parse(xml).FatturaElettronicaBody[0]?.DatiBeniServizi.DettaglioLinee[0]?.Descrizione;
  const withValue = (value: string) => {
    const fattura = parse(fpr01);
    const linea = fattura.FatturaElettronicaBody[0]?.DatiBeniServizi.DettaglioLinee[0];
    if (linea === undefined) throw new Error('No DettaglioLinee in FPR01');
    linea.Descrizione = value;
    return fattura;
  };

  test('escapes &, < and > in values and keeps quotes and accented letters', () => {
    const value = `A & B <C> "D" 'E' ÀÈÉÌÒÙ àèéìòù`;
    const xml = checkedBuild(withValue(value));
    expect(xml).toContain(`<Descrizione>A &amp; B &lt;C&gt; "D" 'E' ÀÈÉÌÒÙ àèéìòù</Descrizione>`);
    expect(descrizione(xml)).toBe(value);
  });

  test('never writes the end of a CDATA section', () => {
    const xml = checkedBuild(withValue('a]]>b'));
    expect(xml).toContain('<Descrizione>a]]&gt;b</Descrizione>');
    expect(descrizione(xml)).toBe('a]]>b');
  });

  test('keeps carriage returns, tabs and line breaks in values', () => {
    const value = 'riga 1\r\nriga 2\n\triga 3';
    expect(descrizione(checkedBuild(withValue(value)))).toBe(value);
  });

  test('escapes the root attributes', () => {
    const fattura = { ...parse(fpr01), SistemaEmittente: `G&"<1>` };
    expect(checkedBuild(fattura)).toContain(`SistemaEmittente="G&amp;&quot;&lt;1&gt;"`);
    expect(parse(checkedBuild(fattura)).SistemaEmittente).toBe(`G&"<1>`);
  });

  test('writes a CDATA read back as escaped text, with the same value', () => {
    const xml = withDescrizione('<![CDATA[A <B> & "C"]]> fine');
    const written = checkedBuild(parse(xml));
    expect(written).toContain('<Descrizione>A &lt;B&gt; &amp; "C" fine</Descrizione>');
    expect(parse(written)).toEqual(parse(xml));
  });
});

describe('signature', () => {
  const DS = 'http://www.w3.org/2000/09/xmldsig#';
  const XADES = 'http://uri.etsi.org/01903/v1.3.2#';
  const fpr01 = official('IT01234567890_FPR01');
  // The smallest SignedInfo the xmldsig schema accepts, so that libxml2 finds the file valid.
  const signedInfo = (prefix: string): string => {
    const p = prefix === '' ? '' : `${prefix}:`;
    return `<${p}SignedInfo><${p}CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><${p}SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><${p}Reference URI=""><${p}DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><${p}DigestValue>QUJD</${p}DigestValue></${p}Reference></${p}SignedInfo>`;
  };
  const signed = (signature: string, xml = fpr01): string =>
    xml.replace('</p:FatturaElettronica>', `  ${signature}\n</p:FatturaElettronica>`);
  const signature = (prefix: string): string =>
    `<${prefix}:Signature Id="sig-1">\r\n    ${signedInfo(prefix)}\r\n    <${prefix}:SignatureValue>QUJD&#xD;\nREVG</${prefix}:SignatureValue>\r\n    <${prefix}:Object><xades:QualifyingProperties Target="#sig-1"/></${prefix}:Object>\r\n  </${prefix}:Signature>`;
  // xmlns:ds is on the root, as in the official examples; xmlns:xades too, as some signers do.
  const withXades = (xml: string): string =>
    xml.replace('<p:FatturaElettronica ', `<p:FatturaElettronica xmlns:xades="${XADES}" `);

  test('writes a ds:Signature identical to the file', () => {
    const plain = `<ds:Signature Id="s">${signedInfo('ds')}<ds:SignatureValue>QUJD</ds:SignatureValue></ds:Signature>`;
    const xml = signed(plain);
    const written = checkedBuild(parse(xml));
    expect(written).toContain(`\n  ${plain}\n</p:FatturaElettronica>`);
    expect(parse(written)).toEqual(parse(xml));
    expect(normalizeXml(written)).toBe(
      normalizeXml(xml.replace(/\s+xsi:schemaLocation="[^"]*"/, '')),
    );
  });

  test('keeps a signature with line breaks, references and namespaces inherited from the root', () => {
    const xml = withXades(signed(signature('ds')));
    const written = checkedBuild(parse(xml));
    expect(parse(written)).toEqual(parse(xml));
    expect(normalizeXml(written)).toBe(
      normalizeXml(xml.replace(/\s+xsi:schemaLocation="[^"]*"/, '')),
    );
  });

  test('keeps a signature whose prefix is not ds:', () => {
    const xml = withXades(
      signed(signature('sig')).replace(`xmlns:ds="${DS}"`, `xmlns:sig="${DS}"`),
    );
    const written = checkedBuild(parse(xml));
    expect(written).toContain(
      `<sig:Signature xmlns:xades="${XADES}" xmlns:sig="${DS}" Id="sig-1">`,
    );
    expect(parse(written)).toEqual(parse(xml));
    expect(normalizeXml(written)).toBe(
      normalizeXml(xml.replace(/\s+xsi:schemaLocation="[^"]*"/, '')),
    );
  });

  test('keeps a signature that declares its own default namespace', () => {
    const own = `<Signature xmlns="${DS}">${signedInfo('')}<SignatureValue>QUJD</SignatureValue></Signature>`;
    const written = checkedBuild(parse(signed(own)));
    expect(written).toContain(`\n  ${own}\n`);
  });
});

describe('the shape of the object', () => {
  const fpr01 = parse(official('IT01234567890_FPR01'));
  const reversed = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(reversed);
    if (typeof value !== 'object' || value === null) return value;
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, child]) => [key, reversed(child)]),
    );
  };

  test('writes fields in XSD order, whatever the order of the keys', () => {
    expect(checkedBuild(reversed(fpr01) as typeof fpr01)).toBe(checkedBuild(fpr01));
  });

  test('writes an empty block as an empty element', () => {
    const fattura = parse(official('IT01234567890_FPR01'));
    fattura.FatturaElettronicaHeader.DatiTrasmissione.ContattiTrasmittente = {};
    expect(checkedBuild(fattura)).toContain('\n      <ContattiTrasmittente/>\n');
  });
});

describe('validation before writing', () => {
  const broken = (): FatturaElettronica => {
    const fattura = fpr12();
    const linea = firstLine(fattura);
    linea.AliquotaIVA = '101.00';
    linea.Descrizione = '';
    return fattura;
  };

  test('refuses an invalid invoice with a BuildError that lists only the errors', () => {
    let error: unknown;
    try {
      build(broken());
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(BuildError);
    expect(error).toBeInstanceOf(Error);
    const problems = (error as BuildError).problems;
    expect(problems.map((problem) => [problem.code, problem.path])).toEqual([
      ['xsd.pattern', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0].Descrizione'],
      ['xsd.range', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0].AliquotaIVA'],
      // No DatiRiepilogo at 101.00.
      ['sdi.00443', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0].AliquotaIVA'],
      ['sdi.00422', 'FatturaElettronicaBody[0].DatiBeniServizi.DatiRiepilogo'],
    ]);
    expect(problems.every((problem) => problem.severity === 'error')).toBe(true);
    expect((error as BuildError).name).toBe('BuildError');
    expect((error as BuildError).message).toMatch(/^La fattura ha 4 errori/);
  });

  test('writes an invalid invoice anyway with validate: false', () => {
    const xml = build(broken(), { validate: false });
    expect(xml).toContain('<AliquotaIVA>101.00</AliquotaIVA>');
    expect(libxml2Verdict(xml).valid).toBe(false);
  });

  test('writes a valid invoice, which libxml2 accepts', () => {
    expect(libxml2Verdict(build(fpr12())).valid).toBe(true);
    expect(libxml2Verdict(build(fpa12())).valid).toBe(true);
  });
});
