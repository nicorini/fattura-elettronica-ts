// Safe reads of the invoice, for every check of the SdI. The invoice may break the XSD (see
// SdiRule): a block may be missing or not an object, a repeatable field may be a single value or
// hold items that are not objects, a leaf may not be a string, a decimal may have spaces around
// it. These helpers turn all that into "nothing to judge": the problem of structure is already
// reported, and a check must never throw.
import Big from 'big.js';
import { codeLists } from '../generated/code-lists.js';
import type {
  DatiAnagraficiCessionario,
  DatiCassaPrevidenziale,
  DatiGeneraliDocumento,
  DatiRiepilogo,
  DettaglioLinee,
  FatturaElettronica,
  FatturaElettronicaBody,
  IdFiscale,
} from '../generated/model.js';

export const HEADER = 'FatturaElettronicaHeader';
export const TRASMISSIONE: string = `${HEADER}.DatiTrasmissione`;
export const CEDENTE: string = `${HEADER}.CedentePrestatore.DatiAnagrafici`;
export const CESSIONARIO: string = `${HEADER}.CessionarioCommittente.DatiAnagrafici`;

/** The values of a repeatable field: an array as is, a single value as one item, else none. */
export function list<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value as T];
}

/** `value` if it is a string, else `undefined`. */
export function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Whether `value` is one of `codes`: the codes are typed, so a misspelt one doesn't compile. */
export function isOneOf<Code extends string>(value: string, codes: readonly Code[]): value is Code {
  return (codes as readonly string[]).includes(value);
}

/** `value` if it is an object (a block of the model), else `undefined`. */
export function block<T>(value: T | undefined): T | undefined {
  return typeof value === 'object' && value !== null ? value : undefined;
}

/** A block of the invoice and its path, as in `Problem.path`. */
export interface Located<T> {
  readonly block: T;
  readonly path: string;
}

/** The blocks of a repeatable field at `path`, indexed; items that are not objects are skipped. */
export function blocks<T>(value: T | readonly T[] | undefined, path: string): Located<T>[] {
  return list(value).flatMap((item, index) =>
    block(item) === undefined ? [] : [{ block: item, path: `${path}[${index}]` }],
  );
}

/** A body of the invoice, its path and its `DatiGeneraliDocumento`. */
export interface Body {
  readonly body: FatturaElettronicaBody;
  /** `FatturaElettronicaBody[0]`. */
  readonly path: string;
  /** The path of its `DatiGeneraliDocumento`. */
  readonly documento: string;
  readonly datiDocumento: DatiGeneraliDocumento | undefined;
}

/** Each body of the invoice that is an object. */
export function bodies(fattura: FatturaElettronica): Body[] {
  return blocks(fattura.FatturaElettronicaBody, 'FatturaElettronicaBody').map(
    ({ block: body, path }) => ({
      body,
      path,
      documento: `${path}.DatiGenerali.DatiGeneraliDocumento`,
      datiDocumento: block(block(body.DatiGenerali)?.DatiGeneraliDocumento),
    }),
  );
}

/** The lines of a body (`DettaglioLinee`). */
export function lines({ body, path }: Body): Located<DettaglioLinee>[] {
  return blocks(
    block(body.DatiBeniServizi)?.DettaglioLinee,
    `${path}.DatiBeniServizi.DettaglioLinee`,
  );
}

/** The summaries of a body (`DatiRiepilogo`). */
export function riepiloghi({ body, path }: Body): Located<DatiRiepilogo>[] {
  return blocks(
    block(body.DatiBeniServizi)?.DatiRiepilogo,
    `${path}.DatiBeniServizi.DatiRiepilogo`,
  );
}

/** The contributions to a pension fund of a body (`DatiCassaPrevidenziale`). */
export function casse({ datiDocumento, documento }: Body): Located<DatiCassaPrevidenziale>[] {
  return blocks(datiDocumento?.DatiCassaPrevidenziale, `${documento}.DatiCassaPrevidenziale`);
}

/**
 * The blocks of a body with a rate and a Natura that a DatiRiepilogo must cover: cassa first,
 * then lines, as the Elenco controlli reads them.
 */
export function summarized(body: Body): Located<DatiCassaPrevidenziale | DettaglioLinee>[] {
  return [...casse(body), ...lines(body)];
}

/** Each body with its `TipoDocumento`, when it is a string. */
export function documentTypes(fattura: FatturaElettronica): (Body & { readonly tipo: string })[] {
  return bodies(fattura).flatMap((entry) => {
    const tipo = text(entry.datiDocumento?.TipoDocumento);
    return tipo === undefined ? [] : [{ ...entry, tipo }];
  });
}

/** The `IdFiscaleIVA` of the supplier and of the customer, when they are there. */
export function parties(fattura: FatturaElettronica): {
  readonly cedente: IdFiscale | undefined;
  readonly cessionario: IdFiscale | undefined;
  /** The customer's data, to tell "no IdFiscaleIVA" from "no block at all". */
  readonly cessionarioAnagrafici: DatiAnagraficiCessionario | undefined;
} {
  const header = block(fattura.FatturaElettronicaHeader);
  const cedente = block(block(block(header?.CedentePrestatore)?.DatiAnagrafici)?.IdFiscaleIVA);
  const anagrafici = block(block(header?.CessionarioCommittente)?.DatiAnagrafici);
  return {
    cedente,
    cessionario: block(anagrafici?.IdFiscaleIVA),
    cessionarioAnagrafici: anagrafici,
  };
}

/**
 * The `AAAA-MM-GG` part of an `xs:date`, or `undefined` if it is not one. The XSD collapses
 * spaces around it and allows a time zone after it (`2025-01-15+01:00`), which the SdI's
 * comparisons of dates don't use.
 */
export function day(value: unknown): string | undefined {
  return text(value)
    ?.trim()
    .match(/^\d{4}-\d{2}-\d{2}(?=$|Z|[+-]\d{2}:\d{2}$)/)?.[0];
}

/** A decimal of the invoice (`xs:decimal` allows spaces around it), or `undefined`. */
export function toBig(value: unknown): Big | undefined {
  const trimmed = text(value)?.trim();
  return trimmed !== undefined && /^-?\d+(?:\.\d+)?$/.test(trimmed) ? new Big(trimmed) : undefined;
}

/** A rate as a key, so `22.00` and ` 22.00 ` group together; `undefined` if not a decimal. */
export function rateKey(value: unknown): string | undefined {
  return toBig(value)?.toFixed(2);
}

const NATURE: ReadonlySet<unknown> = new Set(codeLists.Natura.map(({ code }) => code));

/**
 * Whether `value` is a Natura the XSD refuses (empty, unknown, not a string): nothing to judge for
 * the checks on Natura, and not the same as no Natura.
 */
export function refusedNatura(value: unknown): boolean {
  return value !== undefined && !NATURE.has(value);
}
