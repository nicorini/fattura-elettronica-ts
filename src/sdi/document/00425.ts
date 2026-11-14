import { bodies, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/** 00425: the number of the invoice must contain at least one digit. */
export const rule00425: SdiRule = (fattura) =>
  bodies(fattura).flatMap(({ datiDocumento, documento }) => {
    const numero = text(datiDocumento?.Numero);
    if (numero === undefined || /[0-9]/.test(numero)) return [];
    return [
      sdiError(
        '00425',
        `${documento}.Numero`,
        `Il numero della fattura (${numero}) non contiene cifre: ne serve almeno una.`,
        source(ELENCO_CONTROLLI, 32),
      ),
    ];
  });
