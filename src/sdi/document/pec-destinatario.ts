import { block, TRASMISSIONE, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { libraryWarning } from '../rule.js';
import { SPECIFICHE_FORMATO, source } from '../sources.js';

/**
 * `warn.pecDestinatario`: the PEC goes only with `CodiceDestinatario` 0000000, and never to the
 * PA. A rule of the Specifiche del formato with no SdI code, so a warning.
 */
export const rulePecDestinatario: SdiRule = (fattura) => {
  const trasmissione = block(block(fattura.FatturaElettronicaHeader)?.DatiTrasmissione);
  if (text(trasmissione?.PECDestinatario) === undefined) return [];
  const message =
    text(trasmissione?.FormatoTrasmissione) === 'FPA12'
      ? 'PECDestinatario in una fattura alla PA (FPA12): si usa solo per i destinatari privati.'
      : text(trasmissione?.CodiceDestinatario) !== '0000000'
        ? 'PECDestinatario si indica solo con CodiceDestinatario 0000000.'
        : undefined;
  if (message === undefined) return [];
  return [
    libraryWarning('warn.pecDestinatario', `${TRASMISSIONE}.PECDestinatario`, message, {
      source: source(SPECIFICHE_FORMATO, 10),
    }),
  ];
};
