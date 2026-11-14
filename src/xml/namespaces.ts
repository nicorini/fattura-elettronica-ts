import { root } from '../generated/schema.js';

/**
 * Namespace declarations of the root that build writes, as in the official examples (without
 * `xsi:schemaLocation`, which is not a declaration).
 */
export const rootNamespaces: Readonly<Record<string, string>> = {
  'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
  'xmlns:p': root.namespace,
  'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
};

/**
 * The prefix an attribute declares if it is a namespace declaration: `''` for `xmlns`, `ds` for
 * `xmlns:ds`; `undefined` for any other attribute.
 */
export function declaredPrefix(attribute: string): string | undefined {
  if (attribute === 'xmlns') return '';
  return attribute.startsWith('xmlns:') ? attribute.slice(6) : undefined;
}
