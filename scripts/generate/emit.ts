// Small helpers to write TypeScript source text. Biome formats the result afterwards, so the
// emitters only care about content, not layout, except for comments, which Biome leaves alone.

const WIDTH = 100;

/**
 * A JSDoc block, indented by `indent` spaces. Paragraphs are wrapped to the line width; those that
 * start with `- ` are list items, kept together; those with a newline are kept as they are.
 */
export function jsdoc(paragraphs: readonly string[], indent = 0): string {
  const pad = ' '.repeat(indent);
  const lines: string[] = [];
  for (const [index, paragraph] of paragraphs.entries()) {
    if (index > 0 && !(paragraph.startsWith('- ') && paragraphs[index - 1]?.startsWith('- '))) {
      lines.push('');
    }
    if (paragraph.includes('\n')) {
      // Preformatted, e.g. an @example.
      lines.push(...escapeComment(paragraph).split('\n'));
      continue;
    }
    const hanging = paragraph.startsWith('- ') ? '  ' : '';
    lines.push(...wrap(escapeComment(paragraph), WIDTH - indent - 3, hanging));
  }
  if (lines.length === 1) return `${pad}/** ${lines[0]} */\n`;
  return `${pad}/**\n${lines.map((line) => `${pad} *${line === '' ? '' : ` ${line}`}`).join('\n')}\n${pad} */\n`;
}

/** A `//` comment, indented by `indent` spaces and wrapped to the line width. */
export function lineComment(text: string, indent = 0): string {
  const pad = ' '.repeat(indent);
  return wrap(text, WIDTH - indent - 3, '')
    .map((line) => `${pad}// ${line}\n`)
    .join('');
}

function wrap(text: string, width: number, hanging: string): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line !== '' && line.length + 1 + word.length > width) {
      lines.push(line);
      line = hanging + word;
    } else {
      line = line === '' ? word : `${line} ${word}`;
    }
  }
  lines.push(line);
  return lines;
}

function escapeComment(text: string): string {
  return text.replaceAll('*/', '*\\/');
}

/** A single-quoted string literal. */
export function literal(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

/** A property key: bare when it is an identifier. */
export function key(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : literal(name);
}
