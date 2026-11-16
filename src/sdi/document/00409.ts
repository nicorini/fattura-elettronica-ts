import type { DatiGeneraliDocumento } from '../../generated/model.js';
import { bodies, day, text } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/**
 * 00409: two invoices of the same batch (the bodies of one file) can't have the same number in
 * the same year, or on the same date if both have `Art73` SI. A credit note (TD04) may share the
 * number of an invoice of another type. Reported on the later body.
 */
export const rule00409: SdiRule = (fattura) => {
  const documenti = bodies(fattura).map(({ datiDocumento, documentoPath }) => ({
    documento: documentoPath,
    dati: datiDocumento,
  }));
  const problems = [];
  for (const [index, later] of documenti.entries()) {
    const earlier = documenti.slice(0, index).find(({ dati }) => duplicate(dati, later.dati));
    if (earlier === undefined) continue;
    problems.push(
      sdiError(
        '00409',
        `${later.documento}.Numero`,
        `Il numero ${text(later.dati?.Numero)} è già usato da un'altra fattura del lotto (${earlier.documento}).`,
        source(ELENCO_CONTROLLI, 15),
      ),
    );
  }
  return problems;
};

// EC pp. 15-16: for each invoice F without Art73 SI, the same year is enough; when both have it,
// the date must match.
function duplicate(a: DatiGeneraliDocumento | undefined, b: DatiGeneraliDocumento | undefined) {
  const numero = text(a?.Numero);
  const [dataA, dataB] = [day(a?.Data), day(b?.Data)];
  const [tipoA, tipoB] = [text(a?.TipoDocumento), text(b?.TipoDocumento)];
  if (numero === undefined || numero !== text(b?.Numero)) return false;
  if (dataA === undefined || dataB === undefined || tipoA === undefined) return false;
  if ((tipoA === 'TD04' || tipoB === 'TD04') && tipoA !== tipoB) return false;
  const bothArt73 = text(a?.Art73) === 'SI' && text(b?.Art73) === 'SI';
  return bothArt73 ? dataA === dataB : dataA.slice(0, 4) === dataB.slice(0, 4);
}
