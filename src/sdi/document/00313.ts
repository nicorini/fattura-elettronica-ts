import { block, CESSIONARIO, TRASMISSIONE, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ALLEGATO_A, source } from '../sources.js';

/**
 * 00313 (FPR12 only, Allegato A): `XXXXXXX` is for invoices to parties not established in Italy,
 * so the customer must have an `IdFiscaleIVA` with `IdPaese` other than IT.
 */
export const rule00313: SdiRule = (fattura) => {
  const header = block(fattura.FatturaElettronicaHeader);
  const trasmissione = block(header?.DatiTrasmissione);
  if (text(trasmissione?.FormatoTrasmissione) !== 'FPR12') return [];
  if (text(trasmissione?.CodiceDestinatario) !== 'XXXXXXX') return [];
  const idFiscale = block(
    block(block(header?.CessionarioCommittente)?.DatiAnagrafici)?.IdFiscaleIVA,
  );
  const paese = text(idFiscale?.IdPaese);
  if (paese !== undefined && paese !== 'IT') return [];
  return [
    sdiError(
      '00313',
      `${TRASMISSIONE}.CodiceDestinatario`,
      `CodiceDestinatario XXXXXXX è ammesso solo verso un cessionario estero, con IdFiscaleIVA di un paese diverso da IT (${CESSIONARIO}.IdFiscaleIVA).`,
      source(ALLEGATO_A, 31),
    ),
  ];
};
