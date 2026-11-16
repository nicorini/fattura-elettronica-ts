import type { Problem } from '../../problem.js';
import { computable, datiRitenuta, importoRitenuta } from '../../ritenuta.js';
import { bodies, toBig } from '../fields.js';
import { libraryWarning, type SdiRule } from '../rule.js';
import { amount } from './values.js';

/**
 * `warn.importoRitenuta`: the only DatiRitenuta, RT01 or RT02, with an ImportoRitenuta above
 * AliquotaRitenuta % of the lines and casse with Ritenuta SI, the amount createInvoice would
 * compute. Only above: an agent's ritenuta is on a reduced base, so a lower amount is legitimate.
 */
export const ruleImportoRitenuta: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const ritenute = datiRitenuta(body);
    const only = ritenute[0];
    if (only === undefined || !computable(ritenute)) continue;
    const actual = toBig(only.block.ImportoRitenuta);
    const expected = importoRitenuta(body, only.block);
    if (actual === undefined || expected === undefined || actual.lte(expected)) continue;
    const amounts = { expected: amount(expected), actual: amount(actual) };
    problems.push(
      libraryWarning(
        'warn.importoRitenuta',
        `${only.path}.ImportoRitenuta`,
        `ImportoRitenuta è ${amounts.actual}, più di ${amounts.expected}, l'AliquotaRitenuta applicata a tutte le righe e le casse con Ritenuta SI.`,
        amounts,
      ),
    );
  }
  return problems;
};
