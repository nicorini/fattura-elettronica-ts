import { importoContributoCassa } from '../../cassa.js';
import type { Problem } from '../../problem.js';
import { bodies, casse, toBig } from '../fields.js';
import { libraryWarning, type SdiRule } from '../rule.js';
import { amount } from './values.js';

/**
 * `warn.importoContributoCassa`: an ImportoContributoCassa other than ImponibileCassa × AlCassa /
 * 100, to the cent, the amount createInvoice would compute. Without ImponibileCassa there is
 * nothing to compare: the SdI doesn't require it.
 */
export const ruleImportoContributoCassa: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    for (const { block: cassa, path } of casse(body)) {
      const actual = toBig(cassa.ImportoContributoCassa);
      const expected = importoContributoCassa(cassa);
      if (actual === undefined || expected === undefined || actual.eq(expected)) continue;
      const amounts = { expected: amount(expected), actual: amount(actual) };
      problems.push(
        libraryWarning(
          'warn.importoContributoCassa',
          `${path}.ImportoContributoCassa`,
          `ImportoContributoCassa è ${amounts.actual}, ma ImponibileCassa × AlCassa / 100 dà ${amounts.expected}.`,
          amounts,
        ),
      );
    }
  }
  return problems;
};
