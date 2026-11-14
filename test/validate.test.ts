import { describe, expect, test } from 'vitest';
import { parse, validate } from '../src/index.js';
import { official } from './helpers/fixtures.js';
import { libxml2Verdict } from './helpers/oracle.js';

const validExamples = [
  'IT01234567890_FPA01',
  'IT01234567890_FPA02',
  'IT01234567890_FPA03',
  'IT01234567890_FPR01',
  'IT01234567890_FPR03',
];

/** Problems of structure only: the SdI checks are tested on their own. */
const structural = (problems: readonly { code: string }[]) =>
  problems.filter(
    (problem) => !problem.code.startsWith('sdi.') && !problem.code.startsWith('warn.'),
  );

describe('the official examples', () => {
  test.each(validExamples)('%s has no structural problems, as XML and as object', (name) => {
    const xml = official(name);
    expect(libxml2Verdict(xml).valid).toBe(true);
    expect(structural(validate(xml).problems)).toEqual([]);
    expect(structural(validate(parse(xml)).problems)).toEqual([]);
  });

  test('FPR02 has ContattiTrasmittente out of order, which libxml2 refuses too', () => {
    const xml = official('IT01234567890_FPR02');
    expect(libxml2Verdict(xml).valid).toBe(false);
    const result = validate(xml);
    expect(result.valid).toBe(false);
    expect(structural(result.problems)).toEqual([
      expect.objectContaining({
        code: 'xsd.order',
        sdiCode: '00200',
        path: 'FatturaElettronicaHeader.DatiTrasmissione.ContattiTrasmittente',
        severity: 'error',
      }),
    ]);
  });
});
