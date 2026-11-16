// Every code a problem can have. The functions that make problems take these lists as types, so a
// code missing here does not compile; the public document of the checks (docs/controlli.md) lists
// the same codes, and a test compares the two. The library uses the lists only as types: they add
// nothing to the bundle.

import type { CreateInvoiceErrorCode, ParseErrorCode } from './errors.js';

/** The input is not a FatturaPA at all: the codes of `ParseError` (`ParseErrorCode`). */
export const xmlCodes = [
  'xml.malformed',
  'xml.notFatturaPA',
  'xml.encoding',
  'xml.doctype',
] as const;

/** Problems of structure, all with SdI code 00200. */
export const structureCodes = [
  'input.type',
  'xsd.required',
  'xsd.unexpected',
  'xsd.order',
  'xsd.namespace',
  'xsd.maxOccurs',
  'xsd.choice',
  'xsd.enumeration',
  'xsd.pattern',
  'xsd.length',
  'xsd.range',
] as const;

/** Checks of the SdI that give an error: the problem code is `sdi.<code>`. */
export const sdiErrorCodes = [
  '00300',
  '00301',
  '00302',
  '00303',
  '00304',
  '00305',
  '00306',
  '00313',
  '00330',
  '00400',
  '00401',
  '00403',
  '00409',
  '00411',
  '00413',
  '00414',
  '00415',
  '00417',
  '00418',
  '00419',
  '00420',
  '00421',
  '00422',
  '00423',
  '00424',
  '00425',
  '00427',
  '00428',
  '00429',
  '00430',
  '00437',
  '00438',
  '00443',
  '00444',
  '00445',
  '00471',
  '00472',
  '00473',
  '00474',
  '00475',
  '00476',
] as const;

/** Checks of the SdI with a part that is only a warning: the problem code is `sdi.<code>.warn`. */
export const sdiWarningCodes = [
  '00306',
  '00330',
  '00418',
  '00423',
  '00443',
  '00444',
  '00471',
  '00472',
  '00473',
] as const;

/** Warnings of the library, with no SdI code. */
export const libraryWarningCodes = [
  'warn.tolerance',
  'warn.riferimentoNormativo',
  'warn.partitaIva',
  'warn.codiceFiscale',
  'warn.idTrasmittenteMinuscolo',
  'warn.pecDestinatario',
] as const;

/** Problems of the input of createInvoice: the codes of `CreateInvoiceError`. */
export const createCodes = [
  'create.number',
  'create.scontoAmbiguo',
  'create.imponibileCassa',
  'create.importoTotaleDocumento',
] as const;

/** Errors of the library, with no SdI code. */
export const libraryErrorCodes = ['option.today', 'internal.rule'] as const;

export type StructureCode = (typeof structureCodes)[number];
export type SdiErrorCode = (typeof sdiErrorCodes)[number];
export type SdiWarningCode = (typeof sdiWarningCodes)[number];
export type LibraryWarningCode = (typeof libraryWarningCodes)[number];
export type LibraryErrorCode = (typeof libraryErrorCodes)[number];

/**
 * Every code a problem of `validate` can have (`Problem.code`); docs/controlli.md says what each
 * one means.
 *
 * A new check adds a code in a minor release, so a `switch` on the code should keep a `default`
 * branch. A `switch` with a `case` for every code and an exhaustive check in the `default`
 * (`const unhandled: never = problem.code`) stops compiling, on purpose, after an update that adds
 * a code. A code removed or renamed is a breaking change, named in the changelog; a new
 * `message` is a patch.
 *
 * @example
 * for (const problem of validate(fattura).problems) {
 *   switch (problem.code) {
 *     case 'sdi.00423':
 *       // a line whose PrezzoTotale is not PrezzoUnitario, after discounts, × Quantita
 *       break;
 *     default:
 *       // every other code, including those of future releases
 *   }
 * }
 */
export type ProblemCode =
  | ParseErrorCode
  | CreateInvoiceErrorCode
  | StructureCode
  | `sdi.${SdiErrorCode}`
  | `sdi.${SdiWarningCode}.warn`
  | LibraryWarningCode
  | LibraryErrorCode;

/** Every code the SdI would give (`Problem.sdiCode`): `00200` for every problem of structure. */
export type SdiCode = '00200' | SdiErrorCode;
