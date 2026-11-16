import { bodies, day } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/**
 * 00403: the invoice can't be dated after the day the SdI receives it. Offline that day is the
 * option `today`, or today in Italy (see RuleContext).
 */
export const rule00403: SdiRule = (fattura, { today }) => {
  if (today === undefined) return [];
  const problems = [];
  for (const { datiDocumento, documentoPath } of bodies(fattura)) {
    const data = day(datiDocumento?.Data);
    if (data === undefined || data <= today) continue;
    problems.push(
      sdiError(
        '00403',
        `${documentoPath}.Data`,
        `La data della fattura (${data}) è successiva a oggi (${today}): il SdI la scarta.`,
        source(ELENCO_CONTROLLI, 11),
      ),
    );
  }
  return problems;
};
