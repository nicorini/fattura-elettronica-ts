import type { SdiErrorCode } from '../../codes.js';
import type { Problem } from '../../problem.js';
import { block, blocks, bodies, HEADER, TRASMISSIONE, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { libraryWarning, sdiError, sdiWarning } from '../rule.js';
import { ALLEGATO_A, ELENCO_CONTROLLI, source } from '../sources.js';
import { codiceFiscaleFault, partitaIvaFault } from './check-digits.js';

const DM_1976 = 'DM Finanze 23/12/1976, artt. 6-9';

/**
 * 00300-00306: the SdI rejects a P.IVA or codice fiscale that is not in the Anagrafe tributaria.
 * Offline, the library rejects those whose form or check character makes them impossible
 * (check-digits.ts). A value that breaks the XSD (length of IdCodice, pattern of CodiceFiscale)
 * is already 00200 and is not judged again. The third party, the carrier and CFQuietanzante are
 * not checked by the SdI: a warning there. So is the customer's codice fiscale next to an
 * IdFiscaleIVA.
 */
export const rule00300to00306: SdiRule = (fattura) => {
  const header = block(fattura.FatturaElettronicaHeader);
  const cedente = block(block(header?.CedentePrestatore)?.DatiAnagrafici);
  const rappresentante = block(block(header?.RappresentanteFiscale)?.DatiAnagrafici);
  const cessionario = block(header?.CessionarioCommittente);
  const terzo = block(block(header?.TerzoIntermediarioOSoggettoEmittente)?.DatiAnagrafici);
  const problems: Problem[] = [...trasmittente(fattura)];
  const error = (code: SdiErrorCode, page: number) => (path: string, fault: string) =>
    sdiError(code, path, fault, `${source(ELENCO_CONTROLLI, page)}; ${DM_1976}`);
  const warning =
    (code: 'warn.partitaIva' | 'warn.codiceFiscale') => (path: string, fault: string) =>
      libraryWarning(code, path, fault, { source: DM_1976 });

  const piva = [
    [cedente?.IdFiscaleIVA, `${HEADER}.CedentePrestatore.DatiAnagrafici`, error('00301', 7)],
    [
      rappresentante?.IdFiscaleIVA,
      `${HEADER}.RappresentanteFiscale.DatiAnagrafici`,
      error('00303', 8),
    ],
    [
      block(cessionario?.RappresentanteFiscale)?.IdFiscaleIVA,
      `${HEADER}.CessionarioCommittente.RappresentanteFiscale`,
      error('00303', 8),
    ],
    [
      block(cessionario?.DatiAnagrafici)?.IdFiscaleIVA,
      `${HEADER}.CessionarioCommittente.DatiAnagrafici`,
      error('00305', 8),
    ],
    [
      terzo?.IdFiscaleIVA,
      `${HEADER}.TerzoIntermediarioOSoggettoEmittente.DatiAnagrafici`,
      warning('warn.partitaIva'),
    ],
  ] as const;
  const cf = [
    [cedente?.CodiceFiscale, `${HEADER}.CedentePrestatore.DatiAnagrafici`, error('00302', 7)],
    [
      rappresentante?.CodiceFiscale,
      `${HEADER}.RappresentanteFiscale.DatiAnagrafici`,
      error('00304', 8),
    ],
    [
      block(cessionario?.DatiAnagrafici)?.CodiceFiscale,
      `${HEADER}.CessionarioCommittente.DatiAnagrafici`,
      block(cessionario?.DatiAnagrafici)?.IdFiscaleIVA === undefined
        ? error('00306', 8)
        : warning00306,
    ],
    [
      terzo?.CodiceFiscale,
      `${HEADER}.TerzoIntermediarioOSoggettoEmittente.DatiAnagrafici`,
      warning('warn.codiceFiscale'),
    ],
  ] as const;
  for (const { block: body, path } of bodies(fattura)) {
    const vettore = block(block(block(body.DatiGenerali)?.DatiTrasporto)?.DatiAnagraficiVettore);
    const where = `${path}.DatiGenerali.DatiTrasporto.DatiAnagraficiVettore`;
    problems.push(...checkPartitaIva(vettore?.IdFiscaleIVA, where, warning('warn.partitaIva')));
    problems.push(
      ...checkCodiceFiscale(
        vettore?.CodiceFiscale,
        `${where}.CodiceFiscale`,
        warning('warn.codiceFiscale'),
      ),
    );
    const pagamenti = blocks(body.DatiPagamento, `${path}.DatiPagamento`);
    for (const { block: pagamento, path: pagamentoPath } of pagamenti) {
      const dettagli = blocks(pagamento.DettaglioPagamento, `${pagamentoPath}.DettaglioPagamento`);
      for (const { block: dettaglio, path: dettaglioPath } of dettagli) {
        const value = text(dettaglio.CFQuietanzante);
        // CodiceFiscalePFType: 16 characters [A-Z0-9], a person.
        if (value === undefined || !/^[A-Z0-9]{16}$/.test(value)) continue;
        const fault = codiceFiscaleFault(value);
        const at = `${dettaglioPath}.CFQuietanzante`;
        if (fault !== undefined)
          problems.push(warning('warn.codiceFiscale')(at, message('CFQuietanzante', value, fault)));
      }
    }
  }
  for (const [id, parent, report] of piva) problems.push(...checkPartitaIva(id, parent, report));
  for (const [value, parent, report] of cf) {
    problems.push(...checkCodiceFiscale(value, `${parent}.CodiceFiscale`, report));
  }
  return problems;
};

type Report = (path: string, fault: string) => Problem;

/**
 * 00306 is only for a customer without IdFiscaleIVA (Allegato A, p. 121); with one, the SdI
 * checks that the two codes are of the same party (00324), which needs the Anagrafe tributaria.
 */
const warning00306: Report = (path, fault) =>
  sdiWarning(
    '00306',
    path,
    `${fault} Con l'IdFiscaleIVA il SdI non fa il controllo 00306 ma verifica che codice fiscale e partita IVA siano dello stesso soggetto (00324): potrebbe scartare la fattura.`,
    `${source(ALLEGATO_A, 121)}; ${DM_1976}`,
  );

// Only Italian codes: "il controllo non è effettuato per gli identificativi fiscali assegnati da
// autorità estere" (Elenco controlli, p. 7).
function checkPartitaIva(id: unknown, parent: string, report: Report): Problem[] {
  const idFiscale = block(id as { IdPaese?: unknown; IdCodice?: unknown } | undefined);
  const codice = text(idFiscale?.IdCodice);
  if (text(idFiscale?.IdPaese) !== 'IT' || codice === undefined || !fitsCodiceType(codice))
    return [];
  const fault = partitaIvaFault(codice);
  if (fault === undefined) return [];
  return [
    report(`${parent}.IdFiscaleIVA.IdCodice`, message('La partita IVA', codice, fault, 'valida')),
  ];
}

function checkCodiceFiscale(value: unknown, path: string, report: Report): Problem[] {
  const codice = text(value);
  // CodiceFiscaleType: [A-Z0-9]{11,16}; anything else is xsd.pattern.
  if (codice === undefined || !/^[A-Z0-9]{11,16}$/.test(codice)) return [];
  const fault = codiceFiscaleFault(codice);
  return fault === undefined ? [] : [report(path, message('Il codice fiscale', codice, fault))];
}

/**
 * 00300: the sender's IdCodice is a codice fiscale, 11 digits or 16 characters. The XSD has no
 * pattern there, so a code valid only in upper case is a warning: whether the SdI finds it in
 * the Anagrafe is not written.
 */
function trasmittente(fattura: Parameters<SdiRule>[0]): Problem[] {
  const id = block(
    block(block(fattura.FatturaElettronicaHeader)?.DatiTrasmissione)?.IdTrasmittente,
  );
  const codice = text(id?.IdCodice);
  if (text(id?.IdPaese) !== 'IT' || codice === undefined || !fitsCodiceType(codice)) return [];
  const path = `${TRASMISSIONE}.IdTrasmittente.IdCodice`;
  const fault = codiceFiscaleFault(codice.toUpperCase());
  if (fault !== undefined) {
    return [
      sdiError(
        '00300',
        path,
        message("L'IdCodice del trasmittente", codice, fault),
        `${source(ELENCO_CONTROLLI, 7)}; ${DM_1976}`,
      ),
    ];
  }
  if (codice === codice.toUpperCase()) return [];
  return [
    libraryWarning(
      'warn.idTrasmittenteMinuscolo',
      path,
      `L'IdCodice del trasmittente (${codice}) è un codice fiscale valido ma in minuscolo: scrivilo in maiuscolo.`,
    ),
  ];
}

// CodiceType: 1 to 28 characters, else xsd.length.
const fitsCodiceType = (value: string) => value.length >= 1 && value.length <= 28;

const message = (what: string, value: string, fault: string, valid = 'valido') =>
  `${what} ${value} non è ${valid}: ${fault}.`;
