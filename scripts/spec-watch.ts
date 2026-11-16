import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import type { DescriptionSource } from './generate/descriptions.ts';

/**
 * Specification watcher: downloads the pages and files of the official specifications listed in
 * `specs/sources.json` and reports what differs from the fingerprints saved there. With
 * `--editions`, it reports instead the yearly sources of `specs/code-list-descriptions.json` left on
 * an old edition: two separate checks, each with its own issue, so that one doesn't hide the other.
 *
 *   node scripts/spec-watch.ts                  # compare and print the differences
 *   node scripts/spec-watch.ts --update         # save the current fingerprints
 *   node scripts/spec-watch.ts --report <file>  # also write the issue body, if something changed
 *   node scripts/spec-watch.ts --out <file>     # also write the current fingerprints
 *   node scripts/spec-watch.ts --editions [--report <file>]  # check the editions only
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

/** A watched source whose edition is older than `year`, the current one. */
export interface EditionChange {
  name: string;
  edition: string;
  year: number;
}

/** February, as `Date.getUTCMonth()` counts: by then the new edition of the CU is out. */
const NEW_EDITION_MONTH = 1;

/**
 * The yearly sources whose edition is of a past year, from 1 February on. A new edition of the
 * CU comes out in mid January at an address nobody can guess, so the watcher can't fetch it: it
 * can only tell, once the edition must be out, that the descriptions are still on the old one.
 */
export function checkEditions(
  sources: Readonly<Record<string, Pick<DescriptionSource, 'name' | 'edition' | 'yearly'>>>,
  today: Date,
): EditionChange[] {
  const yearly = Object.values(sources).filter((source) => source.yearly === true);
  for (const source of yearly) {
    if (!/^\d{4}$/.test(source.edition)) {
      throw new Error(
        `${source.name} comes out every year, but its edition ${source.edition} is not a year`,
      );
    }
  }
  const year = today.getUTCFullYear();
  if (today.getUTCMonth() < NEW_EDITION_MONTH) return [];
  return yearly
    .filter((source) => Number(source.edition) < year)
    .map((source) => ({ name: source.name, edition: source.edition, year }));
}

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

/** The body of the issue that reports the editions to update, in Italian. */
export function renderEditionIssue(changes: EditionChange[]): string {
  const sections = [
    "Il sorvegliante delle specifiche ha trovato descrizioni dei codici ferme a un'edizione passata della loro fonte.",
  ];
  for (const change of changes) {
    sections.push(
      [
        `## ${change.name}`,
        `Le descrizioni dei codici in \`specs/code-list-descriptions.json\` vengono dall'edizione ${change.edition}, ma dal 1° febbraio deve essere uscita l'edizione ${change.year}. Il suo indirizzo cambia ogni anno, quindi il sorvegliante non può scaricarla da solo.`,
        [
          `1. Cercare l'edizione ${change.year} sul sito dell'Agenzia delle Entrate.`,
          "2. Confrontare i testi delle voci che citano questa fonte con quelli della nuova edizione, e i codici che toglie o aggiunge con quelli dell'XSD.",
          "3. Aggiornare in `specs/code-list-descriptions.json` nome, URL, SHA-256, edizione, pagine e testi, poi `pnpm generate`. Un testo cambiato è una versione `minor` che nomina l'edizione nel changelog.",
          "4. Aggiornare in `specs/sources.json` le pagine dell'anno della fonte.",
        ].join('\n'),
      ].join('\n\n'),
    );
  }
  return `${sections.join('\n\n')}\n`;
}

function linkList(title: string, links: string[]): string {
  return [title, ...links.map((link) => `- ${link}`)].join('\n');
}

const SOURCES_PATH = new URL('../specs/sources.json', import.meta.url);
const DESCRIPTIONS_PATH = new URL('../specs/code-list-descriptions.json', import.meta.url);

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
      editions: { type: 'boolean', default: false },
      report: { type: 'string' },
      out: { type: 'string' },
    },
  });

  if (values.editions) {
    const descriptions = JSON.parse(await readFile(DESCRIPTIONS_PATH, 'utf8')) as {
      sources: Record<string, DescriptionSource>;
    };
    const changes = checkEditions(descriptions.sources, new Date());
    if (changes.length === 0) {
      console.log('No edition to update.');
      return;
    }
    const body = renderEditionIssue(changes);
    if (values.report !== undefined) await writeFile(values.report, body);
    console.log(body);
    return;
  }

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
