// A check of structure that throws is a bug of the library, like a check of the SdI that throws
// (validate-internal.test.ts): validate never throws, the bug becomes the error internal.rule. No
// real check of structure throws, so the XML case replaces the check with one that does.
import { describe, expect, test, vi } from 'vitest';
import { BuildError, build, validate } from '../src/index.js';
import { fpr12 } from './helpers/invoices.js';

const { failing } = vi.hoisted(() => ({ failing: { xml: false } }));

vi.mock('../src/validation/xml.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/validation/xml.js')>();
  return {
    ...original,
    checkXml: (...args: Parameters<typeof original.checkXml>) => {
      if (failing.xml) throw new TypeError('boom');
      original.checkXml(...args);
    },
  };
});

const internalRule = {
  code: 'internal.rule',
  path: '',
  message:
    'Un controllo della libreria si è interrotto per un errore interno (TypeError: boom): la fattura non è stata controllata del tutto. È un difetto della libreria: segnalalo nelle issue del progetto.',
  severity: 'error',
};

describe('a check of structure that throws', () => {
  test('on XML is the error internal.rule, not an exception', () => {
    const xml = build(fpr12());
    failing.xml = true;
    try {
      expect(validate(xml)).toEqual({ valid: false, problems: [internalRule] });
    } finally {
      failing.xml = false;
    }
  });

  test('on an object is the error internal.rule, not an exception', () => {
    // An object whose getter throws: the walk of structure reads it and fails.
    const fattura = fpr12();
    Object.defineProperty(fattura.FatturaElettronicaHeader, 'DatiTrasmissione', {
      enumerable: true,
      get() {
        throw new TypeError('boom');
      },
    });
    expect(validate(fattura)).toEqual({ valid: false, problems: [internalRule] });
    expect(() => build(fattura)).toThrow(BuildError);
  });
});
