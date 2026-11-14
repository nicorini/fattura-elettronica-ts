// Type tests: `pnpm typecheck` fails if a `@ts-expect-error` line compiles.
import { expectTypeOf, test } from 'vitest';
import type {
  Anagrafica,
  DatiGeneraliDocumento,
  FatturaElettronica,
  RappresentanteFiscaleCessionario,
  TipoDocumento,
} from '../src/index.js';

test('Anagrafica takes Denominazione or Nome + Cognome, never both', () => {
  const company: Anagrafica = { Denominazione: 'ALPHA SRL' };
  const person: Anagrafica = { Nome: 'MARIO', Cognome: 'ROSSI', Titolo: 'DOTT' };
  // @ts-expect-error Denominazione excludes Nome
  const both: Anagrafica = { Denominazione: 'ALPHA SRL', Nome: 'MARIO', Cognome: 'ROSSI' };
  // @ts-expect-error Nome needs Cognome
  const halfPerson: Anagrafica = { Nome: 'MARIO' };
  expectTypeOf([company, person, both, halfPerson]).toEqualTypeOf<Anagrafica[]>();
});

test('the fiscal representative of the buyer has the same choice', () => {
  const representative: RappresentanteFiscaleCessionario = {
    IdFiscaleIVA: { IdPaese: 'IT', IdCodice: '01234567890' },
    Denominazione: 'BETA SRL',
  };
  // @ts-expect-error Denominazione excludes Cognome
  const both: RappresentanteFiscaleCessionario = { ...representative, Cognome: 'ROSSI' };
  expectTypeOf([representative, both]).toEqualTypeOf<RappresentanteFiscaleCessionario[]>();
});

test('a repeatable field is always an array, and every leaf a string', () => {
  expectTypeOf<FatturaElettronica['FatturaElettronicaBody']>().toBeArray();
  expectTypeOf<DatiGeneraliDocumento['Causale']>().toEqualTypeOf<string[] | undefined>();
  expectTypeOf<DatiGeneraliDocumento['ImportoTotaleDocumento']>().toEqualTypeOf<
    string | undefined
  >();
  const single: Pick<DatiGeneraliDocumento, 'Causale'> = {
    // @ts-expect-error a single Causale is still an array
    Causale: 'VENDITA',
  };
  const amount: Pick<DatiGeneraliDocumento, 'ImportoTotaleDocumento'> = {
    // @ts-expect-error amounts are strings, numbers go through decimal()
    ImportoTotaleDocumento: 5,
  };
  expectTypeOf([single, amount]).toBeArray();
});

test('code lists are unions of literals', () => {
  expectTypeOf<'TD01'>().toExtend<TipoDocumento>();
  expectTypeOf<'TD07'>().not.toExtend<TipoDocumento>();
  expectTypeOf<FatturaElettronica['versione']>().toEqualTypeOf<'FPA12' | 'FPR12'>();
});

test('the root keeps the XSD attribute names and the signature as a string', () => {
  expectTypeOf<FatturaElettronica['SistemaEmittente']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<FatturaElettronica['Signature']>().toEqualTypeOf<string | undefined>();
});
