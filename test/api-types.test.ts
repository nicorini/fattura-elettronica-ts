// The shape of the public API that only the compiler sees: named options and read-only results.
// These assertions fail at `pnpm typecheck`, not at run time.
import { expectTypeOf, test } from 'vitest';
import {
  type BuildOptions,
  build,
  type CreateInvoiceError,
  type CreateInvoiceErrorCode,
  type CreateInvoiceInput,
  type CreateInvoiceProblem,
  createInvoice,
  type FatturaElettronica,
  type Natura,
  type Problem,
  type ProblemCode,
  type ValidateOptions,
  type ValidationResult,
  validate,
} from '../src/index.js';

test('validate and build take named options, and build has every option of validate', () => {
  expectTypeOf(validate).parameter(1).toEqualTypeOf<ValidateOptions | undefined>();
  expectTypeOf(build).parameter(1).toEqualTypeOf<BuildOptions | undefined>();
  expectTypeOf<BuildOptions>().toExtend<ValidateOptions>();
});

test('the problems of a result are read-only', () => {
  expectTypeOf<ValidationResult['problems']>().toEqualTypeOf<readonly Problem[]>();
});

type Body = CreateInvoiceInput['FatturaElettronicaBody'][number];
type Servizi = Body['DatiBeniServizi'];
type Linea = Servizi['DettaglioLinee'][number];
type Riepilogo = NonNullable<Servizi['DatiRiepilogo']>[number];
type Documento = Body['DatiGenerali']['DatiGeneraliDocumento'];

test('createInvoice takes the model with the computed fields optional, and returns the model', () => {
  expectTypeOf(createInvoice).parameter(0).toEqualTypeOf<CreateInvoiceInput>();
  expectTypeOf(createInvoice).returns.toEqualTypeOf<FatturaElettronica>();
  expectTypeOf<Linea>().toHaveProperty('PrezzoTotale');
  expectTypeOf<{ PrezzoTotale?: string | number }>().toExtend<Pick<Linea, 'PrezzoTotale'>>();
  expectTypeOf<Pick<Linea, 'PrezzoTotale'>>().toEqualTypeOf<{ PrezzoTotale?: string | number }>();
  expectTypeOf<Omit<Servizi, 'DatiRiepilogo'>>().toExtend<Servizi>();
  expectTypeOf<Pick<Riepilogo, 'ImponibileImporto' | 'Imposta'>>().toEqualTypeOf<{
    ImponibileImporto?: string | number;
    Imposta?: string | number;
  }>();
  expectTypeOf<Documento['ImportoTotaleDocumento']>().toEqualTypeOf<string | number | undefined>();
  expectTypeOf<
    NonNullable<Documento['DatiCassaPrevidenziale']>[number]['ImportoContributoCassa']
  >().toEqualTypeOf<string | number | undefined>();
});

test('the decimals of the input take a string or a number, the other leaves only a string', () => {
  expectTypeOf<Linea['PrezzoUnitario']>().toEqualTypeOf<string | number>();
  expectTypeOf<Linea['Quantita']>().toEqualTypeOf<string | number | undefined>();
  expectTypeOf<Linea['AliquotaIVA']>().toEqualTypeOf<string | number>();
  expectTypeOf<Riepilogo['Arrotondamento']>().toEqualTypeOf<string | number | undefined>();
  expectTypeOf<Linea['NumeroLinea']>().toEqualTypeOf<string>();
  expectTypeOf<Linea['Descrizione']>().toEqualTypeOf<string>();
  expectTypeOf<Documento['Data']>().toEqualTypeOf<string>();
  expectTypeOf<Linea['Natura']>().toEqualTypeOf<Natura | undefined>();
  // Fields that are neither decimal nor computed keep the type of the model.
  expectTypeOf<CreateInvoiceInput['FatturaElettronicaHeader']['DatiTrasmissione']>().toEqualTypeOf<
    FatturaElettronica['FatturaElettronicaHeader']['DatiTrasmissione']
  >();
});

test('a CreateInvoiceError lists its problems, each with a CreateInvoiceErrorCode', () => {
  expectTypeOf<CreateInvoiceError>().toExtend<Error>();
  expectTypeOf<CreateInvoiceError['problems']>().toEqualTypeOf<readonly CreateInvoiceProblem[]>();
  expectTypeOf<CreateInvoiceProblem['code']>().toEqualTypeOf<CreateInvoiceErrorCode>();
  expectTypeOf<CreateInvoiceErrorCode>().toEqualTypeOf<
    | 'create.number'
    | 'create.scontoAmbiguo'
    | 'create.imponibileCassa'
    | 'create.importoTotaleDocumento'
  >();
  expectTypeOf<CreateInvoiceErrorCode>().toExtend<ProblemCode>();
});
