import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { translatePattern } from './pattern.ts';
import { readSchema } from './xsd.ts';

/** Whether the XSD pattern matches the whole of `value`, once translated. */
function matches(pattern: string, value: string): boolean {
  return new RegExp(translatePattern(pattern), 'u').test(value);
}

describe('translatePattern', () => {
  test('anchors the pattern: XSD patterns always match the whole value', () => {
    expect(matches('[A-Z]{2}', 'IT')).toBe(true);
    expect(matches('[A-Z]{2}', 'xIT')).toBe(false);
    expect(matches('[A-Z]{2}', 'ITx')).toBe(false);
  });

  test('anchors around alternatives too', () => {
    expect(matches('ab|cd', 'ab')).toBe(true);
    expect(matches('ab|cd', 'abd')).toBe(false);
    expect(matches('ab|cd', 'acd')).toBe(false);
  });

  test('turns the IsBasicLatin block into the range U+0000-U+007F', () => {
    expect(matches('\\p{IsBasicLatin}{1,3}', 'a~\u007f')).toBe(true);
    expect(matches('\\p{IsBasicLatin}{1,3}', '\u0000')).toBe(true);
    expect(matches('\\p{IsBasicLatin}{1,3}', 'è')).toBe(false);
  });

  test('turns the IsLatin-1Supplement block into the range U+0080-U+00FF, also inside a class', () => {
    const pattern = '[\\p{IsBasicLatin}\\p{IsLatin-1Supplement}]{1,3}';
    expect(matches(pattern, 'aè\u00ff')).toBe(true);
    expect(matches(pattern, '\u0080')).toBe(true);
    expect(matches(pattern, '€')).toBe(false);
    expect(matches(pattern, 'Ā')).toBe(false);
  });

  test('counts characters, not UTF-16 units, in quantifiers', () => {
    expect(matches('.{1,2}', '😀😀')).toBe(true);
  });

  test('keeps classes with ranges, an escaped hyphen and a trailing hyphen', () => {
    expect(matches('[\\-]?[0-9]{1,11}\\.[0-9]{2}', '-12.50')).toBe(true);
    expect(matches('[\\-]?[0-9]{1,11}\\.[0-9]{2}', '12.5')).toBe(false);
    expect(matches("[!#-'*+/-9=?A-Z^-~-]+", "a-b'c^~")).toBe(true);
    expect(matches("[!#-'*+/-9=?A-Z^-~-]+", 'a b')).toBe(false);
  });

  test('keeps character class excluding letters, as in BICType', () => {
    expect(matches('[A-NP-Z0-9]', 'O')).toBe(false);
    expect(matches('[A-NP-Z0-9]', 'P')).toBe(true);
  });

  test('keeps the quantifiers ?, *, +, {n}, {n,m} and {0,1} on groups', () => {
    expect(matches('a?b*c+', 'bbcc')).toBe(true);
    expect(matches('a?b*c+', 'ab')).toBe(false);
    expect(matches('[0-9]{5}', '1234')).toBe(false);
    expect(matches('[A-Z]{6}([A-Z0-9]{3}){0,1}', 'ABCDEF')).toBe(true);
    expect(matches('[A-Z]{6}([A-Z0-9]{3}){0,1}', 'ABCDEFXYZ')).toBe(true);
    expect(matches('[A-Z]{6}([A-Z0-9]{3}){0,1}', 'ABCDEFXY')).toBe(false);
  });

  test('a dot matches any character but line breaks, U+2028 included', () => {
    expect(matches('.+@.+[.]+.+', 'a@b.it')).toBe(true);
    expect(matches('.', '\u2028')).toBe(true);
    expect(matches('.', '\n')).toBe(false);
    expect(matches('.', '\r')).toBe(false);
  });

  test('keeps the escapes of special characters and of tab, quote and backslash', () => {
    expect(matches('\\[\\]\\(\\)\\{\\}\\|\\*\\+\\?\\.\\\\', '[](){}|*+?.\\')).toBe(true);
    expect(matches('"(\\\\[\\t -~])+"', '"\\\t\\a"')).toBe(true);
  });

  test('reads ^ and $ as plain characters, not anchors', () => {
    expect(matches('a^b$', 'a^b$')).toBe(true);
    expect(matches('[$^]', '^')).toBe(true);
  });

  test('refuses the constructs it does not translate', () => {
    expect(() => translatePattern('\\d')).toThrow(/Unsupported/);
    expect(() => translatePattern('\\p{L}')).toThrow(/Unsupported/);
    expect(() => translatePattern('\\P{IsBasicLatin}')).toThrow(/Unsupported/);
    expect(() => translatePattern('[a-z-[aeiou]]')).toThrow(/Unsupported/);
    expect(() => translatePattern('\\i\\c*')).toThrow(/Unsupported/);
  });

  test('translates every pattern of the FatturaPA XSD into a valid regular expression', () => {
    const xsd = readFileSync(
      new URL('../../specs/fatturapa-1.2.3/Schema_VFPR12_v1.2.3.xsd', import.meta.url),
      'utf8',
    );
    const patterns = readSchema(xsd).simpleTypes.flatMap((type) => type.patterns);
    expect(patterns.length).toBeGreaterThan(20);
    for (const pattern of patterns) {
      expect(() => new RegExp(translatePattern(pattern), 'u')).not.toThrow();
    }
  });

  test('translates the EmailType pattern of the XSD', () => {
    const email =
      "([!#-'*+/-9=?A-Z^-~-]+(\\.[!#-'*+/-9=?A-Z^-~-]+)*|\"(\\[\\]!#-[^-~ \\t]|(\\\\[\\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\\.[!#-'*+/-9=?A-Z^-~-]+)*|\\[[\\t -Z^-~]*\\])";
    expect(matches(email, 'mario.rossi@pec.it')).toBe(true);
    expect(matches(email, 'mario rossi@pec.it')).toBe(false);
    expect(matches(email, 'mario@[127.0.0.1]')).toBe(true);
    expect(matches(email, 'mario')).toBe(false);
  });
});
