import { describe, expect, test } from 'vitest';
import {
  type CreateInvoiceInput,
  createInvoice,
  type FatturaElettronica,
  validate,
} from '../src/index.js';
import { firstBody, fpr12, fpr12Input } from './helpers/invoices.js';

/** createInvoice, checking the invariant of every test: its output is exact for validate. */
function create(input: CreateInvoiceInput): FatturaElettronica {
  const fattura = createInvoice(input);
  const problems = validate(fattura, { today: '2025-01-20' }).problems;
  expect(problems.filter((p) => p.severity === 'error' || p.code === 'warn.tolerance')).toEqual([]);
  return fattura;
}

describe('createInvoice', () => {
  test('fills PrezzoTotale, DatiRiepilogo and ImportoTotaleDocumento from the lines', () => {
    const expected = fpr12();
    firstBody(expected).DatiBeniServizi.DatiRiepilogo = [
      { AliquotaIVA: '22.00', ImponibileImporto: '100.00', Imposta: '22.00' },
    ];
    expect(create(fpr12Input())).toEqual(expected);
  });
});
