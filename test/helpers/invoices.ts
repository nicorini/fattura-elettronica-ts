// Small invoices built by hand, valid for the XSD and for the checks of the SdI: each test takes a
// fresh copy and breaks exactly what it is about.
import type {
  CedentePrestatore,
  CreateInvoiceInput,
  DettaglioLinee,
  FatturaElettronica,
  FatturaElettronicaBody,
} from '../../src/index.js';

// Check digits computed with the algorithm of DM 23/12/1976: P.IVA 01234567897 (not the
// 01234567890 of the official examples, whose check digit is wrong), CF RSSMRA80A01H501U, CF of a
// public body 80012345676.
const PIVA_CEDENTE = '01234567897';
const CF_PRIVATO = 'RSSMRA80A01H501U';
const CF_ENTE = '80012345676';

const cedente: CedentePrestatore = {
  DatiAnagrafici: {
    IdFiscaleIVA: { IdPaese: 'IT', IdCodice: PIVA_CEDENTE },
    Anagrafica: { Denominazione: 'ALPHA SRL' },
    RegimeFiscale: 'RF01',
  },
  Sede: { Indirizzo: 'VIA ROMA 1', CAP: '00100', Comune: 'ROMA', Provincia: 'RM', Nazione: 'IT' },
};

const body: FatturaElettronicaBody = {
  DatiGenerali: {
    DatiGeneraliDocumento: {
      TipoDocumento: 'TD01',
      Divisa: 'EUR',
      Data: '2025-01-15',
      Numero: '1',
      ImportoTotaleDocumento: '122.00',
    },
  },
  DatiBeniServizi: {
    DettaglioLinee: [
      {
        NumeroLinea: '1',
        Descrizione: 'Consulenza',
        Quantita: '2.00',
        PrezzoUnitario: '50.00',
        PrezzoTotale: '100.00',
        AliquotaIVA: '22.00',
      },
    ],
    DatiRiepilogo: [
      { AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00', EsigibilitaIVA: 'I' },
    ],
  },
};

const FPR12: FatturaElettronica = {
  versione: 'FPR12',
  FatturaElettronicaHeader: {
    DatiTrasmissione: {
      IdTrasmittente: { IdPaese: 'IT', IdCodice: PIVA_CEDENTE },
      ProgressivoInvio: '00001',
      FormatoTrasmissione: 'FPR12',
      CodiceDestinatario: 'ABC1234',
    },
    CedentePrestatore: cedente,
    CessionarioCommittente: {
      DatiAnagrafici: {
        CodiceFiscale: CF_PRIVATO,
        Anagrafica: { Nome: 'MARIO', Cognome: 'ROSSI' },
      },
      Sede: {
        Indirizzo: 'VIA MILANO 2',
        CAP: '20100',
        Comune: 'MILANO',
        Provincia: 'MI',
        Nazione: 'IT',
      },
    },
  },
  FatturaElettronicaBody: [body],
};

const FPA12: FatturaElettronica = {
  versione: 'FPA12',
  FatturaElettronicaHeader: {
    DatiTrasmissione: {
      IdTrasmittente: { IdPaese: 'IT', IdCodice: PIVA_CEDENTE },
      ProgressivoInvio: '00001',
      FormatoTrasmissione: 'FPA12',
      CodiceDestinatario: 'UFABCD',
    },
    CedentePrestatore: cedente,
    CessionarioCommittente: {
      DatiAnagrafici: {
        CodiceFiscale: CF_ENTE,
        Anagrafica: { Denominazione: 'COMUNE DI ROMA' },
      },
      Sede: {
        Indirizzo: 'PIAZZA DEL CAMPIDOGLIO 1',
        CAP: '00186',
        Comune: 'ROMA',
        Provincia: 'RM',
        Nazione: 'IT',
      },
    },
  },
  FatturaElettronicaBody: [body],
};

/**
 * A fresh FPR12 invoice (to a private person): one line of 2 × 50.00 at 22%, total 122.00,
 * dated 2025-01-15. Valid for the XSD and for the checks of the SdI.
 */
export function fpr12(): FatturaElettronica {
  return structuredClone(FPR12);
}

/**
 * A fresh FPA12 invoice (to a public body, office code `UFABCD`), with the same body as
 * {@link fpr12}. Valid for the XSD and for the checks of the SdI.
 */
export function fpa12(): FatturaElettronica {
  return structuredClone(FPA12);
}

/** The first body of `fattura`, to alter it in a test. */
export function firstBody(fattura: FatturaElettronica): FatturaElettronicaBody {
  const result = fattura.FatturaElettronicaBody[0];
  if (result === undefined) throw new Error('The invoice has no body');
  return result;
}

/** The first line of the first body of `fattura`, to alter it in a test. */
export function firstLine(fattura: FatturaElettronica): DettaglioLinee {
  const result = firstBody(fattura).DatiBeniServizi.DettaglioLinee[0];
  if (result === undefined) throw new Error('The invoice has no line');
  return result;
}

/**
 * The input of createInvoice that gives {@link fpr12}: the same invoice without the fields that
 * createInvoice computes.
 */
export function fpr12Input(): CreateInvoiceInput {
  const fattura: CreateInvoiceInput = fpr12();
  const body = fattura.FatturaElettronicaBody[0];
  if (body === undefined) throw new Error('The invoice has no body');
  delete body.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento;
  delete body.DatiBeniServizi.DatiRiepilogo;
  for (const linea of body.DatiBeniServizi.DettaglioLinee) delete linea.PrezzoTotale;
  return fattura;
}
