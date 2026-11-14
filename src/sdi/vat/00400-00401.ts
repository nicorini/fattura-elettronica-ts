import { bodies, lines } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { checkNatura } from './natura.js';

/** 00400 and 00401 on DettaglioLinee (Elenco controlli 2.0, p. 10; TD16: Allegato A, p. 52). */
export const rule00400and00401: SdiRule = (fattura) =>
  bodies(fattura).flatMap((body) =>
    checkNatura(lines(body), body.datiDocumento?.TipoDocumento, {
      missing: '00400',
      present: '00401',
      page: 10,
      td16: true,
    }),
  );
