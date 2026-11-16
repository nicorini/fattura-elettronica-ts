// Adds to the code lists of the XSD the descriptions it lacks, from the official sources listed in
// specs/code-list-descriptions.json (ADR 0016). The XSD decides which codes exist; the file only
// gives the words.
import type { Names } from './names.ts';

export interface DescriptionsFile {
  readonly sources: Readonly<
    Record<
      string,
      {
        readonly name: string;
        readonly url: string;
        readonly sha256: string;
        readonly edition: string;
      }
    >
  >;
  readonly entries: readonly {
    /** Name of the code list, as in `codeLists`. */
    readonly list: string;
    readonly code: string;
    readonly description: string;
    /** Key of `sources`. */
    readonly source: string;
    /** A page, `82`, or a range, `79-80`. */
    readonly pages: string;
    /** What the description leaves out of the source, if anything. */
    readonly note?: string;
  }[];
}

export interface CodeList {
  /** Name in `codeLists`. */
  readonly name: string;
  /** Name of the simple type in the XSD. */
  readonly type: string;
  readonly entries: readonly {
    readonly value: string;
    readonly doc?: string;
    /** Name of the source of `doc`, when not the XSD. */
    readonly source?: string;
    /** Where in `source` the text is, with the note of the entry. */
    readonly citation?: string;
  }[];
}

/** The code lists of the XSD, with the descriptions of `file` added. */
export function addDescriptions(schema: Names, file: DescriptionsFile): CodeList[] {
  const lists = schema.codeLists.map((type) => ({
    name: schema.tsName(type.name),
    type: type.name,
    entries: type.enumeration.map((entry) => ({ ...entry }) as CodeList['entries'][number]),
  }));

  for (const entry of file.entries) {
    const where = `${entry.list} ${entry.code}`;
    const source = file.sources[entry.source];
    if (source === undefined) throw new Error(`${where} cites the unknown source ${entry.source}`);
    const list = lists.find((candidate) => candidate.name === entry.list);
    const index = list?.entries.findIndex((code) => code.value === entry.code) ?? -1;
    if (list === undefined || index === -1) throw new Error(`${where} is not in the XSD`);
    if (list.entries[index]?.doc !== undefined) {
      throw new Error(`${where} already has a description in the XSD`);
    }
    const pages = entry.pages.includes('-') ? `pp. ${entry.pages}` : `p. ${entry.pages}`;
    const note = entry.note === undefined ? '' : `. ${entry.note}`;
    list.entries[index] = {
      value: entry.code,
      doc: entry.description,
      source: source.name,
      citation: `${source.name}, ${pages}${note}`,
    };
  }
  return lists;
}
