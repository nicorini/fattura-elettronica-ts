// 00437 and 00438: a ScontoMaggiorazione says it is a discount or a surcharge (Tipo) but not how
// much: neither Percentuale nor Importo.
import type { SdiErrorCode } from '../../codes.js';
import type { ScontoMaggiorazione } from '../../generated/model.js';
import type { Problem } from '../../problem.js';
import { blocks, bodies, lines } from '../fields.js';
import { type SdiRule, sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

function check(
  sconti: ScontoMaggiorazione | readonly ScontoMaggiorazione[] | undefined,
  path: string,
  sdiCode: SdiErrorCode,
): Problem[] {
  return blocks(sconti, `${path}.ScontoMaggiorazione`).flatMap(({ block, path: at }) =>
    block.Tipo !== undefined && block.Percentuale === undefined && block.Importo === undefined
      ? [
          sdiError(
            sdiCode,
            at,
            'Lo sconto o la maggiorazione non ha né Percentuale né Importo.',
            source(ELENCO_CONTROLLI, 36),
          ),
        ]
      : [],
  );
}

/** 00437 (document) and 00438 (lines), Elenco controlli 2.0, p. 36. */
export const rule00437and00438: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) => [
    ...check(body.datiDocumento?.ScontoMaggiorazione, body.documento, '00437'),
    ...lines(body).flatMap(({ block, path }) => check(block.ScontoMaggiorazione, path, '00438')),
  ]);
