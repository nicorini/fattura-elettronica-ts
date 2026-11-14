import { CESSIONARIO, parties, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/**
 * 00476: supplier and customer can't both be foreign. The check compares the two
 * `IdFiscaleIVA/IdPaese`: a customer with only a codice fiscale has none, and is not judged.
 */
export const rule00476: SdiRule = (fattura) => {
  const { cedente, cessionario } = parties(fattura);
  const [paeseCedente, paeseCessionario] = [text(cedente?.IdPaese), text(cessionario?.IdPaese)];
  if (paeseCedente === undefined || paeseCessionario === undefined) return [];
  if (paeseCedente === 'IT' || paeseCessionario === 'IT') return [];
  return [
    sdiError(
      '00476',
      `${CESSIONARIO}.IdFiscaleIVA.IdPaese`,
      `Cedente/prestatore (${paeseCedente}) e cessionario/committente (${paeseCessionario}) non possono essere entrambi esteri.`,
      source(ELENCO_CONTROLLI, 45),
    ),
  ];
};
