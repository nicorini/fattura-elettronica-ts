// Emits CreateInvoiceInput, the input of createInvoice: the model with the same structure and
// names, where the decimals also take a `number` and the fields createInvoice computes are
// optional. A complexType with neither in its subtree is the type of the model itself.
import { emitComplexType, type Variant } from './emit-model.ts';
import { elementKind, type Names } from './names.ts';
import type { ComplexType, ElementDecl } from './xsd.ts';

/** The simple types of the amounts, rates and quantities: `string | number` in the input. */
export const DECIMAL_TYPES: ReadonlySet<string> = new Set([
  'Amount2DecimalType',
  'Amount8DecimalType',
  'QuantitaType',
  'RateType',
]);

/**
 * The fields createInvoice computes when missing, by model type name: optional in the input. A
 * test checks that createInvoice fills each one.
 */
export const COMPUTED_FIELDS: { readonly [type: string]: readonly string[] } = {
  DettaglioLinee: ['PrezzoTotale'],
  DatiBeniServizi: ['DatiRiepilogo'],
  DatiRiepilogo: ['ImponibileImporto', 'Imposta'],
  DatiCassaPrevidenziale: ['ImportoContributoCassa'],
  DatiRitenuta: ['ImportoRitenuta'],
  DatiGeneraliDocumento: ['ImportoTotaleDocumento'],
  DettaglioPagamento: ['ImportoPagamento'],
};

const ROOT_NAME = 'CreateInvoiceInput';

export function emitInput(names: Names): string {
  const root = names.schema.root.type;
  const types = names.schema.complexTypes;
  const changed = new Set<string>();
  // A type changes if a field of it is decimal or computed, or a child type changes: repeat until
  // nothing new, as the XSD declares children after parents.
  let grown = true;
  while (grown) {
    grown = false;
    for (const type of types) {
      if (changed.has(type.name)) continue;
      if (elements(type).some((element) => changes(names, type, element, changed))) {
        changed.add(type.name);
        grown = true;
      }
    }
  }
  const variant: Variant = {
    typeName: (xsdName) =>
      xsdName === root
        ? ROOT_NAME
        : changed.has(xsdName)
          ? `${names.tsName(xsdName)}Input`
          : `Model.${names.tsName(xsdName)}`,
    codeListName: (xsdName) => `Model.${names.tsName(xsdName)}`,
    leaf: (element) => (DECIMAL_TYPES.has(element.type) ? 'string | number' : 'string'),
    optional: (type, element) => isComputed(names, type, element),
    docs: (type, element) =>
      isComputed(names, type, element) ? ['Computed by `createInvoice` when missing.'] : [],
  };
  let out = "import type * as Model from './model.js';\n\n";
  out += '/** The simple types whose leaves also take a `number` in `CreateInvoiceInput`. */\n';
  out += `export const inputDecimalTypes: readonly string[] = [${[...DECIMAL_TYPES].map((name) => `'${name}'`).join(', ')}];\n`;
  for (const type of types) {
    if (!changed.has(type.name)) continue;
    const docs =
      type.name === root
        ? [
            'The input of `createInvoice`: the model of `build`, with the same names, where amounts, rates and quantities may also be a `number` and the fields that `createInvoice` computes are optional.',
          ]
        : [];
    out += emitComplexType(names, variant, type, docs);
  }
  return out;
}

function elements(type: ComplexType): ElementDecl[] {
  return type.particles.flatMap((particle) =>
    particle.kind === 'element' ? [particle] : particle.branches.flat(),
  );
}

function isComputed(names: Names, type: ComplexType, element: ElementDecl): boolean {
  return COMPUTED_FIELDS[names.tsName(type.name)]?.includes(element.name) === true;
}

function changes(
  names: Names,
  type: ComplexType,
  element: ElementDecl,
  changed: ReadonlySet<string>,
): boolean {
  if (isComputed(names, type, element)) return true;
  const kind = elementKind(names, element);
  if (kind === 'complex') return changed.has(element.type);
  return kind === 'simple' && DECIMAL_TYPES.has(element.type);
}
