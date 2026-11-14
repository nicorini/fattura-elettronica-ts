import { documentTypes, lines, toBig } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/** 00474: a self-invoice for exceeding the plafond (TD21) has no line at zero rate. */
export const rule00474: SdiRule = (fattura) =>
  documentTypes(fattura)
    .filter(({ tipo }) => tipo === 'TD21')
    .flatMap((body) =>
      lines(body).flatMap(({ block: linea, path }) => {
        // RateType allows spaces around the value and forms like 0.00 or 00.00.
        if (!toBig(linea.AliquotaIVA)?.eq(0)) return [];
        return [
          sdiError(
            '00474',
            `${path}.AliquotaIVA`,
            'Con TipoDocumento TD21 (autofattura per splafonamento) le linee non possono avere AliquotaIVA zero.',
            source(ELENCO_CONTROLLI, 43),
          ),
        ];
      }),
    );
