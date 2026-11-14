// The XML comparison used by the round-trip tests: it must forgive only what parse and build may
// change without changing the data (spaces between tags, prefixes, order of the attributes,
// namespace declarations), and nothing else.
import { describe, expect, test } from 'vitest';
import { normalizeXml } from './helpers/xml.js';

const NS = 'http://example.com/ns';

describe('normalizeXml', () => {
  test('ignores spaces between tags, prefixes, attribute order and namespace declarations', () => {
    const a = `<?xml version="1.0"?>\n<p:R xmlns:p="${NS}" xmlns:x="urn:unused" b="2" a="1">\r\n  <C>\n    <D>v</D>\n  </C>\n</p:R>`;
    const b = `<q:R a="1" b="2" xmlns:q="${NS}"><C><D>v</D></C></q:R>`;
    expect(normalizeXml(a)).toBe(normalizeXml(b));
  });

  test('sees a different value, spaces inside a value, a different namespace', () => {
    const base = normalizeXml(`<p:R xmlns:p="${NS}"><C>v</C></p:R>`);
    expect(normalizeXml(`<p:R xmlns:p="${NS}"><C>w</C></p:R>`)).not.toBe(base);
    expect(normalizeXml(`<p:R xmlns:p="${NS}"><C> v</C></p:R>`)).not.toBe(base);
    expect(normalizeXml(`<p:R xmlns:p="urn:other"><C>v</C></p:R>`)).not.toBe(base);
    expect(normalizeXml(`<R><C>v</C></R>`)).not.toBe(base);
  });

  test('sees a different attribute value and the order of elements', () => {
    expect(normalizeXml('<R a="1"/>')).not.toBe(normalizeXml('<R a="2"/>'));
    expect(normalizeXml('<R><A/><B/></R>')).not.toBe(normalizeXml('<R><B/><A/></R>'));
  });
});
