// Shapes of the schema description generated from the XSD (src/generated/schema.ts). Reading,
// writing and structural validation walk the model with it, instead of knowing the XSD by heart.

/** An element of a complexType, in XSD order. */
export interface ElementSpec {
  /** Element name, identical to the XSD and to the property of the model. */
  readonly name: string;
  /**
   * - `complex`: a block, described by `complexTypes[type]`;
   * - `simple`: a leaf, a string in the model;
   * - `signature`: `ds:Signature`, kept as raw XML.
   */
  readonly kind: 'complex' | 'simple' | 'signature';
  /**
   * For `complex`, the key in `complexTypes` (the model type name); for `simple`, the XSD
   * simpleType name (`Amount2DecimalType`) or builtin (`xs:date`); for `signature`, `ds:Signature`.
   */
  readonly type: string;
  readonly minOccurs: number;
  /** `Infinity` for `unbounded`. More than 1 means an array in the model. */
  readonly maxOccurs: number;
  /**
   * Set on the elements of an `xs:choice`: `group` numbers the choices of the complexType,
   * `branch` the alternative the element belongs to.
   */
  readonly choice?: { readonly group: number; readonly branch: number };
  /** Namespace of the element; absent for the unqualified elements of the FatturaPA schema. */
  readonly namespace?: string;
}

/** An attribute of a complexType (only the root has any). */
export interface AttributeSpec {
  readonly name: string;
  /** XSD simpleType name. */
  readonly type: string;
  readonly required: boolean;
  /** The values allowed by the type, when it is a code list. */
  readonly enumeration?: readonly string[];
}

/** A complexType of the XSD. */
export interface ComplexTypeSpec {
  readonly attributes: readonly AttributeSpec[];
  /** In XSD order, the elements of an `xs:choice` included in place. */
  readonly elements: readonly ElementSpec[];
}

/** The root element of every invoice. */
export interface RootSpec {
  readonly name: string;
  readonly namespace: string;
  /** Key in `complexTypes`. */
  readonly type: string;
}

/**
 * A simple type of the XSD, or a builtin used directly (`xs:date`), with the facets that
 * structural validation checks. Facets are checked on the value after whitespace processing.
 */
export interface SimpleTypeSpec {
  /** The builtin XSD type at the root of the derivation, which fixes the lexical form. */
  readonly builtin: 'string' | 'decimal' | 'integer' | 'date' | 'dateTime' | 'base64Binary';
  /**
   * Whitespace processing of the XSD: `replace` turns tabs and line breaks into spaces,
   * `collapse` also trims and squeezes runs of spaces.
   */
  readonly whiteSpace: 'preserve' | 'replace' | 'collapse';
  readonly enumeration?: readonly string[];
  /** The value matches if it matches any of them. */
  readonly patterns?: readonly {
    /** As written in the XSD, for messages. */
    readonly xsd: string;
    /** Translation to a JavaScript RegExp source, anchored, for the `u` flag. */
    readonly js: string;
  }[];
  /** In characters (code points). */
  readonly length?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  /** Bounds as written in the XSD (`100.00`, `1970-01-01`). */
  readonly minInclusive?: string;
  readonly maxInclusive?: string;
}
