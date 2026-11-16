// The fields that CreateInvoiceInput makes optional are exactly the ones createInvoice computes.
import { expect, test } from 'vitest';
import { createInvoice, type FatturaElettronica } from '../../src/index.ts';
import { fpr12Input } from '../../test/helpers/invoices.ts';
import { COMPUTED_FIELDS } from './emit-input.ts';

test('createInvoice fills every computed field of the generator, and no other is optional', () => {
  const input = fpr12Input();
  const documento = input.FatturaElettronicaBody[0]?.DatiGenerali.DatiGeneraliDocumento;
  if (documento !== undefined) {
    documento.DatiCassaPrevidenziale = [
      { TipoCassa: 'TC04', AlCassa: '4.00', ImponibileCassa: '100.00', AliquotaIVA: '22.00' },
    ];
  }
  const fattura: FatturaElettronica = createInvoice(input);
  const [body] = fattura.FatturaElettronicaBody;
  // One block of each model type with a computed field, from the output.
  const blocks: { readonly [type: string]: object | undefined } = {
    DettaglioLinee: body?.DatiBeniServizi.DettaglioLinee[0],
    DatiBeniServizi: body?.DatiBeniServizi,
    DatiRiepilogo: body?.DatiBeniServizi.DatiRiepilogo[0],
    DatiCassaPrevidenziale: body?.DatiGenerali.DatiGeneraliDocumento.DatiCassaPrevidenziale?.[0],
    DatiGeneraliDocumento: body?.DatiGenerali.DatiGeneraliDocumento,
  };
  expect(Object.keys(COMPUTED_FIELDS).sort()).toEqual(Object.keys(blocks).sort());
  for (const [type, fields] of Object.entries(COMPUTED_FIELDS)) {
    for (const field of fields) expect(blocks[type], `${type}.${field}`).toHaveProperty(field);
  }
});
