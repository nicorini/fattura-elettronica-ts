// Checks of the SdI on amounts and VAT: one file per check, named by its code, listed here.
import type { SdiRule } from '../rule.js';
import { rule00400and00401 } from './00400-00401.js';
import { rule00411and00415 } from './00411-00415.js';
import { rule00413and00414 } from './00413-00414.js';
import { rule00419 } from './00419.js';
import { rule00420 } from './00420.js';
import { rule00421 } from './00421.js';
import { rule00422 } from './00422.js';
import { rule00423 } from './00423.js';
import { rule00424 } from './00424.js';
import { rule00429and00430 } from './00429-00430.js';
import { rule00437and00438 } from './00437-00438.js';
import { rule00443, rule00443Warning } from './00443.js';
import { rule00444, rule00444Warning } from './00444.js';
import { rule00445 } from './00445.js';
import { ruleRiferimentoNormativo } from './riferimento-normativo.js';

export const vatRules: readonly SdiRule[] = [
  rule00411and00415,
  rule00437and00438,
  rule00400and00401,
  rule00413and00414,
  rule00429and00430,
  rule00419,
  rule00420,
  rule00421,
  rule00422,
  rule00423,
  rule00424,
  rule00443,
  rule00444,
  rule00443Warning,
  rule00444Warning,
  rule00445,
  ruleRiferimentoNormativo,
];
