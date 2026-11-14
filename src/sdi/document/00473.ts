import type { TipoDocumento } from '../../generated/model.js';
import { documentTypes, isOneOf, parties, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError, sdiWarning } from '../rule.js';
import { ALLEGATO_A, ELENCO_CONTROLLI, source } from '../sources.js';

const FOREIGN_SUPPLIER: readonly TipoDocumento[] = ['TD17', 'TD18', 'TD19', 'TD28'];
/** The types for which the Allegato A allows `OO` (Livigno, Campione d'Italia). */
const OO_ALLOWED: readonly TipoDocumento[] = ['TD17', 'TD19'];

/**
 * 00473: purchases from abroad (TD17, TD18, TD19, TD28) need a supplier not identified in Italy,
 * TD29 an Italian one. The Elenco controlli checks only `IT`; the Allegato A allows `OO` for TD17
 * and TD19 only, so `OO` with TD18 or TD28 is a warning.
 */
export const rule00473: SdiRule = (fattura) => {
  const paese = text(parties(fattura).cedente?.IdPaese);
  if (paese === undefined) return [];
  return documentTypes(fattura).flatMap(({ documento, tipo }) => {
    const path = `${documento}.TipoDocumento`;
    if (isOneOf(tipo, FOREIGN_SUPPLIER) && paese === 'OO' && !isOneOf(tipo, OO_ALLOWED)) {
      return [
        sdiWarning(
          '00473',
          path,
          `Con TipoDocumento ${tipo} l'IdPaese OO (Livigno, Campione d'Italia) del cedente/prestatore è ammesso solo per TD17 e TD19: il SdI potrebbe scartare la fattura.`,
          source(ALLEGATO_A, 119),
        ),
      ];
    }
    const wrong = isOneOf(tipo, FOREIGN_SUPPLIER)
      ? paese === 'IT'
      : tipo === 'TD29' && paese !== 'IT';
    if (!wrong) return [];
    return [
      sdiError(
        '00473',
        path,
        tipo === 'TD29'
          ? `Con TipoDocumento TD29 il cedente/prestatore deve essere italiano (IdPaese IT, non ${paese}).`
          : `Con TipoDocumento ${tipo} il cedente/prestatore non può essere italiano (IdPaese IT).`,
        source(ELENCO_CONTROLLI, 42),
      ),
    ];
  });
};
