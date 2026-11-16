import Big from 'big.js';
import type { Problem } from '../../problem.js';
import { block, bodies, isOneOf, lines, list, text, toBig } from '../fields.js';
import { libraryWarning, type SdiRule } from '../rule.js';
import { SPECIFICHE_BOLLO, source } from '../sources.js';
import { amount } from './values.js';

// The criterion with which the Agenzia finds the invoices that lack the stamp duty and adds it
// itself (Specifiche tecniche del bollo 1.3, §§3-4, pp. 4-6). It is not the law: lines N1 and
// N3.4 may owe the stamp too, but the Agenzia doesn't look at them, and neither does the warning.
const NATURE = ['N2.1', 'N2.2', 'N3.5', 'N3.6', 'N4'] as const;
const NOT_SUBJECT = ['NB1', 'NB2', 'NB3'] as const;
const EXCLUDED_DOCUMENTS = ['TD16', 'TD17', 'TD18', 'TD19', 'TD28'] as const;
const EXCLUDED_REGIMES = ['RF05', 'RF06', 'RF07', 'RF08', 'RF09', 'RF10', 'RF11'] as const;
const THRESHOLD = new Big('77.47');

/**
 * `warn.bollo`: a body without `BolloVirtuale=SI` whose lines N2.1, N2.2, N3.5, N3.6 and N4,
 * except those marked NB1–NB3, sum to more than 77.47. Each body of a lotto is its own document.
 */
export const ruleBollo: SdiRule = (fattura) => {
  const header = block(fattura.FatturaElettronicaHeader);
  const regime = text(block(block(header?.CedentePrestatore)?.DatiAnagrafici)?.RegimeFiscale);
  const destinatario = text(block(header?.DatiTrasmissione)?.CodiceDestinatario);
  if (regime !== undefined && isOneOf(regime, EXCLUDED_REGIMES)) return [];
  if (destinatario === 'XXXXXXX') return [];
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const tipo = text(body.datiDocumento?.TipoDocumento);
    if (tipo !== undefined && isOneOf(tipo, EXCLUDED_DOCUMENTS)) continue;
    if (text(block(body.datiDocumento?.DatiBollo)?.BolloVirtuale) === 'SI') continue;
    let sum = new Big(0);
    for (const { block: linea } of lines(body)) {
      const natura = text(linea.Natura);
      const prezzo = toBig(linea.PrezzoTotale);
      if (natura === undefined || !isOneOf(natura, NATURE) || prezzo === undefined) continue;
      const marked = list(linea.AltriDatiGestionali).some((dati) => {
        const tipoDato = text(block(dati)?.TipoDato);
        return tipoDato !== undefined && isOneOf(tipoDato, NOT_SUBJECT);
      });
      if (!marked) sum = sum.plus(prezzo);
    }
    if (sum.lte(THRESHOLD)) continue;
    problems.push(
      libraryWarning(
        'warn.bollo',
        `${body.documento}.DatiBollo.BolloVirtuale`,
        `Le righe con natura N2.1, N2.2, N3.5, N3.6 o N4 sommano ${amount(sum)} €, più di 77,47: manca BolloVirtuale=SI, e l'Agenzia integra il bollo d'ufficio chiedendone il pagamento.`,
        { source: source(SPECIFICHE_BOLLO, 4) },
      ),
    );
  }
  return problems;
};
