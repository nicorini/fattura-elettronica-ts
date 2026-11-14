/**
 * Translates into Italian the headings that `changeset version` writes in English in
 * CHANGELOG.md (Changesets has no option for them). The entries are already in Italian.
 *
 *   node scripts/changelog.ts CHANGELOG.md
 */
import { readFile, writeFile } from 'node:fs/promises';

const HEADINGS: Record<string, string> = {
  '### Major Changes': '### Modifiche major',
  '### Minor Changes': '### Modifiche minor',
  '### Patch Changes': '### Modifiche patch',
  'No changes in this release.': 'Nessuna modifica in questa versione.',
};

/** Replaces the English headings, only where they fill a whole line. */
export function translateChangelog(text: string): string {
  return text.replace(
    /^(### (?:Major|Minor|Patch) Changes|No changes in this release\.)$/gm,
    (line) => HEADINGS[line] ?? line,
  );
}

if (import.meta.main) {
  const path = process.argv[2];
  if (path === undefined) throw new Error('usage: node scripts/changelog.ts <CHANGELOG.md>');
  await writeFile(path, translateChangelog(await readFile(path, 'utf8')));
}
