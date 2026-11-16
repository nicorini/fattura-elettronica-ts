// The check shared by 00400/00401 (lines), 00413/00414 (cassa) and 00429/00430 (summaries). A
// rate of zero needs a Natura, which says why there is no VAT; any other rate must have none,
// except where TipoDocumento TD16 allows both (lines and summaries only).
import type { SdiErrorCode } from '../../codes.js';
import type { Problem } from '../../problem.js';
import { type Located, refusedNatura, toBig } from '../fields.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

interface Block {
  readonly AliquotaIVA?: unknown;
  readonly Natura?: unknown;
}

export interface Codes {
  readonly missing: SdiErrorCode;
  readonly present: SdiErrorCode;
  readonly page: number;
  /** The Allegato A lets a TD16 have a Natura with a rate (pp. 52, 56). */
  readonly td16: boolean;
}

export function checkNatura(
  blocks: readonly Located<Block>[],
  tipoDocumento: unknown,
  codes: Codes,
): Problem[] {
  const problems: Problem[] = [];
  for (const { block, path } of blocks) {
    const rate = toBig(block.AliquotaIVA);
    if (rate === undefined || refusedNatura(block.Natura)) continue;
    const hasNatura = block.Natura !== undefined;
    if (rate.eq(0) && !hasNatura) {
      problems.push(
        sdiError(
          codes.missing,
          `${path}.Natura`,
          "Con AliquotaIVA 0.00 serve la Natura, che dice perché non si applica l'IVA.",
          source(ELENCO_CONTROLLI, codes.page),
        ),
      );
    } else if (!rate.eq(0) && hasNatura && !(codes.td16 && tipoDocumento === 'TD16')) {
      problems.push(
        sdiError(
          codes.present,
          `${path}.Natura`,
          `Con AliquotaIVA ${rate.toFixed(2)} la Natura non va indicata: l'operazione è imponibile.`,
          source(ELENCO_CONTROLLI, codes.page),
        ),
      );
    }
  }
  return problems;
}
