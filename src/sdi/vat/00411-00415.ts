// 00411 and 00415: a line or a cassa subject to withholding tax (Ritenuta SI) needs DatiRitenuta.
import type { Problem } from '../../problem.js';
import { bodies, casse, lines, list } from '../fields.js';
import { type SdiRule, sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/** 00411 (lines, Elenco controlli 2.0, p. 17) and 00415 (cassa, p. 19). */
export const rule00411and00415: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    if (list(body.datiDocumento?.DatiRitenuta).length > 0) continue;
    const ritenutaPath = `${body.documento}.DatiRitenuta`;
    if (lines(body).some(({ block }) => block.Ritenuta === 'SI')) {
      problems.push(
        sdiError(
          '00411',
          ritenutaPath,
          'Una riga ha Ritenuta SI: servono i DatiRitenuta.',
          source(ELENCO_CONTROLLI, 17),
        ),
      );
    }
    if (casse(body).some(({ block }) => block.Ritenuta === 'SI')) {
      problems.push(
        sdiError(
          '00415',
          ritenutaPath,
          'Un contributo DatiCassaPrevidenziale ha Ritenuta SI: servono i DatiRitenuta.',
          source(ELENCO_CONTROLLI, 19),
        ),
      );
    }
  }
  return problems;
};
