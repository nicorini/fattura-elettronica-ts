// Smoke test of the published package on Bun and Deno: run from a project that installed the
// tarball, with the path of an official example.
//
//   bun smoke.mjs IT01234567890_FPR01.xml
//   deno run --allow-read smoke.mjs IT01234567890_FPR01.xml
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { smoke } from './check.mjs';

const [file] = process.argv.slice(2);
if (file === undefined) throw new Error('Usage: smoke.mjs <official example>');

console.log(smoke(readFileSync(file)));
