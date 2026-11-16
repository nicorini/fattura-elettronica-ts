import { dettagliPagamento, importoPagamento } from '../../pagamento.js';
import type { Problem } from '../../problem.js';
import { bodies, toBig } from '../fields.js';
import { libraryWarning, type SdiRule } from '../rule.js';
import { amount } from './values.js';

/**
 * `warn.importoPagamento`: the only DettaglioPagamento of a body with an ImportoPagamento other
 * than the total less every ritenuta and the VAT in split payment, the amount createInvoice would
 * compute. With more instalments the split is the seller's.
 */
export const ruleImportoPagamento: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const dettagli = dettagliPagamento(body);
    const only = dettagli[0];
    if (only === undefined || dettagli.length > 1) continue;
    const actual = toBig(only.block.ImportoPagamento);
    const expected = importoPagamento(body);
    if (actual === undefined || expected === undefined || actual.eq(expected)) continue;
    const amounts = { expected: amount(expected), actual: amount(actual) };
    problems.push(
      libraryWarning(
        'warn.importoPagamento',
        `${only.path}.ImportoPagamento`,
        `ImportoPagamento è ${amounts.actual}, ma ImportoTotaleDocumento, tolte le ritenute e l'IVA in split payment (EsigibilitaIVA S), dà ${amounts.expected}.`,
        amounts,
      ),
    );
  }
  return problems;
};
