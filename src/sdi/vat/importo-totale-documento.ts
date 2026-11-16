import { importoTotaleDocumento } from '../../totale.js';
import { bodies } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { field } from '../sources.js';
import { computedAmountWarning } from './values.js';

/**
 * `warn.importoTotaleDocumento`: an ImportoTotaleDocumento other than Σ ImponibileImporto +
 * Σ Imposta + Arrotondamento, the amount createInvoice would compute. Not with a
 * ScontoMaggiorazione of the document, which the formula doesn't cover.
 */
export const ruleImportoTotaleDocumento: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) =>
    computedAmountWarning({
      code: 'warn.importoTotaleDocumento',
      path: `${body.documentoPath}.ImportoTotaleDocumento`,
      actual: body.datiDocumento?.ImportoTotaleDocumento,
      expected: importoTotaleDocumento(body),
      source: field('2.1.1.9'),
      message: ({ expected, actual }) =>
        `ImportoTotaleDocumento è ${actual}, ma imponibili e imposte dei DatiRiepilogo, più l'Arrotondamento, danno ${expected}.`,
    }),
  );
