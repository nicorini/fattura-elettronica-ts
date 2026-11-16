import { importoContributoCassa } from '../../cassa.js';
import { bodies, casse } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { SPECIFICHE_FORMATO, source } from '../sources.js';
import { computedAmountWarning } from './values.js';

/**
 * `warn.importoContributoCassa`: an ImportoContributoCassa other than ImponibileCassa × AlCassa /
 * 100, to the cent, the amount createInvoice would compute. Without ImponibileCassa there is
 * nothing to compare: the SdI doesn't require it.
 */
export const ruleImportoContributoCassa: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) =>
    casse(body).flatMap(({ block: cassa, path }) =>
      computedAmountWarning({
        code: 'warn.importoContributoCassa',
        path: `${path}.ImportoContributoCassa`,
        actual: cassa.ImportoContributoCassa,
        expected: importoContributoCassa(cassa),
        source: source(SPECIFICHE_FORMATO, 19),
        message: ({ expected, actual }) =>
          `ImportoContributoCassa è ${actual}, ma ImponibileCassa × AlCassa / 100 dà ${expected}.`,
      }),
    ),
  );
