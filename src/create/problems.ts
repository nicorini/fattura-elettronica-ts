import type { CreateInvoiceErrorCode, CreateInvoiceProblem } from '../errors.js';

/** The problems of the input, collected by every step and thrown together at the end. */
export class Problems {
  readonly list: CreateInvoiceProblem[] = [];

  add(code: CreateInvoiceErrorCode, path: string, message: string): void {
    this.list.push({ code, path, message });
  }
}
