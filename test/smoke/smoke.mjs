// Smoke test of the published package on Bun and Deno: run from a project that installed the
// tarball, with the path of an official example.
//
//   bun smoke.mjs IT01234567890_FPR01.xml
//   deno run --allow-read smoke.mjs IT01234567890_FPR01.xml
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { parse, validate } from 'fattura-elettronica-ts';

const [file] = process.argv.slice(2);
if (file === undefined) throw new Error('Usage: smoke.mjs <official example>');
const xml = readFileSync(file);

const fattura = parse(xml);
if (fattura.versione !== 'FPR12') throw new Error(`Read versione ${fattura.versione}`);

const { problems } = validate(xml);
const structural = problems.filter((problem) => problem.code.startsWith('xsd.'));
if (structural.length > 0) throw new Error(`Problems of structure: ${JSON.stringify(structural)}`);
// The official examples have a P.IVA with a wrong check digit: the checks of the SdI ran.
if (!problems.some((problem) => problem.code === 'sdi.00301')) {
  throw new Error(`The checks of the SdI did not run: ${JSON.stringify(problems)}`);
}

console.log(`parse and validate work (${problems.length} problems, as expected).`);
