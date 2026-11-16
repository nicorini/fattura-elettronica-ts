// Step 7 of createInvoice: ImportoPagamento of the only DettaglioPagamento.
import { dettagliPagamento, importoPagamento } from '../pagamento.js';
import type { Body } from '../sdi/fields.js';
import type { Problems } from './problems.js';

/**
 * Fills the missing ImportoPagamento of the only DettaglioPagamento of the body. With more
 * instalments the split is the user's: each one without an amount is a problem. Without
 * DatiPagamento nothing is added.
 */
export function fillImportoPagamento(body: Body, problems: Problems): void {
  const dettagli = dettagliPagamento(body);
  for (const { block: dettaglio, path } of dettagli) {
    if (dettaglio.ImportoPagamento !== undefined) continue;
    if (dettagli.length > 1) {
      problems.add(
        'create.importoPagamento',
        `${path}.ImportoPagamento`,
        'Manca ImportoPagamento: con più DettaglioPagamento createInvoice non sa come dividere il pagamento in rate, indica tu ogni importo.',
      );
    } else {
      const importo = importoPagamento(body);
      if (importo !== undefined) dettaglio.ImportoPagamento = importo.toFixed(2);
    }
  }
}
