import { expect, test } from 'vitest';
import { decimal } from '../src/index.js';

test.each([
  [5, '5.00'],
  [1.5, '1.50'],
  [-2.5, '-2.50'],
  [0, '0.00'],
  [1234.56, '1234.56'],
])('pads %s to two decimals: %s', (value, expected) => {
  expect(decimal(value)).toBe(expected);
});

test('keeps more decimals as they are, without rounding', () => {
  expect(decimal(12.345)).toBe('12.345');
  expect(decimal(0.12345678)).toBe('0.12345678');
});

test('accepts 15 significant digits', () => {
  expect(decimal(12345678901.1234)).toBe('12345678901.1234');
});

test.each([
  ['0.1 + 0.2', 0.1 + 0.2],
  ['1e21', 1e21],
  ['1e-7', 1e-7],
  ['Infinity', Number.POSITIVE_INFINITY],
  ['-Infinity', Number.NEGATIVE_INFINITY],
  ['NaN', Number.NaN],
  ['16 significant digits', 1234567890.123456],
  // biome-ignore lint/correctness/noPrecisionLoss: the lost precision is what this case tests
  ['a float that lost digits', 12345678901.12345678],
])('throws RangeError for %s', (_, value) => {
  expect(() => decimal(value)).toThrow(RangeError);
});
