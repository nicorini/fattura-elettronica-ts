import { datiRitenuta, importoRitenuta, isSingleRt01OrRt02 } from '../../ritenuta.js';
import { bodies } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { SPECIFICHE_FORMATO, source } from '../sources.js';
import { computedAmountWarning } from './values.js';

/**
 * `warn.importoRitenuta`: the only DatiRitenuta, RT01 or RT02, with an ImportoRitenuta above
 * AliquotaRitenuta % of the lines and casse with Ritenuta SI, the amount createInvoice would
 * compute. Only above: an agent's ritenuta is on a reduced base, so a lower amount is legitimate.
 */
export const ruleImportoRitenuta: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) => {
    const ritenute = datiRitenuta(body);
    const only = ritenute[0];
    if (only === undefined || !isSingleRt01OrRt02(ritenute)) return [];
    return computedAmountWarning({
      code: 'warn.importoRitenuta',
      path: `${only.path}.ImportoRitenuta`,
      actual: only.block.ImportoRitenuta,
      expected: importoRitenuta(body, only.block),
      source: source(SPECIFICHE_FORMATO, '19, 26'),
      message: ({ expected, actual }) =>
        `ImportoRitenuta è ${actual}, più di ${expected}, l'AliquotaRitenuta applicata a tutte le righe e le casse con Ritenuta SI.`,
      accepts: (actual, expected) => actual.lte(expected),
    });
  });
