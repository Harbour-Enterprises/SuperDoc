// @ts-check
import { NodeTranslator } from '@translator';
import { twipsToPixels, eigthPointsToPixels, halfPointToPoints } from '@core/super-converter/helpers.js';
import { preProcessVerticalMergeCells } from '@core/super-converter/export-helpers/pre-process-vertical-merge-cells.js';
import { translateChildNodes } from '@core/super-converter/v2/exporter/helpers/index.js';
import { translator as trTranslator } from '../tr';
import { translator as tblPrTranslator } from '../tblPr';
import { translator as tblGridTranslator } from '../tblGrid';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tbl';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'table';

/**
 * Encode a w:tbl element as a SuperDoc 'table' node.
 * @param {import('@translator').SCEncoderConfig} [params]
 * @param {import('@translator').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs) => {
  const { nodes } = params;
  const node = nodes[0];

  // Table properties
  const tblPr = node.elements.find((el) => el.name === 'w:tblPr');
  if (tblPr) {
    encodedAttrs['tableProperties'] = tblPrTranslator.encode({ ...params, nodes: [tblPr] }).attributes;
  }

  // Table grid
  const tblGrid = node.elements.find((el) => el.name === 'w:tblGrid');
  if (tblGrid) {
    encodedAttrs['grid'] = tblGridTranslator.encode({ ...params, nodes: [tblGrid] }).attributes;
  }

  // Pull out a few table properties for easier access
  [
    'tableStyleId',
    'justification',
    'tableLayout',
    ['tableIndent', ({ value, type }) => ({ width: twipsToPixels(value), type })],
    ['tableWidth', ({ value, type }) => ({ width: twipsToPixels(value), type })],
    ['tableCellSpacing', ({ value, type }) => ({ w: String(value), type })],
  ].forEach((prop) => {
    /** @type {string} */
    let key;
    /** @type {(v: any) => any | null} */
    let transform;
    if (Array.isArray(prop)) {
      // @ts-ignore
      [key, transform] = prop;
    } else {
      key = prop;
      transform = (v) => v;
    }

    if (encodedAttrs.tableProperties?.[key]) {
      encodedAttrs[key] = transform(encodedAttrs.tableProperties[key]);
    }
  });

  if (encodedAttrs.tableCellSpacing) {
    encodedAttrs['borderCollapse'] = 'separate';
  }
  // Table borders can be specified in tblPr or inside a referenced style tag
  const { borders, rowBorders } = _processTableBorders(encodedAttrs.tableProperties?.borders || {});
  const referencedStyles = _getReferencedTableStyles(encodedAttrs.tableStyleId, params);
  const rows = node.elements.filter((el) => el.name === 'w:tr');
  const borderData = Object.assign({}, referencedStyles?.borders || {}, borders || {});
  const borderRowData = Object.assign({}, referencedStyles?.rowBorders || {}, rowBorders || {});
  encodedAttrs['borders'] = borderData;

  // Process each row
  const tblStyleTag = tblPr.elements.find((el) => el.name === 'w:tblStyle'); // used by the legacy table cell handler
  const columnWidths = (encodedAttrs['grid'] ?? []).map((item) => twipsToPixels(item.col));

  const content = [];
  rows.forEach((row) => {
    const result = trTranslator.encode({
      ...params,
      nodes: [row],
      extraParams: {
        row,
        rowBorders: borderRowData,
        styleTag: tblStyleTag,
        columnWidths,
      },
    });
    if (result.content?.length) content.push(result);
  });

  return {
    type: 'table',
    content,
    attrs: encodedAttrs,
  };
};

/**
 * Decode the table node back into OOXML <w:tbl>.
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs] - The already decoded attributes
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params, decodedAttrs) => {
  // @ts-ignore - helper expects ProseMirror table shape
  params.node = preProcessVerticalMergeCells(params.node, params);
  const { node } = params;
  const elements = translateChildNodes(params);

  // Table grid - generate if not present
  const firstRow = node.content?.find((n) => n.type === 'tableRow');
  const properties = node.attrs.grid;
  const element = tblGridTranslator.decode({
    ...params,
    node: { ...node, attrs: { ...node.attrs, grid: properties } },
    extraParams: {
      firstRow,
    },
  });
  if (element) elements.unshift(element);

  // Table properties
  if (node.attrs?.tableProperties) {
    const properties = { ...node.attrs.tableProperties };
    const element = tblPrTranslator.decode({
      ...params,
      node: { ...node, attrs: { ...node.attrs, tableProperties: properties } },
    });
    if (element) elements.unshift(element);
  }

  return {
    name: 'w:tbl',
    attributes: decodedAttrs || {},
    elements,
  };
};

/**
 * Process the table borders
 * @param {Object[]} [rawBorders] The raw border properties from the `tableProperties` attribute
 * @returns
 */
function _processTableBorders(rawBorders) {
  const borders = {};
  const rowBorders = {};
  Object.entries(rawBorders).forEach(([name, attributes]) => {
    const attrs = {};
    const color = attributes.color;
    const size = attributes.size;
    if (color && color !== 'auto') attrs['color'] = color.startsWith('#') ? color : `#${color}`;
    if (size && size !== 'auto') attrs['size'] = eigthPointsToPixels(size);

    const rowBorderNames = ['insideH', 'insideV'];
    if (rowBorderNames.includes(name)) rowBorders[name] = attrs;
    borders[name] = attrs;
  });

  return {
    borders,
    rowBorders,
  };
}
/**
 *
 * @param {string|null} tableStyleReference
 * @param {import('@translator').SCEncoderConfig} [params]
 * @returns {{borders: {}, name: *, justification: *, fonts: {}, fontSize: *, rowBorders: {}, cellMargins: {}}|null}
 */
export function _getReferencedTableStyles(tableStyleReference, params) {
  if (!tableStyleReference) return null;

  const stylesToReturn = {};

  // Find the style tag in styles.xml
  const { docx } = params;
  const styles = docx['word/styles.xml'];
  const { elements } = styles.elements[0];
  const styleElements = elements.filter((el) => el.name === 'w:style');
  const styleTag = styleElements.find((el) => el.attributes['w:styleId'] === tableStyleReference);
  if (!styleTag) return null;

  stylesToReturn.name = styleTag.elements.find((el) => el.name === 'w:name');

  // Find style it is based on, if any, to inherit table properties from
  const basedOn = styleTag.elements.find((el) => el.name === 'w:basedOn');
  let baseTblPr;
  if (basedOn?.attributes) {
    const baseStyles = styleElements.find((el) => el.attributes['w:styleId'] === basedOn.attributes['w:val']);
    baseTblPr = baseStyles ? baseStyles.elements.find((el) => el.name === 'w:tblPr') : {};
  }

  // Find paragraph properties to get justification
  const pPr = styleTag.elements.find((el) => el.name === 'w:pPr');
  if (pPr) {
    const justification = pPr.elements.find((el) => el.name === 'w:jc');
    if (justification?.attributes) stylesToReturn.justification = justification.attributes['w:val'];
  }

  // Find run properties to get fonts and font size
  const rPr = styleTag?.elements.find((el) => el.name === 'w:rPr');
  if (rPr) {
    const fonts = rPr.elements.find((el) => el.name === 'w:rFonts');
    if (fonts) {
      const { 'w:ascii': ascii, 'w:hAnsi': hAnsi, 'w:cs': cs } = fonts.attributes;
      stylesToReturn.fonts = { ascii, hAnsi, cs };
    }

    const fontSize = rPr.elements.find((el) => el.name === 'w:sz');
    if (fontSize?.attributes) stylesToReturn.fontSize = halfPointToPoints(fontSize.attributes['w:val']) + 'pt';
  }

  // Find table properties to get borders and cell margins
  const tblPr = styleTag.elements.find((el) => el.name === 'w:tblPr');
  if (tblPr && tblPr.elements) {
    if (baseTblPr && baseTblPr.elements) {
      tblPr.elements.push(...baseTblPr.elements);
    }
    const tableProperties = tblPrTranslator.encode({ ...params, nodes: [tblPr] }).attributes;
    const { borders, rowBorders } = _processTableBorders(tableProperties.borders || {});

    if (borders) stylesToReturn.borders = borders;
    if (rowBorders) stylesToReturn.rowBorders = rowBorders;

    const cellMargins = {};
    Object.entries(tableProperties.cellMargins || {}).forEach(([key, attrs]) => {
      if (attrs?.value) cellMargins[key] = String(attrs.value);
    });
    if (Object.keys(cellMargins).length) stylesToReturn.cellMargins = cellMargins;
  }

  return stylesToReturn;
}

/**
 * Restore vertically merged cells from a table
 * @param {Object} table The table node
 * @param {Object} editorSchema The editor schema
 * @returns {Object} The table node with merged cells restored
 */
/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_NODE_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
  attributes: [],
};

/**
 * The NodeTranslator instance for the passthrough element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
