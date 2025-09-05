/**
 * Directory containing the XSP files.
 */
export const XSP_DIR = 'specification/OfficeOpenXML-XMLSchema-Transitional';

/**
 * Map of XML namespace URIs to their corresponding prefixes.
 */
export const NS_MAP = {
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main': 'w',
  'http://schemas.openxmlformats.org/drawingml/2006/main': 'a',
  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing': 'wp',
  'http://schemas.openxmlformats.org/drawingml/2006/chartDrawing': 'cdr',
  'http://schemas.openxmlformats.org/officeDocument/2006/math': 'm',
  'http://schemas.openxmlformats.org/markup-compatibility/2006': 'mc',
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships': 'r',
  'http://schemas.openxmlformats.org/officeDocument/2006/sharedTypes': 's',
  'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes': 'vt',
  'http://schemas.openxmlformats.org/presentationml/2006/main': 'p',
  'http://schemas.openxmlformats.org/spreadsheetml/2006/main': 'x',
  'http://www.w3.org/2001/XMLSchema': 'xsd',
};

/**
 * Set of element names that should be passed through without modification.
 */
export const PASS_THROUGH = new Set([
  'mc:AlternateContent',
  'w:sdt',
  'w:customXml',
  'w:ins',
  'w:del',
  'w:moveFrom',
  'w:moveTo',
  'w:proofErr',
  'w:permStart',
  'w:permEnd',
  'w:bookmarkStart',
  'w:bookmarkEnd',
]);

/**
 * Set of element names that require extra wrapper elements.
 */
export const EXTRA_WRAPPER_PARENTS = new Set(['w:p', 'w:tc', 'w:body', 'w:document']);
