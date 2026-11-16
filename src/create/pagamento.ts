// Step 7 of createInvoice: ImportoPagamento of the only DettaglioPagamento.
import { toBig } from '../arithmetic.js';
import { dettagliPagamento, importoPagamento } from '../pagamento.js';
import { type Body, blocks } from '../sdi/fields.js';
import type { Problems } from './problems.js';
import type { Riepiloghi } from './riepilogo.js';

/**
 * Fills the missing ImportoPagamento of the only DettaglioPagamento of the body. With more
 * instalments the split is the user's: each one without an amount is a problem. Without
 * DatiPagamento nothing is added. When only the Imposta of a DatiRiepilogo in split payment stops
 * it, a problem says which one: a missing total or ritenuta has its own problem already.
 */
export function fillImportoPagamento(body: Body, riepiloghi: Riepiloghi, problems: Problems): void {
  const dettagli = dettagliPagamento(body);
  for (const { block: dettaglio, path } of dettagli) {
    if (dettaglio.ImportoPagamento !== undefined) continue;
    if (dettagli.length > 1) {
      problems.add(
        'create.importoPagamento',
        `${path}.ImportoPagamento`,
        'Manca ImportoPagamento: con più DettaglioPagamento createInvoice non sa come dividere il pagamento in rate, indica tu ogni importo.',
      );
      continue;
    }
    const importo = importoPagamento(body);
    if (importo !== undefined) {
      dettaglio.ImportoPagamento = importo.toFixed(2);
      continue;
    }
    const reason = othersReadable(body)
      ? riepiloghi.missing((riepilogo) => (riepilogo.EsigibilitaIVA === 'S' ? ['Imposta'] : []))
      : undefined;
    if (reason === undefined) continue;
    problems.add(
      'create.importoPagamento',
      `${path}.ImportoPagamento`,
      `Manca ImportoPagamento e createInvoice non può calcolarlo: ${reason}. Indica l'Imposta di quel DatiRiepilogo, oppure ImportoPagamento.`,
    );
  }
}

/** Whether the total and every ImportoRitenuta are decimals, so only a riepilogo can stop it. */
function othersReadable(body: Body): boolean {
  const documento = body.datiDocumento;
  return (
    toBig(documento?.ImportoTotaleDocumento) !== undefined &&
    blocks(documento?.DatiRitenuta, '').every(
      ({ block: ritenuta }) => toBig(ritenuta.ImportoRitenuta) !== undefined,
    )
  );
}
