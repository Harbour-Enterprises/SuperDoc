// @ts-check
import { NodeTranslator } from '@translator';
import { twipsToPixels, eighthPointsToPixels, halfPointToPoints } from '@core/super-converter/helpers.js';
import { preProcessVerticalMergeCells } from '@core/super-converter/export-helpers/pre-process-vertical-merge-cells.js';
import { translateChildNodes } from '@core/super-converter/v2/exporter/helpers/index.js';
import { translator as trTranslator } from '../tr';
import { translator as tblPrTranslator } from '../tblPr';
import { translator as tblGridTranslator } from '../tblGrid';
import { buildFallbackGridForTable } from '@core/super-converter/helpers/tableFallbackHelpers.js';

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
    const encodedProperties = tblPrTranslator.encode({ ...params, nodes: [tblPr] });
    encodedAttrs['tableProperties'] = encodedProperties || {};
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

    if (encodedAttrs.tableProperties && encodedAttrs.tableProperties[key]) {
      encodedAttrs[key] = transform(encodedAttrs.tableProperties[key]);
    }
  });

  if (encodedAttrs.tableCellSpacing) {
    encodedAttrs['borderCollapse'] = 'separate';
  }

  if (encodedAttrs.tableProperties?.tableWidth) {
    const tableWidthMeasurement = encodedAttrs.tableProperties.tableWidth;
    const widthPx = twipsToPixels(tableWidthMeasurement.value);
    if (widthPx != null) {
      encodedAttrs.tableWidth = {
        width: widthPx,
        type: tableWidthMeasurement.type,
      };
    } else if (tableWidthMeasurement.type === 'auto') {
      encodedAttrs.tableWidth = {
        width: 0,
        type: tableWidthMeasurement.type,
      };
    }
  }
  // Table borders can be specified in tblPr or inside a referenced style tag
  const { borders, rowBorders } = _processTableBorders(encodedAttrs.tableProperties?.borders || {});
  const referencedStyles = _getReferencedTableStyles(encodedAttrs.tableStyleId, params);
  if (referencedStyles?.cellMargins && !encodedAttrs.tableProperties?.cellMargins) {
    encodedAttrs.tableProperties = {
      ...(encodedAttrs.tableProperties || {}),
      cellMargins: referencedStyles.cellMargins,
    };
  }
  const rows = node.elements.filter((el) => el.name === 'w:tr');
  const borderData = Object.assign({}, referencedStyles?.borders || {}, borders || {});
  const borderRowData = Object.assign({}, referencedStyles?.rowBorders || {}, rowBorders || {});
  encodedAttrs['borders'] = borderData;

  // Process each row
  let columnWidths = Array.isArray(encodedAttrs['grid'])
    ? encodedAttrs['grid'].map((item) => twipsToPixels(item.col))
    : [];

  if (!columnWidths.length) {
    const fallback = buildFallbackGridForTable({
      params,
      rows,
      tableWidth: encodedAttrs.tableWidth,
      tableWidthMeasurement: encodedAttrs.tableProperties?.tableWidth,
    });
    if (fallback) {
      encodedAttrs.grid = fallback.grid;
      columnWidths = fallback.columnWidths;
    }
  }

  const content = [];
  const totalColumns = columnWidths.length;
  const activeRowSpans = totalColumns > 0 ? new Array(totalColumns).fill(0) : [];
  rows.forEach((row, rowIndex) => {
    const result = trTranslator.encode({
      ...params,
      nodes: [row],
      extraParams: {
        row,
        table: node,
        rowBorders: borderRowData,
        columnWidths,
        activeRowSpans: activeRowSpans.slice(),
        rowIndex,
        _referencedStyles: referencedStyles,
      },
    });
    if (result) {
      content.push(result);

      if (totalColumns > 0) {
        // Preserve the current-row occupancy so column advancement still skips cells covered by active rowspans.
        const activeRowSpansForCurrentRow = activeRowSpans.slice();

        // Consume one row of coverage for any column that was spanning into this row.
        for (let col = 0; col < totalColumns; col++) {
          if (activeRowSpans[col] > 0) {
            activeRowSpans[col] -= 1;
          }
        }

        // Start at the zeroth column; trTranslator already emitted placeholders for any gridBefore spacing.
        let columnIndex = 0;

        const advanceColumnIndex = () => {
          // Skip over columns that are still occupied in the current row (pre-decrement state).
          while (columnIndex < totalColumns && activeRowSpansForCurrentRow[columnIndex] > 0) {
            columnIndex += 1;
          }
        };

        advanceColumnIndex();

        result.content?.forEach((cell) => {
          advanceColumnIndex();
          const colspan = Math.max(1, cell.attrs?.colspan || 1);
          const rowspan = Math.max(1, cell.attrs?.rowspan || 1);

          if (rowspan > 1) {
            for (let offset = 0; offset < colspan && columnIndex + offset < totalColumns; offset++) {
              const targetIndex = columnIndex + offset;
              const remainingRows = rowspan - 1;
              // Track the maximum remaining rowspan so future rows know this column is blocked.
              if (remainingRows > 0 && remainingRows > activeRowSpans[targetIndex]) {
                activeRowSpans[targetIndex] = remainingRows;
              }
            }
          }

          columnIndex += colspan;
          advanceColumnIndex();
        });
      }
    }
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
    if (size && size !== 'auto') attrs['size'] = eighthPointsToPixels(size);

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
    const tableProperties = tblPrTranslator.encode({ ...params, nodes: [tblPr] });
    if (tableProperties) {
      const { borders, rowBorders } = _processTableBorders(tableProperties.borders || {});

      if (borders) stylesToReturn.borders = borders;
      if (rowBorders) stylesToReturn.rowBorders = rowBorders;

      const cellMargins = {};
      Object.entries(tableProperties.cellMargins || {}).forEach(([key, attrs]) => {
        if (attrs?.value != null) {
          cellMargins[key] = {
            value: attrs.value,
            type: attrs.type || 'dxa',
          };
        }
      });
      if (Object.keys(cellMargins).length) stylesToReturn.cellMargins = cellMargins;
    }
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
