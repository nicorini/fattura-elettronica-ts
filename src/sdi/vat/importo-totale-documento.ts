import type { Problem } from '../../problem.js';
import { importoTotaleDocumento } from '../../totale.js';
import { bodies, toBig } from '../fields.js';
import { libraryWarning, type SdiRule } from '../rule.js';
import { amount } from './values.js';

/**
 * `warn.importoTotaleDocumento`: an ImportoTotaleDocumento other than Σ ImponibileImporto +
 * Σ Imposta + Arrotondamento, the amount createInvoice would compute. Not with a
 * ScontoMaggiorazione of the document, which the formula doesn't cover.
 */
export const ruleImportoTotaleDocumento: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const actual = toBig(body.datiDocumento?.ImportoTotaleDocumento);
    const expected = importoTotaleDocumento(body);
    if (actual === undefined || expected === undefined || actual.eq(expected)) continue;
    const amounts = { expected: amount(expected), actual: amount(actual) };
    problems.push(
      libraryWarning(
        'warn.importoTotaleDocumento',
        `${body.documento}.ImportoTotaleDocumento`,
        `ImportoTotaleDocumento è ${amounts.actual}, ma imponibili e imposte dei DatiRiepilogo, più l'Arrotondamento, danno ${amounts.expected}.`,
        amounts,
      ),
    );
  }
  return problems;
};
