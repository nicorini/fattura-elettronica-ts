// Every check of the SdI that validate runs, by group.
import { documentRules } from './document/index.js';
import type { SdiRule } from './rule.js';
import { vatRules } from './vat/index.js';

export const sdiRules: readonly SdiRule[] = [...vatRules, ...documentRules];
