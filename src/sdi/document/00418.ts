import type { Problem } from '../../problem.js';
import { block, blocks, bodies, day, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError, sdiWarning } from '../rule.js';
import { ALLEGATO_A, ELENCO_CONTROLLI, source } from '../sources.js';

/**
 * 00418: the invoice can't be dated before an invoice it links to (`DatiFattureCollegate`). The
 * Elenco controlli checks it only for credit notes (TD04), the Allegato A for every type: an
 * error for TD04, a warning for the others.
 */
export const rule00418: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const { body, path, datiDocumento } of bodies(fattura)) {
    const data = day(datiDocumento?.Data);
    if (data === undefined) continue;
    const collegate = block(body.DatiGenerali)?.DatiFattureCollegate;
    for (const { block: collegata, path: at } of blocks(
      collegate,
      `${path}.DatiGenerali.DatiFattureCollegate`,
    )) {
      const dataCollegata = day(collegata.Data);
      if (dataCollegata === undefined || data >= dataCollegata) continue;
      const where = `${at}.Data`;
      const message = `La data della fattura (${data}) è antecedente a quella della fattura collegata (${dataCollegata}).`;
      problems.push(
        text(datiDocumento?.TipoDocumento) === 'TD04'
          ? sdiError('00418', where, message, source(ELENCO_CONTROLLI, 21))
          : sdiWarning('00418', where, message, source(ALLEGATO_A, 46)),
      );
    }
  }
  return problems;
};
