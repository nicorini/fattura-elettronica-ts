import type { TipoDocumento } from '../../generated/model.js';
import { documentTypes, isOneOf, parties } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

const NEED_PARTITA_IVA: readonly TipoDocumento[] = [
  'TD16',
  'TD17',
  'TD18',
  'TD19',
  'TD20',
  'TD22',
  'TD23',
  'TD28',
  'TD29',
];

/** 00475: self-invoices and integrations need the customer's `IdFiscaleIVA`. */
export const rule00475: SdiRule = (fattura) => {
  const { cessionario, cessionarioAnagrafici } = parties(fattura);
  if (cessionarioAnagrafici === undefined || cessionario !== undefined) return [];
  return documentTypes(fattura)
    .filter(({ tipo }) => isOneOf(tipo, NEED_PARTITA_IVA))
    .map(({ documento, tipo }) =>
      sdiError(
        '00475',
        `${documento}.TipoDocumento`,
        `Con TipoDocumento ${tipo} il cessionario/committente deve avere IdFiscaleIVA.`,
        source(ELENCO_CONTROLLI, 44),
      ),
    );
};
