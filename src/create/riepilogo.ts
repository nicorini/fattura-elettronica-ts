// Step 4 of createInvoice: one DatiRiepilogo per AliquotaIVA and Natura.
import Big from 'big.js';
import { percentOf, round2, sum, toBig } from '../arithmetic.js';
import type { DatiRiepilogo, Natura } from '../generated/model.js';
import { type Body, block, casse, lines, list, rateKey, text } from '../sdi/fields.js';

interface Group {
  /** The rate as the XSD writes it, `22.00`. */
  readonly AliquotaIVA: string;
  readonly Natura: Natura | undefined;
  /** The PrezzoTotale and ImportoContributoCassa of its lines and casse. */
  readonly importi: unknown[];
}

/** An amount of a DatiRiepilogo that later steps read. */
export type RiepilogoAmount = 'ImponibileImporto' | 'Imposta';

/**
 * A DatiRiepilogo of the user that the library leaves as it is, with a decimal rate: its rate and
 * Natura are of a DatiRiepilogo before it (`duplicate`), or of no line nor cassa.
 */
interface Leftover {
  readonly riepilogo: DatiRiepilogo;
  readonly path: string;
  readonly duplicate: boolean;
}

/** The DatiRiepilogo of a body after {@link fillDatiRiepilogo}, to explain an amount it lacks. */
export interface Riepiloghi {
  /**
   * Why a DatiRiepilogo of the user left as it is lacks one of `amounts(riepilogo)`, in Italian;
   * `undefined` if none does. Any other missing amount comes from a value of the input that
   * another problem already reports.
   */
  missing(amounts: (riepilogo: DatiRiepilogo) => readonly RiepilogoAmount[]): string | undefined;
}

/**
 * Builds DatiRiepilogo from the lines and then the DatiCassaPrevidenziale, in order of first
 * appearance: `22` and `22.00` are the same rate, written `22.00` in a DatiRiepilogo the library
 * creates. A DatiRiepilogo of the input with the same rate and Natura keeps its fields and gets the
 * missing amounts; one with a rate and Natura of no line nor cassa, or of one already taken by an
 * earlier DatiRiepilogo, stays as it is, after the others.
 */
export function fillDatiRiepilogo(body: Body): Riepiloghi {
  const servizi = block(body.block.DatiBeniServizi);
  if (servizi === undefined) return { missing: () => undefined };
  const groups = new Map<string, Group>();
  const parts = [
    ...lines(body).map(({ block: linea }) => ({ ...linea, importo: linea.PrezzoTotale })),
    ...casse(body).map(({ block: cassa }) => ({ ...cassa, importo: cassa.ImportoContributoCassa })),
  ];
  for (const part of parts) {
    const rate = rateKey(part.AliquotaIVA);
    if (rate === undefined) continue;
    const id = key(rate, part.Natura);
    const group = groups.get(id) ?? { AliquotaIVA: rate, Natura: part.Natura, importi: [] };
    group.importi.push(part.importo);
    groups.set(id, group);
  }

  const path = `${body.path}.DatiBeniServizi.DatiRiepilogo`;
  const given = list<unknown>(servizi.DatiRiepilogo).map((item, index) => ({
    riepilogo: item as DatiRiepilogo,
    path: `${path}[${index}]`,
  }));
  const claimed = new Set<unknown>();
  const result: unknown[] = [];
  for (const [id, group] of groups) {
    const found = given.find(
      ({ riepilogo }) => !claimed.has(riepilogo) && keyOf(block(riepilogo)) === id,
    );
    if (found !== undefined) claimed.add(found.riepilogo);
    result.push(complete(found?.riepilogo ?? summary(group), sum(new Big(0), group.importi)));
  }
  const leftovers: Leftover[] = [];
  for (const { riepilogo, path: at } of given) {
    if (claimed.has(riepilogo)) continue;
    result.push(riepilogo);
    // Without a decimal rate there is a create.number problem already.
    const id = keyOf(block(riepilogo));
    if (id !== undefined) leftovers.push({ riepilogo, path: at, duplicate: groups.has(id) });
  }
  servizi.DatiRiepilogo = result as DatiRiepilogo[];
  return {
    missing(amounts) {
      for (const { riepilogo, path: at, duplicate } of leftovers) {
        const field = amounts(riepilogo).find((name) => riepilogo[name] === undefined);
        if (field === undefined) continue;
        return duplicate
          ? `${at} non ha ${field} e ha la stessa AliquotaIVA e Natura di un DatiRiepilogo precedente: createInvoice completa solo il primo`
          : `${at} non ha ${field} e nessuna riga né cassa ha la sua AliquotaIVA e Natura: createInvoice non ha da cosa calcolarlo`;
      }
      return undefined;
    },
  };
}

function summary(group: Group): DatiRiepilogo {
  const riepilogo = { AliquotaIVA: group.AliquotaIVA } as DatiRiepilogo;
  if (group.Natura !== undefined) riepilogo.Natura = group.Natura;
  return riepilogo;
}

/** The riepilogo with ImponibileImporto (sum plus Arrotondamento) and Imposta, when missing. */
function complete(riepilogo: DatiRiepilogo, total: Big | undefined): DatiRiepilogo {
  const result = { ...riepilogo };
  if (result.ImponibileImporto === undefined && total !== undefined) {
    const imponibile = sum(total, [result.Arrotondamento ?? '0']);
    if (imponibile !== undefined) result.ImponibileImporto = round2(imponibile).toFixed(2);
  }
  const imponibile = toBig(result.ImponibileImporto);
  const aliquota = toBig(result.AliquotaIVA);
  if (result.Imposta === undefined && imponibile !== undefined && aliquota !== undefined) {
    result.Imposta = percentOf(imponibile, aliquota).toFixed(2);
  }
  return result;
}

function key(rate: string, natura: unknown): string {
  return `${rate} ${text(natura) ?? ''}`;
}

function keyOf(riepilogo: DatiRiepilogo | undefined): string | undefined {
  const rate = rateKey(riepilogo?.AliquotaIVA);
  return rate === undefined ? undefined : key(rate, riepilogo?.Natura);
}
