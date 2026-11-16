import { CreateInvoiceError } from '../errors.js';
import type { CreateInvoiceInput } from '../generated/input.js';
import type { FatturaElettronica } from '../generated/model.js';
import { bodies } from '../sdi/fields.js';
import { convertNumbers } from './numbers.js';
import { fillPrezzoTotale } from './prezzo-totale.js';
import { Problems } from './problems.js';
import { fillDatiRiepilogo } from './riepilogo.js';
import { fillImportoTotaleDocumento } from './totale.js';

/**
 * The complete invoice from its lines: computes the fields that depend on them, when missing.
 * Every field of the input stays as it is, so a field written by hand wins over the computed one;
 * a `number` becomes the string of `decimal(n)` (`5` → `"5.00"`). The computed fields have 2
 * decimals, rounded once, half-up away from zero. Each body of a lot is computed on its own.
 *
 * Computed: `PrezzoTotale` of each line (`PrezzoUnitario`, after each `ScontoMaggiorazione` in
 * order, × `Quantita`, 1 if missing); one `DatiRiepilogo` per `AliquotaIVA` and `Natura` of lines
 * and `DatiCassaPrevidenziale`, in order of first appearance, with `ImponibileImporto` (their sum
 * plus its `Arrotondamento`) and `Imposta`; `ImportoTotaleDocumento` (Σ `ImponibileImporto` + Σ
 * `Imposta` + `Arrotondamento`), only without a `ScontoMaggiorazione` of the document. A
 * `DatiRiepilogo` of the input with the same `AliquotaIVA` and `Natura` gives its fields
 * (`EsigibilitaIVA`, `RiferimentoNormativo`, the amounts), and the rest is computed.
 *
 * It doesn't check the structure: `build` and `validate` do, on the object it returns.
 *
 * @throws {CreateInvoiceError} With every problem of the input that stops a computation.
 * @example
 * const xml = build(createInvoice(input));
 */
export function createInvoice(input: CreateInvoiceInput): FatturaElettronica {
  const problems = new Problems();
  const fattura = convertNumbers(input, problems);
  for (const body of bodies(fattura)) {
    fillPrezzoTotale(body, problems);
    fillDatiRiepilogo(body);
    fillImportoTotaleDocumento(body, problems);
  }
  if (problems.list.length > 0) throw new CreateInvoiceError(problems.list);
  return fattura;
}
