import { describe, expect, it } from 'vitest';
import { translateChangelog } from './changelog.ts';

describe('translateChangelog', () => {
  it('translates the headings Changesets writes in English', () => {
    const english = `# fattura-elettronica-ts

## 0.2.0

### Minor Changes

- abc1234: Nuova funzione.

### Patch Changes

- def5678: Correzione.

## 0.1.1

No changes in this release.

## 1.0.0

### Major Changes

- 0123456: API stabile.
`;

    expect(translateChangelog(english)).toBe(`# fattura-elettronica-ts

## 0.2.0

### Modifiche minor

- abc1234: Nuova funzione.

### Modifiche patch

- def5678: Correzione.

## 0.1.1

Nessuna modifica in questa versione.

## 1.0.0

### Modifiche major

- 0123456: API stabile.
`);
  });

  it('leaves the same words untouched inside an entry', () => {
    const text = '## 0.2.0\n\n### Patch Changes\n\n- abc1234: Il testo cita "### Minor Changes".\n';

    expect(translateChangelog(text)).toBe(
      '## 0.2.0\n\n### Modifiche patch\n\n- abc1234: Il testo cita "### Minor Changes".\n',
    );
  });
});
