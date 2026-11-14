// Reads the FatturaPA XSD into a small in-memory description that the emitters turn into code.
// Only the constructs the schema uses are supported: anything else fails loudly, so a new XSD
// version with a new construct can't be generated wrong in silence.
import { parseXml, type XmlElement } from '@rgrove/parse-xml';

const XS = 'http://www.w3.org/2001/XMLSchema';
export const XMLDSIG = 'http://www.w3.org/2000/09/xmldsig#';

export interface Schema {
  readonly targetNamespace: string;
  readonly version: string;
  /** The only global element: the root of every invoice. */
  readonly root: { readonly name: string; readonly type: string; readonly doc?: string };
  /** In declaration order. */
  readonly complexTypes: readonly ComplexType[];
  /** In declaration order. */
  readonly simpleTypes: readonly SimpleType[];
}

export interface ComplexType {
  readonly name: string;
  readonly doc?: string;
  /** The content of the top `xs:sequence`, in order. */
  readonly particles: readonly Particle[];
  readonly attributes: readonly Attribute[];
}

export type Particle = ElementDecl | Choice;

export interface ElementDecl {
  readonly kind: 'element';
  readonly name: string;
  /** Type name as written in the XSD: a named type of this schema or a builtin (`xs:date`). */
  readonly type: string;
  /** Namespace of an element brought in with `ref` (only `ds:Signature`). */
  readonly refNamespace?: string;
  readonly minOccurs: number;
  /** `Infinity` for `unbounded`. */
  readonly maxOccurs: number;
  readonly default?: string;
}

/** `xs:choice` whose branches are sequences of elements. */
export interface Choice {
  readonly kind: 'choice';
  readonly branches: readonly (readonly ElementDecl[])[];
}

export interface Attribute {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
}

export interface SimpleType {
  readonly name: string;
  readonly doc?: string;
  /** Builtin base type, e.g. `xs:string`, `xs:decimal`. */
  readonly base: string;
  readonly enumeration: readonly { readonly value: string; readonly doc?: string }[];
  readonly patterns: readonly string[];
  readonly length?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minInclusive?: string;
  readonly maxInclusive?: string;
  readonly whiteSpace?: string;
}

export function readSchema(text: string): Schema {
  const document = parseXml(text);
  const schema = document.root;
  if (!schema || localName(schema) !== 'schema' || namespaceOf(schema, schema) !== XS) {
    throw new Error('Not an XML Schema document');
  }
  const targetNamespace = required(schema, 'targetNamespace');
  const complexTypes: ComplexType[] = [];
  const simpleTypes: SimpleType[] = [];
  let root: Schema['root'] | undefined;

  for (const child of elementChildren(schema)) {
    switch (localName(child)) {
      case 'import':
        break;
      case 'element': {
        if (root) throw new Error('More than one global element');
        const doc = documentation(child);
        root = {
          name: required(child, 'name'),
          type: required(child, 'type'),
          ...(doc === undefined ? {} : { doc }),
        };
        break;
      }
      case 'complexType':
        complexTypes.push(readComplexType(child));
        break;
      case 'simpleType':
        simpleTypes.push(readSimpleType(child));
        break;
      default:
        unsupported(child);
    }
  }
  if (!root) throw new Error('No global element');
  return {
    targetNamespace,
    version: required(schema, 'version'),
    root,
    complexTypes,
    simpleTypes,
  };
}

function readComplexType(element: XmlElement): ComplexType {
  const name = required(element, 'name');
  const particles: Particle[] = [];
  const attributes: Attribute[] = [];
  for (const child of elementChildren(element)) {
    switch (localName(child)) {
      case 'annotation':
        break;
      case 'sequence':
        if (particles.length > 0) unsupported(child);
        particles.push(...readSequence(child));
        break;
      case 'attribute':
        attributes.push({
          name: required(child, 'name'),
          type: required(child, 'type'),
          required: child.attributes.use === 'required',
        });
        break;
      default:
        unsupported(child);
    }
  }
  const doc = documentation(element);
  return { name, ...(doc === undefined ? {} : { doc }), particles, attributes };
}

function readSequence(sequence: XmlElement): Particle[] {
  checkOccurs(sequence);
  const particles: Particle[] = [];
  for (const child of elementChildren(sequence)) {
    switch (localName(child)) {
      case 'element':
        particles.push(readElement(child));
        break;
      case 'choice':
        particles.push(readChoice(child));
        break;
      default:
        unsupported(child);
    }
  }
  return particles;
}

function readChoice(choice: XmlElement): Choice {
  checkOccurs(choice);
  const branches = elementChildren(choice).map((branch) => {
    if (localName(branch) !== 'sequence') unsupported(branch);
    return readSequence(branch).map((particle) => {
      if (particle.kind !== 'element') throw new Error('Nested xs:choice is not supported');
      return particle;
    });
  });
  return { kind: 'choice', branches };
}

function readElement(element: XmlElement): ElementDecl {
  for (const child of elementChildren(element)) {
    if (localName(child) !== 'annotation') unsupported(child);
  }
  const occurs = {
    minOccurs: Number(element.attributes.minOccurs ?? '1'),
    maxOccurs:
      element.attributes.maxOccurs === 'unbounded'
        ? Number.POSITIVE_INFINITY
        : Number(element.attributes.maxOccurs ?? '1'),
  };
  const ref = element.attributes.ref;
  if (ref !== undefined) {
    const refNamespace = resolvePrefix(element, prefixOf(ref));
    if (refNamespace !== XMLDSIG) throw new Error(`Unsupported element reference ${ref}`);
    return { kind: 'element', name: unprefixed(ref), type: ref, refNamespace, ...occurs };
  }
  const defaultValue = element.attributes.default;
  return {
    kind: 'element',
    name: required(element, 'name'),
    type: required(element, 'type'),
    ...occurs,
    ...(defaultValue === undefined ? {} : { default: defaultValue }),
  };
}

function readSimpleType(element: XmlElement): SimpleType {
  const name = required(element, 'name');
  const restriction = elementChildren(element).find((child) => localName(child) !== 'annotation');
  if (!restriction || localName(restriction) !== 'restriction') {
    throw new Error(`Simple type ${name}: only xs:restriction is supported`);
  }
  const facets: {
    enumeration: { value: string; doc?: string }[];
    patterns: string[];
    length?: number;
    minLength?: number;
    maxLength?: number;
    minInclusive?: string;
    maxInclusive?: string;
    whiteSpace?: string;
  } = { enumeration: [], patterns: [] };
  for (const facet of elementChildren(restriction)) {
    const value = required(facet, 'value');
    const facetName = localName(facet);
    switch (facetName) {
      case 'enumeration': {
        const doc = documentation(facet);
        facets.enumeration.push({ value, ...(doc === undefined ? {} : { doc }) });
        break;
      }
      case 'pattern':
        facets.patterns.push(value);
        break;
      case 'length':
      case 'minLength':
      case 'maxLength':
        facets[facetName] = Number(value);
        break;
      case 'minInclusive':
      case 'maxInclusive':
      case 'whiteSpace':
        facets[facetName] = value;
        break;
      default:
        unsupported(facet);
    }
  }
  const doc = documentation(element);
  return {
    name,
    ...(doc === undefined ? {} : { doc }),
    base: required(restriction, 'base'),
    ...facets,
  };
}

/** Text of `xs:annotation/xs:documentation`, with whitespace collapsed. */
function documentation(element: XmlElement): string | undefined {
  const annotation = elementChildren(element).find((child) => localName(child) === 'annotation');
  if (!annotation) return undefined;
  const texts = elementChildren(annotation)
    .filter((child) => localName(child) === 'documentation')
    .map((child) => child.text.replace(/\s+/g, ' ').trim())
    .filter((text) => text !== '');
  return texts.length > 0 ? texts.join(' ') : undefined;
}

function checkOccurs(element: XmlElement): void {
  if (element.attributes.minOccurs !== undefined || element.attributes.maxOccurs !== undefined) {
    throw new Error(`Occurrence constraints on xs:${localName(element)} are not supported`);
  }
}

function elementChildren(element: XmlElement): XmlElement[] {
  return element.children.filter((child): child is XmlElement => child.type === 'element');
}

function required(element: XmlElement, attribute: string): string {
  const value = element.attributes[attribute];
  if (value === undefined) throw new Error(`xs:${localName(element)} without ${attribute}`);
  return value;
}

function unsupported(element: XmlElement): never {
  throw new Error(`Unsupported XSD construct: <${element.name}>`);
}

function localName(element: XmlElement): string {
  return unprefixed(element.name);
}

function unprefixed(name: string): string {
  return name.slice(name.indexOf(':') + 1);
}

function prefixOf(name: string): string {
  const colon = name.indexOf(':');
  return colon === -1 ? '' : name.slice(0, colon);
}

function namespaceOf(element: XmlElement, scope: XmlElement): string | undefined {
  return resolvePrefix(scope, prefixOf(element.name));
}

/** Namespace URI bound to `prefix` ('' for the default namespace) where `element` sits. */
function resolvePrefix(element: XmlElement, prefix: string): string | undefined {
  const attribute = prefix === '' ? 'xmlns' : `xmlns:${prefix}`;
  for (let node: XmlElement | null = element; node; ) {
    const uri = node.attributes[attribute];
    if (uri !== undefined) return uri;
    node = node.parent?.type === 'element' ? (node.parent as XmlElement) : null;
  }
  return undefined;
}
