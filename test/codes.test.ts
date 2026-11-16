// The public document of the checks lists exactly the codes the library can give. The functions
// that make problems take the lists of src/codes.ts as types, so no other code compiles.
import { readdirSync, readFileSync } from 'node:fs';
import { expect, expectTypeOf, test } from 'vitest';
import {
  createCodes,
  libraryErrorCodes,
  libraryWarningCodes,
  sdiErrorCodes,
  sdiWarningCodes,
  structureCodes,
  xmlCodes,
} from '../src/codes.js';
import type {
  CreateInvoiceErrorCode,
  ParseErrorCode,
  Problem,
  ProblemCode,
  SdiCode,
} from '../src/index.js';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const codes = [
  ...xmlCodes,
  ...createCodes,
  ...structureCodes,
  ...sdiErrorCodes.map((code) => `sdi.${code}` as const),
  ...sdiWarningCodes.map((code) => `sdi.${code}.warn` as const),
  ...libraryWarningCodes,
  ...libraryErrorCodes,
];

test('the codes of ParseError are the xml codes', () => {
  expectTypeOf<(typeof xmlCodes)[number]>().toEqualTypeOf<ParseErrorCode>();
});

test('the codes of CreateInvoiceError are the create codes', () => {
  expectTypeOf<(typeof createCodes)[number]>().toEqualTypeOf<CreateInvoiceErrorCode>();
});

test('ProblemCode is exactly the listed codes', () => {
  expectTypeOf<(typeof codes)[number]>().toEqualTypeOf<ProblemCode>();
  expectTypeOf<'sdi.00423'>().toExtend<ProblemCode>();
  expectTypeOf<'sdi.0423'>().not.toExtend<ProblemCode>();
  expectTypeOf<'sdi.00423.warn'>().toExtend<ProblemCode>();
  expectTypeOf<'sdi.00401.warn'>().not.toExtend<ProblemCode>();
});

test('a problem has a ProblemCode and, if any, a SdiCode', () => {
  expectTypeOf<Problem['code']>().toEqualTypeOf<ProblemCode>();
  expectTypeOf<Problem['sdiCode']>().toEqualTypeOf<SdiCode | undefined>();
});

test('SdiCode is 00200 and the codes of the SdI errors', () => {
  expectTypeOf<SdiCode>().toEqualTypeOf<'00200' | (typeof sdiErrorCodes)[number]>();
});

test('the document of the checks lists every code, and no other', () => {
  // Every code written in backticks, wherever it is in the document.
  const documented = read('../docs/controlli.md').match(
    /(?<=`)(?:(?:xml|xsd|input|warn|option|internal|create)\.[A-Za-z]+|sdi\.\d{5}(?:\.warn)?)(?=`)/g,
  );
  expect(new Set(documented)).toEqual(new Set(codes));
});

test('every listed code is used by the source', () => {
  // The hand-written source, without the lists themselves.
  const source = readdirSync(new URL('../src/', import.meta.url), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.ts') && file !== 'codes.ts' && !file.startsWith('generated'))
    .map((file) => read(`../src/${file}`))
    .join('\n');
  const unused = [
    ...xmlCodes,
    ...createCodes,
    ...structureCodes,
    ...sdiErrorCodes,
    ...sdiWarningCodes,
    ...libraryWarningCodes,
    ...libraryErrorCodes,
  ].filter((code) => !new RegExp(`['"\`]${code.replace('.', '\\.')}['"\`]`).test(source));
  expect(unused).toEqual([]);
});
