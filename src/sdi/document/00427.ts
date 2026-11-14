import { block, TRASMISSIONE, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/**
 * 00427: a public body has an office code of 6 characters, a private party a code of 7. The SdI
 * reads the format from `FormatoTrasmissione`, not from `versione`.
 */
export const rule00427: SdiRule = (fattura) => {
  const trasmissione = block(block(fattura.FatturaElettronicaHeader)?.DatiTrasmissione);
  const formato = text(trasmissione?.FormatoTrasmissione);
  const codice = text(trasmissione?.CodiceDestinatario);
  if (formato === undefined || codice === undefined) return [];
  const wrong = formato === 'FPA12' ? codice.length === 7 : codice.length === 6;
  if (!wrong) return [];
  return [
    sdiError(
      '00427',
      `${TRASMISSIONE}.CodiceDestinatario`,
      formato === 'FPA12'
        ? `CodiceDestinatario di 7 caratteri in una fattura FPA12: alla PA va il codice ufficio di 6 caratteri.`
        : `CodiceDestinatario di 6 caratteri in una fattura ${formato}: il codice ufficio di 6 caratteri vale solo per la PA (FPA12).`,
      source(ELENCO_CONTROLLI, 33),
    ),
  ];
};
