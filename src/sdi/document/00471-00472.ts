import type { TipoDocumento } from '../../generated/model.js';
import type { Problem } from '../../problem.js';
import { documentTypes, isOneOf, parties, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError, sdiWarning } from '../rule.js';
import { ALLEGATO_A, ELENCO_CONTROLLI, source } from '../sources.js';

// Types for which the Elenco controlli and the Allegato A agree (error), and those only the
// Allegato A lists (warning).
const MUST_DIFFER: Record<'error' | 'warning', readonly TipoDocumento[]> = {
  error: ['TD16', 'TD17', 'TD18', 'TD19', 'TD20', 'TD29'],
  warning: ['TD01', 'TD02', 'TD03', 'TD06', 'TD24', 'TD25', 'TD28'],
};
const MUST_MATCH: Record<'error' | 'warning', readonly TipoDocumento[]> = {
  error: ['TD21'],
  warning: ['TD27'],
};

/**
 * 00471 and 00472: for self-invoices and integrations, supplier and customer must be different
 * (00471) or the same party (00472). Judged only when both have `IdFiscaleIVA`: with only the
 * customer's codice fiscale the SdI looks up the P.IVA in the Anagrafe tributaria.
 */
export const rule00471and00472: SdiRule = (fattura) => {
  const { cedente, cessionario } = parties(fattura);
  const ids = [cedente, cessionario].map((id) => [text(id?.IdPaese), text(id?.IdCodice)]);
  if (ids.some(([paese, codice]) => paese === undefined || codice === undefined)) return [];
  const same = ids[0]?.[0] === ids[1]?.[0] && ids[0]?.[1] === ids[1]?.[1];
  const problems: Problem[] = [];
  for (const { documento, tipo } of documentTypes(fattura)) {
    const path = `${documento}.TipoDocumento`;
    if (same && isOneOf(tipo, MUST_DIFFER.error)) {
      problems.push(sdiError('00471', path, differ(tipo), source(ELENCO_CONTROLLI, 40)));
    } else if (same && isOneOf(tipo, MUST_DIFFER.warning)) {
      problems.push(sdiWarning('00471', path, differ(tipo), source(ALLEGATO_A, 119)));
    } else if (!same && isOneOf(tipo, MUST_MATCH.error)) {
      problems.push(sdiError('00472', path, match(tipo), source(ELENCO_CONTROLLI, 41)));
    } else if (!same && isOneOf(tipo, MUST_MATCH.warning)) {
      problems.push(sdiWarning('00472', path, match(tipo), source(ALLEGATO_A, 119)));
    }
  }
  return problems;
};

const differ = (tipo: string) =>
  `Con TipoDocumento ${tipo} il cedente/prestatore non può essere uguale al cessionario/committente (stesso IdFiscaleIVA).`;
const match = (tipo: string) =>
  `Con TipoDocumento ${tipo} il cedente/prestatore deve essere uguale al cessionario/committente (IdFiscaleIVA diversi).`;
