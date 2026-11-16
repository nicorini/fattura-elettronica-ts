// Step 4 of createInvoice: one DatiRiepilogo per AliquotaIVA and Natura.
import Big from 'big.js';
import type { DatiRiepilogo, Natura } from '../generated/model.js';
import { type Body, block, casse, lines, list, rateKey, text, toBig } from '../sdi/fields.js';
import { round2 } from '../sdi/vat/values.js';

interface Group {
  readonly AliquotaIVA: string;
  readonly Natura: Natura | undefined;
  /** Σ PrezzoTotale and ImportoContributoCassa; undefined if one of them can't be read. */
  sum: Big | undefined;
}

/**
 * Builds DatiRiepilogo from the lines and then the DatiCassaPrevidenziale, in order of first
 * appearance: `22` and `22.00` are the same rate. A DatiRiepilogo of the input with the same rate
 * and Natura keeps its fields and gets the missing amounts; one with a rate and Natura of no line
 * nor cassa stays as it is, after the others.
 */
export function fillDatiRiepilogo(body: Body): void {
  const servizi = block(body.body.DatiBeniServizi);
  if (servizi === undefined) return;
  const groups = new Map<string, Group>();
  const parts = [
    ...lines(body).map(({ block: linea }) => ({ ...linea, importo: linea.PrezzoTotale })),
    ...casse(body).map(({ block: cassa }) => ({ ...cassa, importo: cassa.ImportoContributoCassa })),
  ];
  for (const part of parts) {
    const rate = rateKey(part.AliquotaIVA);
    if (rate === undefined) continue;
    const id = key(rate, part.Natura);
    const group = groups.get(id) ?? {
      AliquotaIVA: part.AliquotaIVA,
      Natura: part.Natura,
      sum: new Big(0),
    };
    const importo = toBig(part.importo);
    group.sum = importo === undefined ? undefined : group.sum?.plus(importo);
    groups.set(id, group);
  }

  const given = list<unknown>(servizi.DatiRiepilogo);
  const claimed = new Set<unknown>();
  const result: unknown[] = [];
  for (const [id, group] of groups) {
    const riepilogo = given.find(
      (item) => !claimed.has(item) && keyOf(block(item as DatiRiepilogo)) === id,
    ) as DatiRiepilogo | undefined;
    if (riepilogo !== undefined) claimed.add(riepilogo);
    result.push(complete(riepilogo ?? summary(group), group.sum));
  }
  result.push(...given.filter((item) => !claimed.has(item)));
  servizi.DatiRiepilogo = result as DatiRiepilogo[];
}

function summary(group: Group): DatiRiepilogo {
  const riepilogo = { AliquotaIVA: group.AliquotaIVA } as DatiRiepilogo;
  if (group.Natura !== undefined) riepilogo.Natura = group.Natura;
  return riepilogo;
}

/** The riepilogo with ImponibileImporto (sum plus Arrotondamento) and Imposta, when missing. */
function complete(riepilogo: DatiRiepilogo, sum: Big | undefined): DatiRiepilogo {
  const result = { ...riepilogo };
  const arrotondamento =
    result.Arrotondamento === undefined ? new Big(0) : toBig(result.Arrotondamento);
  if (result.ImponibileImporto === undefined && sum !== undefined && arrotondamento !== undefined) {
    result.ImponibileImporto = round2(sum.plus(arrotondamento)).toFixed(2);
  }
  const imponibile = toBig(result.ImponibileImporto);
  const aliquota = toBig(result.AliquotaIVA);
  if (result.Imposta === undefined && imponibile !== undefined && aliquota !== undefined) {
    result.Imposta = round2(imponibile.times(aliquota).times('0.01')).toFixed(2);
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
