// A check of the SdI that throws is a bug of the library. validate never throws: the bug becomes an
// error, so that build doesn't write an invoice it could not check. No real check throws, so this
// file adds one that does to the list validate runs.
import { describe, expect, test, vi } from 'vitest';
import { BuildError, build, validate } from '../src/index.js';
import { fpr12 } from './helpers/invoices.js';

vi.mock('../src/sdi/rules.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/sdi/rules.js')>();
  const broken = () => {
    throw new TypeError('boom');
  };
  return { sdiRules: [...original.sdiRules, broken] };
});

describe('a check of the SdI that throws', () => {
  test('is the error internal.rule on the whole document, and validate goes on', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.FormatoTrasmissione = 'FPA12';
    fattura.FatturaElettronicaHeader.DatiTrasmissione.CodiceDestinatario = 'UFABCD';
    const result = validate(fattura);
    expect(result.valid).toBe(false);
    expect(result.problems).toEqual([
      {
        code: 'internal.rule',
        path: '',
        message:
          'Un controllo della libreria si è interrotto per un errore interno (TypeError: boom): la fattura non è stata controllata del tutto. È un difetto della libreria: segnalalo nelle issue del progetto.',
        severity: 'error',
      },
      expect.objectContaining({ code: 'sdi.00428' }),
    ]);
  });

  test('is reported also on an invoice that breaks the XSD', () => {
    const fattura = fpr12();
    fattura.FatturaElettronicaHeader.DatiTrasmissione.ProgressivoInvio = '';
    const codes = validate(fattura).problems.map(({ code }) => code);
    expect(codes).toContain('internal.rule');
  });

  test('stops build', () => {
    expect(() => build(fpr12())).toThrow(BuildError);
  });
});
