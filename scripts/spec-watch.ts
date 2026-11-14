import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

/**
 * Specification watcher: downloads the pages and files of the official specifications listed in
 * `specs/sources.json` and reports what differs from the fingerprints saved there.
 *
 *   node scripts/spec-watch.ts                  # compare and print the differences
 *   node scripts/spec-watch.ts --update         # save the current fingerprints
 *   node scripts/spec-watch.ts --report <file>  # also write the issue body, if something changed
 *   node scripts/spec-watch.ts --out <file>     # also write the current fingerprints
 */

/**
 * A watched source. A file is compared by the SHA-256 of its bytes. A page is compared by the
 * document links it lists (those matching `include`): the HTML around them changes for reasons
 * that don't matter (menus, banners), a new link is the sign of a new version.
 */
export type Source =
  | { kind: 'file'; name: string; url: string; sha256?: string }
  | { kind: 'page'; name: string; url: string; include: string; links?: string[] };

export type Change =
  | { kind: 'file'; name: string; url: string; before?: string; after: string }
  | { kind: 'page'; name: string; url: string; added: string[]; removed: string[] };

/** Downloads every source and compares it with the saved fingerprint. */
export async function checkSources(
  sources: Source[],
  fetchBytes: (url: string) => Promise<Uint8Array>,
): Promise<{ sources: Source[]; changes: Change[] }> {
  const current: Source[] = [];
  const changes: Change[] = [];
  for (const source of sources) {
    const bytes = await fetchBytes(source.url);
    if (source.kind === 'file') {
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      current.push({ ...source, sha256 });
      if (sha256 !== source.sha256) {
        changes.push({
          kind: 'file',
          name: source.name,
          url: source.url,
          ...(source.sha256 === undefined ? {} : { before: source.sha256 }),
          after: sha256,
        });
      }
    } else {
      const html = new TextDecoder().decode(bytes);
      const links = extractLinks(html, source.url, new RegExp(source.include, 'i'));
      current.push({ ...source, links });
      const before = new Set(source.links ?? []);
      const after = new Set(links);
      const added = links.filter((link) => !before.has(link));
      const removed = [...before].filter((link) => !after.has(link));
      if (added.length > 0 || removed.length > 0) {
        changes.push({ kind: 'page', name: source.name, url: source.url, added, removed });
      }
    }
  }
  return { sources: current, changes };
}

/** The absolute URLs of the page's links that match `include`, sorted and without repeats. */
function extractLinks(html: string, pageUrl: string, include: RegExp): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const href = (match[1] ?? match[2] ?? '').replaceAll('&amp;', '&').trim();
    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      continue;
    }
    url.hash = '';
    if (include.test(url.href)) links.add(url.href);
  }
  return [...links].sort();
}

/** The body of the issue that reports the changes, in Italian like every issue of the project. */
export function renderIssue(changes: Change[]): string {
  const sections = [
    'Il sorvegliante delle specifiche ha trovato differenze rispetto alle impronte salvate in `specs/sources.json`.',
  ];
  for (const change of changes) {
    if (change.kind === 'page') {
      const lines = [`## ${change.name}`, `Pagina: ${change.url}`];
      if (change.added.length > 0) lines.push(linkList('Collegamenti nuovi:', change.added));
      if (change.removed.length > 0) lines.push(linkList('Collegamenti spariti:', change.removed));
      sections.push(lines.join('\n\n'));
    } else {
      const before = change.before === undefined ? 'nessuno' : `\`${change.before}\``;
      sections.push(
        [
          `## ${change.name}`,
          `File: ${change.url}`,
          `- SHA-256 salvato: ${before}\n- SHA-256 attuale: \`${change.after}\``,
        ].join('\n\n'),
      );
    }
  }
  sections.push(
    [
      '## Cosa fare',
      '1. Leggere i documenti cambiati e decidere se toccano la libreria (XSD, controlli, codici).\n' +
        '2. Aggiornare le impronte con `pnpm specs:watch --update` e committare `specs/sources.json`, anche se la libreria non cambia.',
    ].join('\n\n'),
  );
  return `${sections.join('\n\n')}\n`;
}

function linkList(title: string, links: string[]): string {
  return [title, ...links.map((link) => `- ${link}`)].join('\n');
}

const SOURCES_PATH = new URL('../specs/sources.json', import.meta.url);

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'fattura-elettronica-ts spec watcher (+https://github.com/nicorini/fattura-elettronica-ts)',
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      update: { type: 'boolean', default: false },
      report: { type: 'string' },
      out: { type: 'string' },
    },
  });
  const saved = JSON.parse(await readFile(SOURCES_PATH, 'utf8')) as Source[];
  const { sources, changes } = await checkSources(saved, fetchBytes);
  const json = `${JSON.stringify(sources, null, 2)}\n`;

  if (values.out !== undefined) await writeFile(values.out, json);
  if (values.update) await writeFile(SOURCES_PATH, json);
  if (changes.length === 0) {
    console.log(`No changes in ${sources.length} sources.`);
    return;
  }
  const body = renderIssue(changes);
  if (values.report !== undefined) await writeFile(values.report, body);
  console.log(body);
}

if (import.meta.main) await main();
