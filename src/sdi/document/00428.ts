import { block, TRASMISSIONE, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/** 00428: `FormatoTrasmissione` must equal the attribute `versione`. */
export const rule00428: SdiRule = (fattura) => {
  const formato = text(
    block(block(fattura.FatturaElettronicaHeader)?.DatiTrasmissione)?.FormatoTrasmissione,
  );
  const versione = text(fattura.versione);
  if (formato === undefined || versione === undefined || formato === versione) return [];
  return [
    sdiError(
      '00428',
      `${TRASMISSIONE}.FormatoTrasmissione`,
      `FormatoTrasmissione (${formato}) è diverso dall'attributo versione (${versione}).`,
      source(ELENCO_CONTROLLI, 34),
    ),
  ];
};
