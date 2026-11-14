import { bodies, casse } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { checkNatura } from './natura.js';

/** 00413 and 00414 on DatiCassaPrevidenziale (Elenco controlli 2.0, p. 18). */
export const rule00413and00414: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) =>
    checkNatura(casse(body), body.datiDocumento?.TipoDocumento, {
      missing: '00413',
      present: '00414',
      page: 18,
      td16: false,
    }),
  );
