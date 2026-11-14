import { readFileSync } from 'node:fs';

/** Names of the official examples in test/fixtures/official. */
export const officialExamples: readonly string[] = [
  'IT01234567890_FPA01',
  'IT01234567890_FPA02',
  'IT01234567890_FPA03',
  'IT01234567890_FPR01',
  'IT01234567890_FPR02',
  'IT01234567890_FPR03',
];

/** Text of an official example. */
export function official(name: string): string {
  return readFileSync(new URL(`../fixtures/official/${name}.xml`, import.meta.url), 'utf8');
}

/** Bytes of an official example, exactly as published. */
export function officialBytes(name: string): Uint8Array {
  return readFileSync(new URL(`../fixtures/official/${name}.xml`, import.meta.url));
}
