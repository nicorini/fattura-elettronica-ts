// The documents of the Agenzia delle Entrate that the checks cite in `Problem.source`, with the
// version they were written against: codes and rules change between versions.

/** Elenco dei controlli effettuati sul file fattura del SdI, 2.0 (31/01/2025). */
export const ELENCO_CONTROLLI = 'Elenco controlli SdI 2.0';
/** Allegato A – Specifiche tecniche, 1.9.1 (31/03/2026): invoices between private parties. */
export const ALLEGATO_A = 'Allegato A, Specifiche tecniche 1.9.1';
/** Specifiche tecniche operative del formato FatturaPA, 1.4 (31/01/2025). */
export const SPECIFICHE_FORMATO = 'Specifiche tecniche del formato FatturaPA 1.4';

/**
 * Rappresentazione tabellare del tracciato fattura ordinaria, published with the Specifiche del
 * formato 1.4: its column "Controlli extra schema" gives the SdI codes field by field.
 */
export const RAPPRESENTAZIONE_TABELLARE =
  'Rappresentazione tabellare del tracciato fattura ordinaria';

/** `Elenco controlli SdI 2.0, p. 12`. */
export function source(document: string, page: number | string): string {
  return `${document}, p. ${page}`;
}
