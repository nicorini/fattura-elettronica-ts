// Checks a leaf value against its simple type, as an XSD validator would: whitespace processing,
// lexical form of the builtin, then the facets.
import { compare } from '../arithmetic.js';
import { simpleTypes } from '../generated/simple-types.js';
import type { SimpleTypeSpec } from '../schema/spec.js';
import type { Report } from './report.js';

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const INTEGER = /^[+-]?\d+$/;
const DATE = /^(-?\d{4,})-(\d{2})-(\d{2})(Z|[+-]\d{2}:\d{2})?$/;
const DATE_TIME =
  /^(-?\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
// XSD 1.0 base64Binary once spaces are removed: the last character before the padding can only
// use the bits that the padding leaves.
const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}[AEIMQUYcgkosw048]=|[A-Za-z0-9+/][AQgw]==)?$/;

const compiled = new Map<string, RegExp>();

/** Checks `raw`, the value of the field `name` at `path`, against the simple type `type`. */
export function checkValue(raw: string, type: string, path: string, report: Report): void {
  const spec = simpleTypes[type];
  if (spec === undefined) throw new Error(`Unknown simpleType ${type}`);
  const name = path.slice(path.lastIndexOf('.') + 1).replace(/\[\d+\]$/, '');

  const invalid = notXmlCharacter(raw);
  if (invalid !== undefined) {
    const code = invalid.toString(16).toUpperCase().padStart(4, '0');
    report.structure(
      'xsd.pattern',
      path,
      `${name} contiene il carattere U+${code}, che un file XML non può contenere.`,
    );
    return;
  }
  const value = whiteSpace(raw, spec.whiteSpace);
  const quoted = quote(value);

  const lexical = lexicalProblem(value, spec.builtin);
  if (lexical !== undefined) {
    report.structure('xsd.pattern', path, `${name} vale ${quoted}, che non è ${lexical}.`);
    return;
  }
  if (spec.enumeration !== undefined && !spec.enumeration.includes(value)) {
    report.structure(
      'xsd.enumeration',
      path,
      `${name} vale ${quoted}, che non è tra i valori ammessi: ${spec.enumeration.join(', ')}.`,
    );
    return;
  }
  const lengthProblem = checkLength(value, spec);
  if (lengthProblem !== undefined) {
    report.structure('xsd.length', path, `${name} vale ${quoted}: ${lengthProblem}.`);
    return;
  }
  if (
    spec.patterns !== undefined &&
    !spec.patterns.some((pattern) => regExp(pattern.js).test(value))
  ) {
    const patterns = spec.patterns.map((pattern) => pattern.xsd).join(' oppure ');
    report.structure(
      'xsd.pattern',
      path,
      `${name} vale ${quoted}, che non rispetta il formato del tipo ${type} (${patterns}).`,
    );
    return;
  }
  const rangeProblem = checkRange(value, spec);
  if (rangeProblem !== undefined) {
    report.structure('xsd.range', path, `${name} vale ${quoted}: ${rangeProblem}.`);
  }
}

/**
 * The first code point outside the Char production of XML 1.0 (controls, lone surrogates,
 * U+FFFE, U+FFFF): no XML document can hold it, so the value can't be written.
 */
function notXmlCharacter(value: string): number | undefined {
  for (const character of value) {
    const code = character.codePointAt(0) as number;
    const allowed =
      code === 0x9 ||
      code === 0xa ||
      code === 0xd ||
      (code >= 0x20 && code <= 0xd7ff) ||
      (code >= 0xe000 && code <= 0xfffd) ||
      code >= 0x10000;
    if (!allowed) return code;
  }
  return undefined;
}

function whiteSpace(value: string, mode: SimpleTypeSpec['whiteSpace']): string {
  if (mode === 'preserve') return value;
  const replaced = value.replace(/[\t\n\r]/g, ' ');
  return mode === 'replace' ? replaced : replaced.replace(/ {2,}/g, ' ').replace(/^ | $/g, '');
}

/** What the value should be, if it isn't a lexical form of the builtin type. */
function lexicalProblem(value: string, builtin: SimpleTypeSpec['builtin']): string | undefined {
  switch (builtin) {
    case 'string':
      return undefined;
    case 'decimal':
      return DECIMAL.test(value) ? undefined : 'un numero decimale (es. 1234.50)';
    case 'integer':
      return INTEGER.test(value) ? undefined : 'un numero intero';
    case 'date':
      return parseDate(value) === undefined ? 'una data valida nella forma AAAA-MM-GG' : undefined;
    case 'dateTime':
      return isDateTime(value)
        ? undefined
        : 'una data e ora valida nella forma AAAA-MM-GGThh:mm:ss';
    case 'base64Binary':
      return BASE64.test(value.replaceAll(' ', '')) ? undefined : 'un contenuto in base64';
  }
}

/** Year, month and day of a valid `xs:date`; the time zone is accepted and ignored. */
function parseDate(value: string): [number, number, number] | undefined {
  const match = DATE.exec(value);
  if (match === null || !validTimeZone(match[4])) return undefined;
  return validDay(match[1] as string, match[2] as string, match[3] as string);
}

function isDateTime(value: string): boolean {
  const match = DATE_TIME.exec(value);
  if (match === null || !validTimeZone(match[8])) return false;
  if (validDay(match[1] as string, match[2] as string, match[3] as string) === undefined) {
    return false;
  }
  const [hour, minute, second] = [match[4], match[5], match[6]].map(Number) as [
    number,
    number,
    number,
  ];
  // 24:00:00 is the end of the day, allowed by XSD 1.0.
  if (hour === 24) return minute === 0 && second === 0 && !/[1-9]/.test(match[7] ?? '');
  return hour <= 23 && minute <= 59 && second <= 59;
}

function validDay(
  yearText: string,
  monthText: string,
  dayText: string,
): [number, number, number] | undefined {
  const digits = yearText.replace('-', '');
  // Years of more than 4 digits have no leading zero; year 0000 doesn't exist in XSD 1.0.
  if ((digits.length > 4 && digits.startsWith('0')) || /^0+$/.test(digits)) return undefined;
  const [year, month, day] = [Number(yearText), Number(monthText), Number(dayText)];
  if (month < 1 || month > 12 || day < 1) return undefined;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] as number;
  return day <= days ? [year, month, day] : undefined;
}

function validTimeZone(zone: string | undefined): boolean {
  if (zone === undefined || zone === 'Z') return true;
  const [hours, minutes] = [Number(zone.slice(1, 3)), Number(zone.slice(4, 6))];
  return minutes <= 59 && (hours < 14 || (hours === 14 && minutes === 0));
}

function checkLength(value: string, spec: SimpleTypeSpec): string | undefined {
  // XSD counts characters, not UTF-16 units.
  const length = [...value].length;
  if (spec.length !== undefined && length !== spec.length) {
    return `ha ${length} caratteri, ne servono ${spec.length}`;
  }
  if (spec.minLength !== undefined && length < spec.minLength) {
    return `ha ${length} caratteri, ne servono almeno ${spec.minLength}`;
  }
  if (spec.maxLength !== undefined && length > spec.maxLength) {
    return `ha ${length} caratteri, al massimo ${spec.maxLength}`;
  }
  return undefined;
}

function checkRange(value: string, spec: SimpleTypeSpec): string | undefined {
  const order = (bound: string): number =>
    spec.builtin === 'date' ? compareDates(value, bound) : compare(decimal(value), decimal(bound));
  if (spec.minInclusive !== undefined && order(spec.minInclusive) < 0) {
    return `il minimo è ${spec.minInclusive}`;
  }
  if (spec.maxInclusive !== undefined && order(spec.maxInclusive) > 0) {
    return `il massimo è ${spec.maxInclusive}`;
  }
  return undefined;
}

/** A decimal lexical form that big.js reads: no leading `+`, no bare `.5` or `5.`. */
function decimal(value: string): string {
  const unsigned = value.replace(/^\+/, '');
  return unsigned.replace(/^(-?)\./, '$10.').replace(/\.$/, '');
}

function compareDates(a: string, b: string): number {
  const [x, y] = [parseDate(a), parseDate(b)];
  if (x === undefined || y === undefined) return 0;
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

function regExp(source: string): RegExp {
  let result = compiled.get(source);
  if (result === undefined) {
    result = new RegExp(source, 'u');
    compiled.set(source, result);
  }
  return result;
}

/** The value in quotes for a message, shortened when long. */
function quote(value: string): string {
  const characters = [...value];
  return `"${characters.length > 60 ? `${characters.slice(0, 57).join('')}…` : value}"`;
}
