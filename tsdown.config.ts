import { defineConfig } from 'tsdown';

export default defineConfig({
  // One entry file per subpath in the "exports" of package.json: for now only the main one.
  entry: { index: 'src/index.ts' },
  // ESM only: Node 22 and later load ESM with require() too.
  format: 'esm',
  // Neither Node nor browser: the library is universal.
  platform: 'neutral',
  // .js and .d.ts, as declared in "exports" (package.json has "type": "module").
  fixedExtension: false,
  // TypeScript 7.0 has no API to generate .d.ts files yet.
  dts: { generator: 'oxc' },
});
