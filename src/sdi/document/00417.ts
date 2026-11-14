import { block, CESSIONARIO } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/** 00417: the customer needs at least one of `IdFiscaleIVA` and `CodiceFiscale`. */
export const rule00417: SdiRule = (fattura) => {
  const anagrafici = block(
    block(block(fattura.FatturaElettronicaHeader)?.CessionarioCommittente)?.DatiAnagrafici,
  );
  if (anagrafici === undefined) return [];
  if (anagrafici.IdFiscaleIVA !== undefined || anagrafici.CodiceFiscale !== undefined) return [];
  return [
    sdiError(
      '00417',
      CESSIONARIO,
      'Il cessionario/committente non ha né IdFiscaleIVA né CodiceFiscale: serve almeno uno dei due.',
      source(ELENCO_CONTROLLI, 20),
    ),
  ];
};
