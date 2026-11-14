import { gzipSync } from 'node:zlib';
import { rolldown } from 'rolldown';

/**
 * Weight of the main entry for those who bundle it: dist/index.js with its dependencies, minified
 * and gzipped. Fails above the limit, so that a heavier build is a choice and not an accident.
 *
 *   pnpm build && node scripts/size.ts
 */

/**
 * Measured weight plus 10%: 26 835 bytes for the main entry of 0.1. Raise it on purpose, writing
 * down why, when the entry grows.
 */
const LIMIT_BYTES = 29_519;

const bundle = await rolldown({ input: 'dist/index.js', platform: 'neutral', logLevel: 'silent' });
const { output } = await bundle.generate({ format: 'esm', minify: true });
await bundle.close();

const code = output.map((chunk) => (chunk.type === 'chunk' ? chunk.code : '')).join('');
const bytes = gzipSync(code, { level: 9 }).length;
const kB = (n: number): string => `${(n / 1000).toFixed(2)} kB`;

console.log(`Main entry, minified and gzipped: ${kB(bytes)}`);
console.log(`Limit: ${kB(LIMIT_BYTES)}`);
if (bytes > LIMIT_BYTES) {
  console.error(`Over the limit by ${kB(bytes - LIMIT_BYTES)}.`);
  process.exitCode = 1;
}
