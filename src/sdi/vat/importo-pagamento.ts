import { dettagliPagamento, importoPagamento } from '../../pagamento.js';
import { bodies } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { SUGGERIMENTI, source } from '../sources.js';
import { computedAmountWarning } from './values.js';

/**
 * `warn.importoPagamento`: the only DettaglioPagamento of a body with an ImportoPagamento other
 * than the total less every ritenuta and the VAT in split payment, the amount createInvoice would
 * compute. With more instalments the split is the seller's.
 */
export const ruleImportoPagamento: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) => {
    const dettagli = dettagliPagamento(body);
    const only = dettagli[0];
    if (only === undefined || dettagli.length > 1) return [];
    return computedAmountWarning({
      code: 'warn.importoPagamento',
      path: `${only.path}.ImportoPagamento`,
      actual: only.block.ImportoPagamento,
      expected: importoPagamento(body),
      source: source(SUGGERIMENTI, '106–117'),
      message: ({ expected, actual }) =>
        `ImportoPagamento è ${actual}, ma ImportoTotaleDocumento, tolte le ritenute e l'IVA in split payment (EsigibilitaIVA S), dà ${expected}.`,
    });
  });
