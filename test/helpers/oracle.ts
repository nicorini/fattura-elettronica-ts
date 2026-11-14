// libxml2 as an independent judge of the XSD: the structural verdict of validate must match it.
import { readFileSync } from 'node:fs';
import {
  XmlBufferInputProvider,
  XmlDocument,
  XmlError,
  XsdValidator,
  xmlRegisterInputProvider,
} from 'libxml2-wasm';

const SPECS = new URL('../../specs/fatturapa-1.2.3/', import.meta.url);
// The FatturaPA XSD imports the xmldsig schema from the W3C: serve the local copy instead.
const XMLDSIG_URL = 'http://www.w3.org/TR/2002/REC-xmldsig-core-20020212/xmldsig-core-schema.xsd';

let validator: XsdValidator | undefined;

function xsdValidator(): XsdValidator {
  if (validator !== undefined) return validator;
  xmlRegisterInputProvider(
    new XmlBufferInputProvider({
      [XMLDSIG_URL]: readFileSync(new URL('xmldsig-core-schema.xsd', SPECS)),
    }),
  );
  const xsd = XmlDocument.fromBuffer(
    readFileSync(new URL('Schema_VFPR12_v1.2.3.xsd', SPECS)),
    // Lives as long as the test process: the validator keeps pointers into it.
    { url: new URL('Schema_VFPR12_v1.2.3.xsd', SPECS).pathname },
  );
  validator = XsdValidator.fromDoc(xsd);
  return validator;
}

/**
 * libxml2's verdict on `xml` against the FatturaPA XSD 1.2.3: `valid`, and the messages when it
 * is not (also when the XML is not well-formed).
 */
export function libxml2Verdict(xml: string): { valid: boolean; errors: string[] } {
  let document: XmlDocument;
  try {
    document = XmlDocument.fromString(xml);
  } catch (error) {
    if (error instanceof XmlError) return { valid: false, errors: [error.message] };
    throw error;
  }
  try {
    xsdValidator().validate(document);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof XmlError) return { valid: false, errors: [error.message] };
    throw error;
  } finally {
    document.dispose();
  }
}
