// The documents of the Agenzia delle Entrate that the checks cite in `Problem.source`, with the
// version they were written against: codes and rules change between versions.

/** Elenco dei controlli effettuati sul file fattura del SdI, 2.0 (31/01/2025). */
export const ELENCO_CONTROLLI = 'Elenco controlli SdI 2.0';
/** Allegato A – Specifiche tecniche, 1.9.1 (31/03/2026): invoices between private parties. */
export const ALLEGATO_A = 'Allegato A, Specifiche tecniche 1.9.1';
/** Specifiche tecniche operative del formato FatturaPA, 1.4 (31/01/2025). */
export const SPECIFICHE_FORMATO = 'Specifiche tecniche del formato FatturaPA 1.4';
/**
 * Specifiche tecniche del bollo, 1.3 (29/03/2023), annexed to the provvedimento of 4/2/2021: how
 * the Agenzia finds the invoices that lack the stamp duty.
 */
export const SPECIFICHE_BOLLO = 'Specifiche tecniche del bollo 1.3';

/**
 * Rappresentazione tabellare del tracciato fattura ordinaria, published with the Specifiche del
 * formato 1.4: its column "Controlli extra schema" gives the SdI codes field by field.
 */
export const RAPPRESENTAZIONE_TABELLARE =
  'Rappresentazione tabellare del tracciato fattura ordinaria';

/** Suggerimenti per la compilazione della FatturaPA, 1.6: the Agenzia's worked examples. */
export const SUGGERIMENTI = 'Suggerimenti per la compilazione della FatturaPA 1.6';

/** `Elenco controlli SdI 2.0, p. 12`; more pages as a string, `'19, 26'` or `'106–117'`. */
export function source(document: string, page: number | string): string {
  return `${document}, ${/[,–]/.test(String(page)) ? 'pp.' : 'p.'} ${page}`;
}

/** A field of the Rappresentazione tabellare, by its number: `2.1.1.9`. */
export function field(number: string): string {
  return `${RAPPRESENTAZIONE_TABELLARE}, ${number}`;
}
