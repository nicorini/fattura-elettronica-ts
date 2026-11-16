// The checks of the SdI on the header, the parties and the document. Each rule has an invoice that
// respects it and one that breaks exactly that rule, with its source next to the test.
//
// Sources, as the comments name them (pages are the printed ones):
// - Elenco controlli SdI 2.0: Elenco dei controlli effettuati sul file fattura del Sistema di
//   Interscambio, versione 2.0 (31/01/2025),
//   https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf
// - Allegato A 1.9.1: Allegato A, Specifiche tecniche, versione 1.9.1 (31/03/2026),
//   https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1
// - Specifiche SdI 1.8.4: Specifiche tecniche del Sistema di Interscambio, versione 1.8.4
//   (31/03/2026),
//   https://www.fatturapa.gov.it/export/documenti/Specifiche-tecniche-relative-al-Sistema-di-Interscambio-versione-1.8.4.pdf
// - Specifiche del formato 1.4: Specifiche tecniche operative del formato FatturaPA, versione 1.4
//   (31/01/2025),
//   https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Specifiche_tecniche_del_formato_FatturaPA_V1.4.pdf
// - Rappresentazione tabellare: Rappresentazione tabellare del tracciato fattura ordinaria,
//   https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/RappresentazioneTabellareFattOrdinaria-1.pdf
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BuildError, build, type FatturaElettronica, validate } from '../src/index.js';
import { official } from './helpers/fixtures.js';
import { firstBody, fpa12, fpr12 } from './helpers/invoices.js';

const TRASMISSIONE = 'FatturaElettronicaHeader.DatiTrasmissione';
const CESSIONARIO = 'FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici';
const DOCUMENTO = 'FatturaElettronicaBody[0].DatiGenerali.DatiGeneraliDocumento';

/** Code, path and severity of the problems of `fattura`, the parts a rule fixes. */
function problemsOf(fattura: FatturaElettronica, today?: string) {
  const options = today === undefined ? undefined : { today };
  return validate(fattura, options).problems.map(({ code, path, severity }) => ({
    code,
    path,
    severity,
  }));
}

const error = (code: string, path: string) => ({ code: `sdi.${code}`, path, severity: 'error' });

describe('00428: FormatoTrasmissione must match versione', () => {
  // "IF (FormatoTrasm != versione) ERRORE (00428)" (Elenco controlli SdI 2.0, p. 34; also
  // Allegato A 1.9.1, p. 117).
  test('an FPR12 invoice with FormatoTrasmissione FPA12 is an error', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.FormatoTrasmissione = 'FPA12';
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'UFABCD';
    expect(problemsOf(fattura)).toEqual([error('00428', `${TRASMISSIONE}.FormatoTrasmissione`)]);
  });

  test('the error carries its SdI code and source', () => {
    const fattura = fpa12();
    fattura.versione = 'FPR12';
    expect(validate(fattura).problems).toEqual([
      {
        code: 'sdi.00428',
        sdiCode: '00428',
        path: `${TRASMISSIONE}.FormatoTrasmissione`,
        message: expect.any(String),
        severity: 'error',
        source: 'Elenco controlli SdI 2.0, p. 34',
      },
    ]);
  });
});

describe('00427: the length of CodiceDestinatario must fit the format', () => {
  // "1.1.4 <CodiceDestinatario> di 7 caratteri a fronte di 1.1.3 <FormatoTrasmissione> con valore
  // "FPA12" o 1.1.4 <CodiceDestinatario> di 6 caratteri a fronte di 1.1.3 <FormatoTrasmissione>
  // con valore "FPR12"" (Elenco controlli SdI 2.0, p. 33; also Allegato A 1.9.1, p. 117).
  test('an FPA12 invoice with a code of 7 characters is an error', () => {
    const fattura = fpa12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'ABC1234';
    expect(problemsOf(fattura)).toEqual([error('00427', `${TRASMISSIONE}.CodiceDestinatario`)]);
  });

  test('an FPR12 invoice with a code of 6 characters is an error', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'UFABCD';
    expect(problemsOf(fattura)).toEqual([error('00427', `${TRASMISSIONE}.CodiceDestinatario`)]);
  });

  test('FPA12 with 6 characters and FPR12 with 7 are valid', () => {
    expect(problemsOf(fpa12())).toEqual([]);
    expect(problemsOf(fpr12())).toEqual([]);
  });
});

/** An FPR12 invoice to a company of San Marino (IdFiscaleIVA SM, no codice fiscale). */
function toSanMarino(): FatturaElettronica {
  const fattura = fpr12();
  fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici = {
    IdFiscaleIVA: { IdPaese: 'SM', IdCodice: '12345' },
    Anagrafica: { Denominazione: 'BETA SPA' },
  };
  return fattura;
}

describe('00313: XXXXXXX only for a foreign customer (FPR12)', () => {
  // With 'XXXXXXX' "il sistema controlla che il campo IdPaese del cessionario/committente
  // contenga un valore diverso da "IT": diversamente il file viene scartato con codice errore
  // 00313" (Allegato A 1.9.1, p. 31); "1.4.1.1 <IdFiscaleIVA> deve essere valorizzato e 1.4.1.1.1
  // <IdPaese> deve essere diverso da "IT"" (p. 121). Only in the Allegato A.
  test('XXXXXXX to an Italian customer with only a codice fiscale is an error', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'XXXXXXX';
    expect(problemsOf(fattura)).toEqual([error('00313', `${TRASMISSIONE}.CodiceDestinatario`)]);
  });

  test('XXXXXXX to an Italian customer with a P.IVA is an error', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'XXXXXXX';
    fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA = {
      IdPaese: 'IT',
      IdCodice: '02876990587',
    };
    expect(problemsOf(fattura)).toEqual([error('00313', `${TRASMISSIONE}.CodiceDestinatario`)]);
  });

  test('XXXXXXX to a customer of San Marino is valid', () => {
    const fattura = toSanMarino();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'XXXXXXX';
    expect(problemsOf(fattura)).toEqual([]);
  });

  test('does not apply to FPA12', () => {
    // FPA12 with 7 characters is 00427 already; 00313 is not added.
    const fattura = fpa12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'XXXXXXX';
    expect(problemsOf(fattura)).toEqual([error('00427', `${TRASMISSIONE}.CodiceDestinatario`)]);
  });
});

/** `fattura` with the PEC `pec` and CodiceDestinatario 0000000. */
function withPec(fattura: FatturaElettronica, pec: string, codice = '0000000'): FatturaElettronica {
  fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = codice;
  fattura.FatturaElettronicaHeader.DatiTrasmissione.PECDestinatario = pec;
  return fattura;
}

const PEC = `${TRASMISSIONE}.PECDestinatario`;

describe('00330: no PEC of the SdI itself (FPR12)', () => {
  // "Non sono ammessi indirizzi PEC corrispondenti alle caselle di funzionamento del Sistema di
  // Interscambio (sdixx@pec.fatturapa.it); diversamente il file viene scartato con codice errore
  // 00330" (Allegato A 1.9.1, p. 32; also p. 122). Only in the Allegato A.
  test('a mailbox sdi<number>@pec.fatturapa.it is an error', () => {
    expect(problemsOf(withPec(fpr12(), 'sdi01@pec.fatturapa.it'))).toEqual([error('00330', PEC)]);
  });

  test('the check ignores case and spaces around the address', () => {
    // EmailType collapses whitespace; the domain of an address ignores case.
    expect(problemsOf(withPec(fpr12(), ' SDI27@PEC.FatturaPA.it '))).toEqual([error('00330', PEC)]);
  });

  test('another address of pec.fatturapa.it is a warning', () => {
    // The form of the mailboxes beyond "sdixx" is not written anywhere: in doubt, a warning.
    expect(problemsOf(withPec(fpr12(), 'assistenza@pec.fatturapa.it'))).toEqual([
      { code: 'sdi.00330.warn', path: PEC, severity: 'warning' },
    ]);
  });

  test('a PEC of another domain is valid, even with a numeric domain', () => {
    // FatturaElettronica.NET#440: a PEC with a numeric domain is valid for the XSD.
    expect(problemsOf(withPec(fpr12(), 'fatture@pec.alpha.it'))).toEqual([]);
    expect(problemsOf(withPec(fpr12(), 'fatture@123.it'))).toEqual([]);
  });

  test('a PEC with a comma breaks the XSD pattern, and nothing else', () => {
    // FatturaElettronica.NET#439: two addresses separated by a comma.
    expect(problemsOf(withPec(fpr12(), 'a@pec.it,b@pec.it'))).toEqual([
      { code: 'xsd.pattern', path: PEC, severity: 'error' },
    ]);
  });
});

describe('warn.pecDestinatario: the PEC only with 0000000 and never to the PA', () => {
  // PECDestinatario "viene valorizzato nei soli casi di destinatario diverso da Pubblica
  // Amministrazione [...]. Può essere valorizzato solo se il valore di CodiceDestinatario è uguale
  // a '0000000'" (Specifiche del formato 1.4, p. 10). No SdI code: a warning.
  const warning = { code: 'warn.pecDestinatario', path: PEC, severity: 'warning' };

  test('a PEC with CodiceDestinatario other than 0000000 is a warning', () => {
    expect(problemsOf(withPec(fpr12(), 'fatture@pec.alpha.it', 'ABC1234'))).toEqual([warning]);
  });

  test('a PEC in an FPA12 invoice is a warning', () => {
    expect(problemsOf(withPec(fpa12(), 'fatture@pec.comune.it', 'UFABCD'))).toEqual([warning]);
  });

  test('a PEC with 0000000 in an FPR12 invoice is valid', () => {
    expect(problemsOf(withPec(fpr12(), 'fatture@pec.alpha.it'))).toEqual([]);
  });

  test('a PEC of the SdI in FPA12 is only the warning: 00330 is for FPR12', () => {
    expect(problemsOf(withPec(fpa12(), 'sdi01@pec.fatturapa.it', 'UFABCD'))).toEqual([warning]);
  });
});

describe('00403: Data not after today', () => {
  // "IF (DataFattura > DataRicezione) ERRORE (00403)", with DataRicezione "data in cui il file è
  // ricevuto dal Sistema di Interscambio" (Elenco controlli SdI 2.0, p. 11; also Allegato A 1.9.1,
  // p. 115). Offline, the date of receipt is the option `today`, or today in Italy.
  afterEach(() => {
    vi.useRealTimers();
  });

  test('a date after the option today is an error', () => {
    expect(problemsOf(fpr12(), '2025-01-14')).toEqual([error('00403', `${DOCUMENTO}.Data`)]);
  });

  test('a date equal to today is valid', () => {
    expect(problemsOf(fpr12(), '2025-01-15')).toEqual([]);
  });

  test('build takes the same option', () => {
    expect(() => build(fpr12(), { today: '2025-01-14' })).toThrow(BuildError);
    expect(() => build(fpr12(), { today: '2025-01-15' })).not.toThrow();
  });

  test.each(['2025-1-14', '2025-02-30', '14/01/2025', '2025-01-14T00:00:00'])(
    'an option today %s that is not a date is an error of validate, which does not throw',
    (today) => {
      const result = validate(fpr12(), { today });
      expect(result.valid).toBe(false);
      expect(result.problems).toEqual([
        {
          code: 'option.today',
          path: '',
          message: `L'opzione today (${today}) non è una data AAAA-MM-GG: il controllo sulla data della fattura (00403) non è stato fatto.`,
          severity: 'error',
        },
      ]);
    },
  );

  test('build stops on an option today that is not a date', () => {
    expect(() => build(fpr12(), { today: '2025-02-30' })).toThrow(BuildError);
  });

  test('by default today is the date in Rome, not in UTC', () => {
    // 23:30 UTC of 14 January is 00:30 of 15 January in Rome (UTC+1 in winter).
    vi.useFakeTimers({ now: new Date('2025-01-14T23:30:00Z') });
    expect(problemsOf(fpr12())).toEqual([]);
    vi.setSystemTime(new Date('2025-01-14T22:30:00Z'));
    expect(problemsOf(fpr12())).toEqual([error('00403', `${DOCUMENTO}.Data`)]);
  });
});

/** `fattura` with a second body, a copy of the first with `changes` to DatiGeneraliDocumento. */
function withSecondBody(
  fattura: FatturaElettronica,
  changes: Partial<
    FatturaElettronica['FatturaElettronicaBody'][number]['DatiGenerali']['DatiGeneraliDocumento']
  >,
): FatturaElettronica {
  const second = structuredClone(firstBody(fattura));
  Object.assign(second.DatiGenerali.DatiGeneraliDocumento, changes);
  fattura.FatturaElettronicaBody.push(second);
  return fattura;
}

const NUMERO_SECONDO = 'FatturaElettronicaBody[1].DatiGenerali.DatiGeneraliDocumento.Numero';

describe('00409: the same number twice in a batch', () => {
  // "IF ( NumeroFattura di Fn == NumeroFattura di F && AnnoFattura di Fn == AnnoFattura di F &&
  // TipoDocumento di Fn != "TD04" && TipoDocumento di F != "TD04" ) ERRORE (00409)", with
  // DataFattura in place of AnnoFattura when F has Art73 SI, and two TD04 compared with each
  // other (Elenco controlli SdI 2.0, pp. 15-16; also Allegato A 1.9.1, p. 123, and Specifiche SdI
  // 1.8.4, p. 33).
  test('two invoices with the same number in the same year are an error', () => {
    const fattura = withSecondBody(fpr12(), { Data: '2025-03-01' });
    expect(problemsOf(fattura)).toEqual([error('00409', NUMERO_SECONDO)]);
  });

  test('the same number in different years, or different numbers, are valid', () => {
    expect(problemsOf(withSecondBody(fpr12(), { Data: '2024-12-31' }))).toEqual([]);
    expect(problemsOf(withSecondBody(fpr12(), { Numero: '2' }))).toEqual([]);
  });

  test('an invoice and a credit note (TD04) may share the number', () => {
    expect(problemsOf(withSecondBody(fpr12(), { TipoDocumento: 'TD04' }))).toEqual([]);
  });

  test('two credit notes with the same number are an error', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.TipoDocumento = 'TD04';
    expect(problemsOf(withSecondBody(fattura, {}))).toEqual([error('00409', NUMERO_SECONDO)]);
  });

  test('with Art73 SI on both, the same number on different dates is valid', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.Art73 = 'SI';
    expect(problemsOf(withSecondBody(fattura, { Data: '2025-01-16' }))).toEqual([]);
    expect(problemsOf(withSecondBody(fpr12(), {}))).toEqual([error('00409', NUMERO_SECONDO)]);
  });

  test('with Art73 SI on only one, the same year is enough for the error', () => {
    const fattura = withSecondBody(fpr12(), { Data: '2025-01-16', Art73: 'SI' });
    expect(problemsOf(fattura)).toEqual([error('00409', NUMERO_SECONDO)]);
  });
});

describe('00417: the customer needs a P.IVA or a codice fiscale', () => {
  // "IF ( non esiste IdFiscaleIVA && non esiste CodiceFiscale ) ERRORE (00417)" (Elenco controlli
  // SdI 2.0, p. 20; also Allegato A 1.9.1, pp. 37, 115). The case of php-fatturapa#106: valid for
  // the XSD, refused by the SdI.
  test('a customer with neither is an error', () => {
    const fattura = fpr12();
    delete fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.CodiceFiscale;
    expect(problemsOf(fattura)).toEqual([error('00417', CESSIONARIO)]);
  });

  test('a customer with only a P.IVA is valid', () => {
    const fattura = fpr12();
    const anagrafici = fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici;
    delete anagrafici.CodiceFiscale;
    anagrafici.IdFiscaleIVA = { IdPaese: 'IT', IdCodice: '02876990587' };
    expect(problemsOf(fattura)).toEqual([]);
  });
});

describe('00418: Data not before the date of the linked invoice', () => {
  // "IF ( TipoDoc == "TD04" ) IF ( DataNC < DataFattColl ) ERRORE (00418)" (Elenco controlli
  // SdI 2.0, p. 21). For every type the date of the linked invoice "Non può essere mai successiva
  // alla data del documento in oggetto; in caso contrario il file viene scartato con codice errore
  // 00418" (Allegato A 1.9.1, p. 46). Common part (TD04) an error, the rest a warning.
  const COLLEGATA = 'FatturaElettronicaBody[0].DatiGenerali.DatiFattureCollegate[0].Data';

  function linkedTo(tipo: 'TD01' | 'TD04', data: string): FatturaElettronica {
    const fattura = fpr12();
    const generali = firstBody(fattura).DatiGenerali;
    generali.DatiGeneraliDocumento.TipoDocumento = tipo;
    generali.DatiFattureCollegate = [{ IdDocumento: '7', Data: data }];
    return fattura;
  }

  test('a credit note dated before the invoice it corrects is an error', () => {
    expect(problemsOf(linkedTo('TD04', '2025-01-16'))).toEqual([error('00418', COLLEGATA)]);
  });

  test('another type dated before the linked invoice is a warning', () => {
    expect(problemsOf(linkedTo('TD01', '2025-01-16'))).toEqual([
      { code: 'sdi.00418.warn', path: COLLEGATA, severity: 'warning' },
    ]);
  });

  test('a linked invoice of the same day or before is valid', () => {
    expect(problemsOf(linkedTo('TD04', '2025-01-15'))).toEqual([]);
    expect(problemsOf(linkedTo('TD01', '2024-12-31'))).toEqual([]);
  });
});

describe('00425: Numero must contain a digit', () => {
  // "IF ( Numero non contiene ValoreNum ) ERRORE (00425)", ValoreNum "carattere numerico da 0 a 9"
  // (Elenco controlli SdI 2.0, p. 32; also Allegato A 1.9.1, p. 117).
  test('a number without digits is an error', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.Numero = 'FT/A';
    expect(problemsOf(fattura)).toEqual([error('00425', `${DOCUMENTO}.Numero`)]);
  });

  test('a number with at least one digit is valid', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.Numero = 'FT/A1';
    expect(problemsOf(fattura)).toEqual([]);
  });
});

const PIVA_CEDENTE = '01234567897';
const PIVA_CLIENTE = '02876990587';
const TIPO = `${DOCUMENTO}.TipoDocumento`;

/**
 * An FPR12 invoice of type `tipo` from a supplier of `paese` to a company with a P.IVA: the shape
 * of self-invoices and integrations (TD16-TD29), sent by the customer.
 */
function selfInvoice(
  tipo: FatturaElettronica['FatturaElettronicaBody'][number]['DatiGenerali']['DatiGeneraliDocumento']['TipoDocumento'],
  paese = 'FR',
  codice = paese === 'IT' ? PIVA_CEDENTE : '12345678901',
): FatturaElettronica {
  const fattura = fpr12();
  const header = fattura.FatturaElettronicaHeader;
  header.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA = { IdPaese: paese, IdCodice: codice };
  header.CessionarioCommittente.DatiAnagrafici = {
    IdFiscaleIVA: { IdPaese: 'IT', IdCodice: PIVA_CLIENTE },
    Anagrafica: { Denominazione: 'GAMMA SRL' },
  };
  firstBody(fattura).DatiGenerali.DatiGeneraliDocumento.TipoDocumento = tipo;
  return fattura;
}

/** `selfInvoice` with the same P.IVA for supplier and customer. */
function sameParty(tipo: Parameters<typeof selfInvoice>[0]): FatturaElettronica {
  return selfInvoice(tipo, 'IT', PIVA_CLIENTE);
}

describe('00471: supplier and customer must differ for some types', () => {
  // "IF ( TipoDocumento == TD16 OR [...] TD17 OR [...] TD18 OR [...] TD19 OR [...] TD20 OR [...]
  // TD29 ) IF ( IDCedente == IDCessionarioIVA ) ERRORE (00471)"; "Nei casi in cui in fattura sia
  // presente il solo IDCessionarioCF per il cessionario, si risale all' IDCessionarioPIVA
  // attraverso interrogazione di Anagrafe Tributaria" (Elenco controlli SdI 2.0, p. 40). The
  // Allegato A 1.9.1, p. 119, lists also "TD01, TD02, TD03, TD06 [...] TD24, TD25, TD28": a
  // warning for those.
  test.each(['TD16', 'TD20', 'TD29'] as const)('%s with the same P.IVA is an error', (tipo) => {
    expect(problemsOf(sameParty(tipo))).toEqual([error('00471', TIPO)]);
  });

  test.each(['TD01', 'TD24'] as const)('%s with the same P.IVA is a warning', (tipo) => {
    expect(problemsOf(sameParty(tipo))).toEqual([
      { code: 'sdi.00471.warn', path: TIPO, severity: 'warning' },
    ]);
  });

  test('TD16 with two different P.IVA is valid', () => {
    expect(problemsOf(selfInvoice('TD16', 'IT'))).toEqual([]);
  });

  test('a sole trader billing himself by codice fiscale is not judged offline', () => {
    // FatturaElettronica.NET#378, #386: the P.IVA of a sole trader and his personal codice
    // fiscale are different numbers; only the Anagrafe tributaria knows they are one person.
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.CodiceFiscale =
      'RSSMRA80A01H501U';
    expect(problemsOf(fattura)).toEqual([]);
  });
});

describe('00472: supplier and customer must be the same for TD21 and TD27', () => {
  // "IF ( TipoDocumento == TD21 ) IF ( IDCedente != IDCessionarioIVA ) ERRORE (00472)" (Elenco
  // controlli SdI 2.0, p. 41). The Allegato A 1.9.1, p. 119: "i tipi documento TD21 e TD27 non
  // ammettono l'indicazione in fattura di un cedente diverso dal cessionario": a warning for TD27.
  test('TD21 with two different P.IVA is an error', () => {
    expect(problemsOf(selfInvoice('TD21', 'IT'))).toEqual([error('00472', TIPO)]);
  });

  test('TD27 with two different P.IVA is a warning', () => {
    expect(problemsOf(selfInvoice('TD27', 'IT'))).toEqual([
      { code: 'sdi.00472.warn', path: TIPO, severity: 'warning' },
    ]);
  });

  test('TD21 and TD27 with the same P.IVA are valid', () => {
    expect(problemsOf(sameParty('TD21'))).toEqual([]);
    expect(problemsOf(sameParty('TD27'))).toEqual([]);
  });

  test('TD21 to a customer with only a codice fiscale is not judged offline', () => {
    const fattura = sameParty('TD21');
    fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici = {
      CodiceFiscale: 'RSSMRA80A01H501U',
      Anagrafica: { Nome: 'MARIO', Cognome: 'ROSSI' },
    };
    expect(problemsOf(fattura)).toEqual([]);
  });
});

describe('00473: the country of the supplier must fit the type', () => {
  // "IF ( TipoDocumento == TD17 OR [...] TD18 OR [...] TD19 OR [...] TD28 ) IF ( IDPaeseCedente
  // == IT ) ERRORE (00473)" and "IF ( TipoDocumento == TD29 ) IF ( IDPaeseCedente != IT ) ERRORE
  // (00473)" (Elenco controlli SdI 2.0, p. 42). "Nei casi di TD17 e TD19 è ammessa l'indicazione
  // del valore 'OO' nell'elemento 1.2.1.1.1 <IdPaese> per operazioni effettuate da soggetti
  // residenti in Livigno e Campione d'Italia" (Allegato A 1.9.1, p. 119).
  test.each(['TD17', 'TD18', 'TD19', 'TD28'] as const)(
    '%s from an Italian supplier is an error',
    (tipo) => {
      expect(problemsOf(selfInvoice(tipo, 'IT'))).toEqual([error('00473', TIPO)]);
    },
  );

  test('TD29 from a foreign supplier is an error', () => {
    expect(problemsOf(selfInvoice('TD29', 'FR'))).toEqual([error('00473', TIPO)]);
  });

  test('TD29 from an Italian supplier is valid', () => {
    expect(problemsOf(selfInvoice('TD29', 'IT'))).toEqual([]);
  });

  test.each(['TD17', 'TD19'] as const)('%s from Livigno or Campione (OO) is valid', (tipo) => {
    // FatturaElettronica.NET#374.
    expect(problemsOf(selfInvoice(tipo, 'OO'))).toEqual([]);
  });

  test.each(['TD18', 'TD28'] as const)('%s from OO is a warning', (tipo) => {
    // The Elenco controlli (p. 42) and the Allegato A (p. 32: "Se vale IT, il sistema verifica che
    // il TipoDocumento sia diverso da TD17, TD18, TD19 e TD28") check only IT. The Allegato A
    // allows 'OO' only "Nei casi di TD17 e TD19" (p. 119), and the help desk of the SdI wrote that
    // "In tutti gli altri casi di utilizzo di 'OO' e tipo documento diverso da TD17 e TD19 i file
    // vengono scartati" (https://github.com/FatturaElettronica/FatturaElettronica.NET/issues/370):
    // a warning.
    expect(validate(selfInvoice(tipo, 'OO')).problems).toEqual([
      {
        code: 'sdi.00473.warn',
        path: TIPO,
        message: expect.stringContaining('OO'),
        severity: 'warning',
        source: 'Allegato A, Specifiche tecniche 1.9.1, p. 119',
      },
    ]);
  });

  test('TD29 from OO is an error: TD29 wants IT', () => {
    // "IF ( TipoDocumento == TD29 ) IF ( IDPaeseCedente != IT ) ERRORE (00473)" (Elenco controlli
    // SdI 2.0, p. 42).
    expect(problemsOf(selfInvoice('TD29', 'OO'))).toEqual([error('00473', TIPO)]);
  });

  test('TD28 from San Marino is valid', () => {
    // FatturaElettronica.NET#370: purchases from San Marino with a paper invoice.
    expect(problemsOf(selfInvoice('TD28', 'SM'))).toEqual([]);
  });

  test('TD28 from a French supplier is valid', () => {
    // TD28 also for the invoice "con addebito dell'imposta in rivalsa dal fornitore non stabilito,
    // ancorché identificato in Italia" (Allegato A 1.9.1, p. 110), with "<CedentePrestatore>: dati
    // identificativi del C/P estero" (§3.2.4.2, p. 111,
    // https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1;
    // the same in the Guida alla compilazione 1.9, pp. 30-31,
    // https://www.agenziaentrate.gov.it/portale/documents/20143/451259/Guida_compilazione-FE-Esterometro-V1.9_2024-03-05.pdf/67fe4c2d-1174-e8de-f1ee-cea77b7f5203).
    // 00473 checks only IT (Elenco controlli SdI 2.0, p. 42,
    // https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
    expect(problemsOf(selfInvoice('TD28', 'FR'))).toEqual([]);
  });

  test('TD17 from Greece (EL) and TD18 from Northern Ireland (XI) are valid', () => {
    // FatturaElettronica.NET#314, #409: EL and XI are the VAT prefixes, not ISO codes.
    expect(problemsOf(selfInvoice('TD17', 'EL'))).toEqual([]);
    expect(problemsOf(selfInvoice('TD18', 'XI'))).toEqual([]);
  });
});

describe('00474: no line at zero rate in TD21', () => {
  // "IF (TipoDocumento == TD21) Per ogni BloccoDettaglioLinee IF ( AliquotaIVA == 0.00 ) ERRORE
  // (00474)" (Elenco controlli SdI 2.0, p. 43; also Allegato A 1.9.1, p. 119).
  /** `fattura` with its only line at zero rate, nature N2.2, and its totals to match. */
  function atZeroRate(fattura: FatturaElettronica): FatturaElettronica {
    const body = firstBody(fattura);
    Object.assign(body.DatiBeniServizi.DettaglioLinee[0] ?? {}, {
      AliquotaIVA: '0.00',
      Natura: 'N2.2',
    });
    body.DatiBeniServizi.DatiRiepilogo = [
      {
        AliquotaIVA: '0.00',
        Natura: 'N2.2',
        ImponibileImporto: '100.00',
        Imposta: '0.00',
        RiferimentoNormativo: 'Art. 1, c. 54-89, L. 190/2014',
      },
    ];
    body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = '100.00';
    return fattura;
  }

  test('TD21 with a line at zero rate is an error', () => {
    expect(problemsOf(atZeroRate(sameParty('TD21')))).toEqual([
      error('00474', 'FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[0].AliquotaIVA'),
    ]);
  });

  test('another type with a line at zero rate is valid', () => {
    expect(problemsOf(atZeroRate(fpr12()))).toEqual([]);
  });
});

describe('00475: some types need the P.IVA of the customer', () => {
  // "IF ( TipoDocumento == TD16 OR [...] TD17 OR [...] TD18 OR [...] TD19 OR [...] TD20 OR [...]
  // TD22 OR [...] TD23 OR [...] TD28 OR [...] TD29) IF ( non esiste IDCessionarioPIVA ) ERRORE
  // (00475)" (Elenco controlli SdI 2.0, p. 44; also Allegato A 1.9.1, pp. 37, 119).
  test.each(['TD16', 'TD22', 'TD29'] as const)(
    '%s to a customer without P.IVA is an error',
    (tipo) => {
      const fattura = selfInvoice(tipo, 'IT');
      fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici = {
        CodiceFiscale: 'RSSMRA80A01H501U',
        Anagrafica: { Nome: 'MARIO', Cognome: 'ROSSI' },
      };
      expect(problemsOf(fattura)).toEqual([error('00475', TIPO)]);
    },
  );

  test('TD01 to a customer without P.IVA is valid', () => {
    expect(problemsOf(fpr12())).toEqual([]);
  });
});

describe('00476: supplier and customer can not both be foreign', () => {
  // "IF ( IDPaeseCedente != IT && IDPaeseCessionario != IT ) ERRORE (00476)", both read from
  // IdFiscaleIVA/IdPaese (Elenco controlli SdI 2.0, p. 45; also Allegato A 1.9.1, pp. 32, 37,
  // 120).
  const PAESE_CLIENTE = `${CESSIONARIO}.IdFiscaleIVA.IdPaese`;

  test('a French supplier and a customer of San Marino are an error', () => {
    const fattura = toSanMarino();
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA = {
      IdPaese: 'FR',
      IdCodice: '12345678901',
    };
    expect(problemsOf(fattura)).toEqual([error('00476', PAESE_CLIENTE)]);
  });

  test('a foreign supplier and a customer with only a codice fiscale is valid', () => {
    // The check compares IdFiscaleIVA/IdPaese: without that block it does not apply.
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA = {
      IdPaese: 'FR',
      IdCodice: '12345678901',
    };
    expect(problemsOf(fattura)).toEqual([]);
  });
});

// P.IVA and codice fiscale. The SdI checks "la validità dei codici fiscali e delle partite IVA,
// relative ai soggetti trasmittente, cedente/prestatore, rappresentante fiscale,
// cessionario/committente, attraverso una verifica di presenza nell'anagrafe tributaria" (Elenco
// controlli SdI 2.0, p. 7; also Specifiche SdI 1.8.4, p. 32, and Allegato A 1.9.1, pp. 31-38).
// Offline the library checks the part that rules out existence: the form
// and the check character of DM Finanze 23/12/1976, art. 6 (omocodia), art. 7 (check letter of
// the 16 characters), artt. 8-9 (11 digits and their check digit), as republished in GU n. 72
// of 27/03/1995, S.O. n. 35:
// https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.progressivo=0&art.idArticolo=1&art.versione=1&art.codiceRedazionale=095A1743&art.dataPubblicazioneGazzetta=1995-03-27&art.idGruppo=0&art.idSottoArticolo1=10&art.idSottoArticolo=1&art.flagTipoArticolo=1
//
// Valid values: 02876990587 is the P.IVA of the examples of the Agenzia (Specifiche tecniche
// della dichiarazione IVA 2004, field formats); RSSMRA80A01H501U the usual codice fiscale of
// MARIO ROSSI; RSSMRA80A01H50MM the same with omocodia on the last digit (1 → M, check letter
// computed again); RSSMRA80A99H501Y has an impossible day but the right check letter, which art.
// 10 allows for provisional codes; 80012345676 a numeric codice fiscale. Each wrong value is off
// by one unit in its check character.
const PIVA_VALIDA = '02876990587';
const PIVA_SBAGLIATA = '02876990588';
const CF_VALIDO = 'RSSMRA80A01H501U';
const CF_SBAGLIATO = 'RSSMRA80A01H501V';
const CF_OMOCODICO = 'RSSMRA80A01H50MM';
const CF_PROVVISORIO = 'RSSMRA80A99H501Y';
const CF_NUMERICO = '80012345676';
const CF_NUMERICO_SBAGLIATO = '80012345677';

describe('00300: IdTrasmittente is a codice fiscale', () => {
  // "Codice 00300 1.1.1.2 <IdCodice> non valido" (Elenco controlli SdI 2.0, p. 7; also Allegato
  // A 1.9.1, p. 31). IdCodice is the "numero di identificazione fiscale del trasmittente (per i
  // soggetti stabiliti nel territorio dello Stato Italiano corrisponde al Codice Fiscale [...])"
  // (Specifiche del formato 1.4, p. 9): 11 digits or 16 characters.
  const ID = `${TRASMISSIONE}.IdTrasmittente.IdCodice`;

  function sentBy(idCodice: string, idPaese = 'IT'): FatturaElettronica {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.IdTrasmittente = {
      IdPaese: idPaese,
      IdCodice: idCodice,
    };
    return fattura;
  }

  test.each([PIVA_VALIDA, CF_VALIDO, CF_OMOCODICO, CF_NUMERICO])('%s is valid', (codice) => {
    expect(problemsOf(sentBy(codice))).toEqual([]);
  });

  test.each([PIVA_SBAGLIATA, CF_SBAGLIATO, `IT${PIVA_VALIDA}`, 'RSSMRA80A01H5'])(
    '%s is an error',
    (codice) => {
      expect(problemsOf(sentBy(codice))).toEqual([error('00300', ID)]);
    },
  );

  test('a valid codice fiscale in lower case is a warning', () => {
    // The XSD has no pattern on IdCodice; whether the SdI finds a lower-case code in the Anagrafe
    // is not written: warning.
    expect(problemsOf(sentBy(CF_VALIDO.toLowerCase()))).toEqual([
      { code: 'warn.idTrasmittenteMinuscolo', path: ID, severity: 'warning' },
    ]);
  });

  test('a foreign sender is not checked', () => {
    // "il controllo non è effettuato per gli identificativi fiscali assegnati da autorità estere"
    // (Elenco controlli SdI 2.0, p. 7).
    expect(problemsOf(sentBy('ABC', 'FR'))).toEqual([]);
  });
});

/** Every party with a P.IVA checked by the SdI: where it goes in the invoice and its code. */
const partiteIva: {
  readonly party: string;
  readonly code: string;
  readonly path: string;
  readonly set: (fattura: FatturaElettronica, idCodice: string) => void;
}[] = [
  {
    // "Codice 00301 1.2.1.1.2 <IdCodice> non valido" (Elenco controlli SdI 2.0, p. 7; also
    // Allegato A 1.9.1, p. 32).
    party: 'the supplier',
    code: '00301',
    path: 'FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice',
    set: (fattura, idCodice) => {
      fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice =
        idCodice;
    },
  },
  {
    // "Codice 00303 1.3.1.1.2 <IdCodice> o 1.4.4.1.2 <IdCodice> non valido" (Elenco controlli
    // SdI 2.0, p. 8; also Allegato A 1.9.1, p. 36).
    party: 'the tax representative of the supplier',
    code: '00303',
    path: 'FatturaElettronicaHeader.RappresentanteFiscale.DatiAnagrafici.IdFiscaleIVA.IdCodice',
    set: (fattura, idCodice) => {
      fattura.FatturaElettronicaHeader.RappresentanteFiscale = {
        DatiAnagrafici: {
          IdFiscaleIVA: { IdPaese: 'IT', IdCodice: idCodice },
          Anagrafica: { Denominazione: 'DELTA SRL' },
        },
      };
    },
  },
  {
    // "Codice 00303 1.3.1.1.2 <IdCodice> o 1.4.4.1.2 <IdCodice> non valido" (Elenco controlli
    // SdI 2.0, p. 8; also Allegato A 1.9.1, p. 121).
    party: 'the tax representative of the customer',
    code: '00303',
    path: 'FatturaElettronicaHeader.CessionarioCommittente.RappresentanteFiscale.IdFiscaleIVA.IdCodice',
    set: (fattura, idCodice) => {
      fattura.FatturaElettronicaHeader.CessionarioCommittente.RappresentanteFiscale = {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: idCodice },
        Denominazione: 'DELTA SRL',
      };
    },
  },
  {
    // "Codice 00305 1.4.1.1.2 <IdCodice> non valido" (Elenco controlli SdI 2.0, p. 8; also
    // Allegato A 1.9.1, pp. 37-38).
    party: 'the customer',
    code: '00305',
    path: `${CESSIONARIO}.IdFiscaleIVA.IdCodice`,
    set: (fattura, idCodice) => {
      fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA = {
        IdPaese: 'IT',
        IdCodice: idCodice,
      };
    },
  },
];

describe.each(partiteIva)('$code: the P.IVA of $party', ({ code, path, set }) => {
  // A P.IVA is 11 digits with the check digit of art. 9: never a codice fiscale of 16, never with
  // the prefix IT (Specifiche del formato 1.4, pp. 10, 14: the block holds "la partita IVA
  // italiana").
  const withPartitaIva = (idCodice: string) => {
    const fattura = fpr12();
    set(fattura, idCodice);
    return fattura;
  };

  test('a valid P.IVA is valid', () => {
    expect(problemsOf(withPartitaIva(PIVA_VALIDA))).toEqual([]);
  });

  test.each([PIVA_SBAGLIATA, `IT${PIVA_VALIDA}`, CF_VALIDO, '2876990587'])(
    '%s is an error',
    (idCodice) => {
      expect(problemsOf(withPartitaIva(idCodice))).toEqual([error(code, path)]);
    },
  );

  test('the message speaks of the P.IVA in good Italian', () => {
    const [problem] = validate(withPartitaIva(PIVA_SBAGLIATA)).problems;
    expect(problem?.message).toMatch(/^La partita IVA \d{11} non è valida: /);
  });
});

/** Every party with a codice fiscale checked by the SdI. */
const codiciFiscali: {
  readonly party: string;
  readonly code: string;
  readonly path: string;
  readonly set: (fattura: FatturaElettronica, codiceFiscale: string) => void;
}[] = [
  {
    // "Codice 00302 1.2.1.2 <CodiceFiscale> non valido" (Elenco controlli SdI 2.0, p. 7; also
    // Allegato A 1.9.1, p. 33, and Specifiche SdI 1.8.4, p. 32).
    party: 'the supplier',
    code: '00302',
    path: 'FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.CodiceFiscale',
    set: (fattura, codiceFiscale) => {
      fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.CodiceFiscale =
        codiceFiscale;
    },
  },
  {
    // "Codice 00304 1.3.1.2 <CodiceFiscale> non valido" (Elenco controlli SdI 2.0, p. 8; also
    // Allegato A 1.9.1, p. 36, and Specifiche SdI 1.8.4, p. 32).
    party: 'the tax representative of the supplier',
    code: '00304',
    path: 'FatturaElettronicaHeader.RappresentanteFiscale.DatiAnagrafici.CodiceFiscale',
    set: (fattura, codiceFiscale) => {
      fattura.FatturaElettronicaHeader.RappresentanteFiscale = {
        DatiAnagrafici: {
          IdFiscaleIVA: { IdPaese: 'IT', IdCodice: PIVA_VALIDA },
          CodiceFiscale: codiceFiscale,
          Anagrafica: { Denominazione: 'DELTA SRL' },
        },
      };
    },
  },
  {
    // "Codice 00306 1.4.1.2 <CodiceFiscale> non valido" (Elenco controlli SdI 2.0, p. 8; also
    // Allegato A 1.9.1, p. 38).
    party: 'the customer',
    code: '00306',
    path: `${CESSIONARIO}.CodiceFiscale`,
    set: (fattura, codiceFiscale) => {
      fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.CodiceFiscale =
        codiceFiscale;
    },
  },
];

describe.each(codiciFiscali)('$code: the codice fiscale of $party', ({ code, path, set }) => {
  // DM 23/12/1976: 16 characters (artt. 2-7, with omocodia) or 11 digits (artt. 8-9). The XSD
  // allows 11 to 16 characters [A-Z0-9]; 12 to 15 are no codice fiscale.
  const withCodiceFiscale = (codiceFiscale: string) => {
    const fattura = fpr12();
    set(fattura, codiceFiscale);
    return fattura;
  };

  test.each([CF_VALIDO, CF_OMOCODICO, CF_PROVVISORIO, CF_NUMERICO])('%s is valid', (cf) => {
    expect(problemsOf(withCodiceFiscale(cf))).toEqual([]);
  });

  test.each([
    CF_SBAGLIATO,
    CF_NUMERICO_SBAGLIATO,
    'RSSMRA80A01H5',
    'RSSMRA80A01',
    '1SSMRA80A01H501M',
    'RSSMRA80A01HXMMT',
  ])('%s is an error', (cf) => {
    expect(problemsOf(withCodiceFiscale(cf))).toEqual([error(code, path)]);
  });

  test('a codice fiscale in lower case breaks the XSD pattern, and nothing else', () => {
    // FatturaElettronica.NET#373: the pattern [A-Z0-9]{11,16} already refuses it (00200).
    expect(problemsOf(withCodiceFiscale(CF_VALIDO.toLowerCase()))).toEqual([
      { code: 'xsd.pattern', path, severity: 'error' },
    ]);
  });
});

describe('00306 when the customer has also an IdFiscaleIVA', () => {
  // 00306 "vale solo se non è stato valorizzato rispettivamente l'elemento 1.4.1.1.2 <IdCodice>
  // [...] vale a dire la partita IVA del cessionario/committente" (Allegato A 1.9.1, p. 121). On
  // 1.4.1.2 <CodiceFiscale>: "Se valorizzato ed è pure valorizzato l'elemento informativo 1.4.1.1
  // <IdFiscaleIVA> viene controllato che siano coerenti" (Rappresentazione tabellare, p. 3), that
  // is 00324, which needs the Anagrafe tributaria.
  test('a wrong codice fiscale next to an IdFiscaleIVA is a warning', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.IdFiscaleIVA = {
      IdPaese: 'IT',
      IdCodice: PIVA_VALIDA,
    };
    fattura.FatturaElettronicaHeader.CessionarioCommittente.DatiAnagrafici.CodiceFiscale =
      CF_SBAGLIATO;
    expect(validate(fattura).problems).toEqual([
      {
        code: 'sdi.00306.warn',
        path: `${CESSIONARIO}.CodiceFiscale`,
        message: expect.stringContaining('00324'),
        severity: 'warning',
        source: 'Allegato A, Specifiche tecniche 1.9.1, p. 121; DM Finanze 23/12/1976, artt. 6-9',
      },
    ]);
  });
});

describe('warn.partitaIva and warn.codiceFiscale: parties the SdI does not check', () => {
  // The SdI checks the codes of "soggetti trasmittente, cedente/prestatore, rappresentante
  // fiscale, cessionario/committente" (Elenco controlli SdI 2.0, p. 7). For the third party, the
  // carrier and CFQuietanzante a wrong code is a warning: warn.partitaIva for IdFiscaleIVA,
  // warn.codiceFiscale for a codice fiscale.
  const warning = (path: string) => ({ code: 'warn.codiceFiscale', path, severity: 'warning' });
  const partitaIva = (path: string) => ({ code: 'warn.partitaIva', path, severity: 'warning' });

  test('a wrong codice fiscale or P.IVA of the third party is a warning', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.TerzoIntermediarioOSoggettoEmittente = {
      DatiAnagrafici: {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: PIVA_SBAGLIATA },
        CodiceFiscale: CF_SBAGLIATO,
        Anagrafica: { Denominazione: 'EPSILON SRL' },
      },
    };
    const terzo = 'FatturaElettronicaHeader.TerzoIntermediarioOSoggettoEmittente.DatiAnagrafici';
    expect(problemsOf(fattura)).toEqual([
      partitaIva(`${terzo}.IdFiscaleIVA.IdCodice`),
      warning(`${terzo}.CodiceFiscale`),
    ]);
  });

  test('a wrong P.IVA or codice fiscale of the carrier is a warning', () => {
    const fattura = fpr12();
    firstBody(fattura).DatiGenerali.DatiTrasporto = {
      DatiAnagraficiVettore: {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: PIVA_SBAGLIATA },
        CodiceFiscale: CF_NUMERICO_SBAGLIATO,
        Anagrafica: { Denominazione: 'ZETA SRL' },
      },
    };
    const vettore = 'FatturaElettronicaBody[0].DatiGenerali.DatiTrasporto.DatiAnagraficiVettore';
    expect(problemsOf(fattura)).toEqual([
      partitaIva(`${vettore}.IdFiscaleIVA.IdCodice`),
      warning(`${vettore}.CodiceFiscale`),
    ]);
  });

  test('a wrong CFQuietanzante is a warning, a valid one is valid', () => {
    const withQuietanzante = (cf: string) => {
      const fattura = fpr12();
      firstBody(fattura).DatiPagamento = [
        {
          CondizioniPagamento: 'TP02',
          DettaglioPagamento: [
            { ModalitaPagamento: 'MP01', ImportoPagamento: '122.00', CFQuietanzante: cf },
          ],
        },
      ];
      return fattura;
    };
    expect(problemsOf(withQuietanzante(CF_OMOCODICO))).toEqual([]);
    expect(problemsOf(withQuietanzante(CF_SBAGLIATO))).toEqual([
      warning('FatturaElettronicaBody[0].DatiPagamento[0].DettaglioPagamento[0].CFQuietanzante'),
    ]);
  });

  test('valid codes of the third party and the carrier are valid', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.TerzoIntermediarioOSoggettoEmittente = {
      DatiAnagrafici: {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: PIVA_VALIDA },
        CodiceFiscale: CF_NUMERICO,
        Anagrafica: { Denominazione: 'EPSILON SRL' },
      },
    };
    firstBody(fattura).DatiGenerali.DatiTrasporto = {
      DatiAnagraficiVettore: {
        IdFiscaleIVA: { IdPaese: 'DE', IdCodice: '123456789' },
        CodiceFiscale: CF_PROVVISORIO,
        Anagrafica: { Denominazione: 'ZETA GMBH' },
      },
    };
    expect(problemsOf(fattura)).toEqual([]);
  });
});

describe('the official examples', () => {
  test('have made-up codes with wrong check digits, which the SdI would refuse', () => {
    // P.IVA 01234567890 (check digit 7, not 0) for sender and supplier, codice fiscale
    // 09876543210 (check digit 7, not 0) for the customer, P.IVA 24681012141 (check digit 2, not
    // 1) for the carrier.
    const codes = validate(official('IT01234567890_FPR01')).problems.map(({ code }) => code);
    expect(codes).toEqual(['sdi.00300', 'sdi.00301', 'sdi.00306', 'warn.partitaIva']);
  });
});

describe('every problem of the SdI', () => {
  test('cites its source', () => {
    const fattura = withSecondBody(sameParty('TD16'), { Numero: 'A', Data: '2030-01-01' });
    const header = fattura.FatturaElettronicaHeader;
    withPec(fattura, 'sdi01@pec.fatturapa.it', 'ABC123');
    header.DatiTrasmissione.IdTrasmittente.IdCodice = PIVA_SBAGLIATA;
    header.CessionarioCommittente.DatiAnagrafici.CodiceFiscale = CF_SBAGLIATO;
    firstBody(fattura).DatiGenerali.DatiFattureCollegate = [
      { IdDocumento: '7', Data: '2025-02-01' },
    ];
    const problems = validate(fattura, { today: '2025-06-30' }).problems;
    const codes = problems.map(({ code }) => code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'sdi.00300',
        'sdi.00306.warn',
        'sdi.00330',
        'sdi.00403',
        'sdi.00418.warn',
      ]),
    );
    expect(codes).toEqual(expect.arrayContaining(['sdi.00425', 'sdi.00427', 'sdi.00471']));
    for (const problem of problems.filter(({ code }) => code.startsWith('sdi.'))) {
      expect(problem.source, problem.code).toMatch(/^(?:Elenco controlli|Allegato A)/);
    }
  });
});
