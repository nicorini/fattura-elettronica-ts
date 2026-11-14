import type { Problem } from '../../problem.js';
import { bodies, riepiloghi } from '../fields.js';
import { libraryWarning, type SdiRule } from '../rule.js';
import { SPECIFICHE_FORMATO, source } from '../sources.js';

/**
 * A DatiRiepilogo with a Natura and no RiferimentoNormativo: the Specifiche del formato 1.4 make
 * the law "obbligatorio" there (p. 27), but no check of the SdI rejects it, so a warning.
 */
export const ruleRiferimentoNormativo: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    for (const { block: riepilogo, path } of riepiloghi(body)) {
      if (riepilogo.Natura === undefined || riepilogo.RiferimentoNormativo !== undefined) continue;
      problems.push(
        libraryWarning(
          'warn.riferimentoNormativo',
          `${path}.RiferimentoNormativo`,
          `Con la Natura ${String(riepilogo.Natura)} va indicata la norma (RiferimentoNormativo) che giustifica l'operazione senza IVA.`,
          { source: source(SPECIFICHE_FORMATO, 27) },
        ),
      );
    }
  }
  return problems;
};
