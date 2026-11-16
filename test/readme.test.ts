// The examples of the README run as they are written, against the source of the library: the
// import of the package points at src/index.ts, and 'fattura.xml' at an official example.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, test, vi } from 'vitest';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const examples = [...readme.matchAll(/^```ts\n([\s\S]*?)^```$/gm)].map((match) => match[1] ?? '');

const library = new URL('../src/index.ts', import.meta.url).href;
const invoice = new URL('./fixtures/official/IT01234567890_FPR01.xml', import.meta.url).pathname;
const directory = mkdtempSync(join(tmpdir(), 'fattura-readme-'));
afterAll(() => rmSync(directory, { recursive: true }));

test('the README has the six examples: overview, read, build, createInvoice, problems, menus', () => {
  expect(examples).toHaveLength(6);
});

test.each(examples.map((code, i) => [i + 1, code] as const))('example %i runs', async (i, code) => {
  const runnable = code
    .replaceAll("from 'fattura-elettronica-ts'", `from '${library}'`)
    .replaceAll("'fattura.xml'", JSON.stringify(invoice));
  expect(runnable).not.toContain("from 'fattura-elettronica-ts'");
  const file = join(directory, `example-${i}.ts`);
  writeFileSync(file, runnable);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await import(file);
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
