import { block, TRASMISSIONE, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError, sdiWarning } from '../rule.js';
import { ALLEGATO_A, source } from '../sources.js';

/**
 * 00330 (FPR12 only, Allegato A): the PEC can't be a mailbox of the SdI, "sdixx@pec.fatturapa.it".
 * The exact form of those names is not written: `sdi<number>` is an error, any other address of
 * the domain a warning.
 */
export const rule00330: SdiRule = (fattura) => {
  const trasmissione = block(block(fattura.FatturaElettronicaHeader)?.DatiTrasmissione);
  if (text(trasmissione?.FormatoTrasmissione) !== 'FPR12') return [];
  const pec = text(trasmissione?.PECDestinatario)?.trim().toLowerCase();
  if (pec === undefined || !pec.endsWith('@pec.fatturapa.it')) return [];
  const path = `${TRASMISSIONE}.PECDestinatario`;
  if (/^sdi[0-9]+@/.test(pec)) {
    return [
      sdiError(
        '00330',
        path,
        `PECDestinatario è una casella del Sistema di Interscambio: non è ammessa.`,
        source(ALLEGATO_A, 32),
      ),
    ];
  }
  return [
    sdiWarning(
      '00330',
      path,
      `PECDestinatario è un indirizzo del dominio pec.fatturapa.it, quello delle caselle del Sistema di Interscambio: il SdI potrebbe scartare la fattura.`,
      source(ALLEGATO_A, 32),
    ),
  ];
};
