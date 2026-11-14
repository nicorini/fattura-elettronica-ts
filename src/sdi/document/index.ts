// Checks of the SdI on the header, the parties and the document: one file per check, named by its code, listed here.
import type { SdiRule } from '../rule.js';
import { rule00300to00306 } from './00300-00306.js';
import { rule00313 } from './00313.js';
import { rule00330 } from './00330.js';
import { rule00403 } from './00403.js';
import { rule00409 } from './00409.js';
import { rule00417 } from './00417.js';
import { rule00418 } from './00418.js';
import { rule00425 } from './00425.js';
import { rule00427 } from './00427.js';
import { rule00428 } from './00428.js';
import { rule00471and00472 } from './00471-00472.js';
import { rule00473 } from './00473.js';
import { rule00474 } from './00474.js';
import { rule00475 } from './00475.js';
import { rule00476 } from './00476.js';
import { rulePecDestinatario } from './pec-destinatario.js';

export const documentRules: readonly SdiRule[] = [
  rule00300to00306,
  rule00313,
  rule00330,
  rule00403,
  rule00409,
  rule00417,
  rule00418,
  rule00425,
  rule00427,
  rule00428,
  rule00471and00472,
  rule00473,
  rule00474,
  rule00475,
  rule00476,
  rulePecDestinatario,
];
