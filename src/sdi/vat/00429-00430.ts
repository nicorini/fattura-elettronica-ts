import { bodies, riepiloghi } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { checkNatura } from './natura.js';

/** 00429 and 00430 on DatiRiepilogo (Elenco controlli 2.0, p. 35; TD16: Allegato A, p. 56). */
export const rule00429and00430: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) =>
    checkNatura(riepiloghi(body), body.datiDocumento?.TipoDocumento, {
      missing: '00429',
      present: '00430',
      page: 35,
      td16: true,
    }),
  );
