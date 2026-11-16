// The checks of the smoke test, shared by every runtime: each one brings the bytes of an official
// example its own way (file, fetch, embedded module).
import { build, createInvoice, parse, validate } from 'fattura-elettronica-ts';

const piva = '01234567897';

// A small invoice from its lines: createInvoice computes PrezzoTotale, the summary and the total.
const input = {
  versione: 'FPR12',
  FatturaElettronicaHeader: {
    DatiTrasmissione: {
      IdTrasmittente: { IdPaese: 'IT', IdCodice: piva },
      ProgressivoInvio: '00001',
      FormatoTrasmissione: 'FPR12',
      CodiceDestinatario: '0000000',
    },
    CedentePrestatore: {
      DatiAnagrafici: {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: piva },
        Anagrafica: { Denominazione: 'ALPHA SRL' },
        RegimeFiscale: 'RF01',
      },
      Sede: { Indirizzo: 'VIA ROMA 1', CAP: '00100', Comune: 'ROMA', Nazione: 'IT' },
    },
    CessionarioCommittente: {
      DatiAnagrafici: {
        CodiceFiscale: 'RSSMRA80A01H501U',
        Anagrafica: { Nome: 'MARIO', Cognome: 'ROSSI' },
      },
      Sede: { Indirizzo: 'VIA MILANO 2', CAP: '20100', Comune: 'MILANO', Nazione: 'IT' },
    },
  },
  FatturaElettronicaBody: [
    {
      DatiGenerali: {
        DatiGeneraliDocumento: {
          TipoDocumento: 'TD01',
          Divisa: 'EUR',
          Data: '2025-01-15',
          Numero: '1',
        },
      },
      DatiBeniServizi: {
        DettaglioLinee: [
          {
            NumeroLinea: '1',
            Descrizione: 'Consulenza',
            Quantita: 2,
            PrezzoUnitario: 50,
            AliquotaIVA: 22,
          },
        ],
      },
    },
  ],
};

/**
 * Reads and validates an official example with the published package, then creates, builds and
 * validates an invoice; throws if anything is off.
 * @param {Uint8Array} xml
 * @returns {string}
 */
export function smoke(xml) {
  const fattura = parse(xml);
  if (fattura.versione !== 'FPR12') throw new Error(`Read versione ${fattura.versione}`);

  const { problems } = validate(xml);
  const structural = problems.filter((problem) => problem.code.startsWith('xsd.'));
  if (structural.length > 0) {
    throw new Error(`Problems of structure: ${JSON.stringify(structural)}`);
  }
  // The official examples have a P.IVA with a wrong check digit: the checks of the SdI ran.
  if (!problems.some((problem) => problem.code === 'sdi.00301')) {
    throw new Error(`The checks of the SdI did not run: ${JSON.stringify(problems)}`);
  }

  const created = createInvoice(input);
  const total = created.FatturaElettronicaBody[0]?.DatiGenerali.DatiGeneraliDocumento;
  if (total?.ImportoTotaleDocumento !== '122.00') {
    throw new Error(`createInvoice computed a total of ${total?.ImportoTotaleDocumento}`);
  }
  const xmlCreated = build(created);
  const roundTrip = validate(xmlCreated).problems.filter((problem) => problem.severity === 'error');
  if (roundTrip.length > 0) {
    throw new Error(`The created invoice has errors: ${JSON.stringify(roundTrip)}`);
  }

  return `parse, validate, createInvoice and build work (${problems.length} problems, as expected).`;
}
