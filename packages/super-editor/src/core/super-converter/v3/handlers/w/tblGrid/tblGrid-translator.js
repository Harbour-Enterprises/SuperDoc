// @ts-check
import { NodeTranslator } from '@translator';
import { encodeProperties } from '../../utils.js';
import { translator as gridColTranslator } from '../gridCol';
import { twipsToPixels, pixelsToTwips } from '@converter/helpers.js';
import { normalizeTwipWidth, resolveFallbackColumnWidthTwips } from './tblGrid-helpers.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tblGrid';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'grid';

// Minimum cell width in twips
const cellMinWidth = pixelsToTwips(10);

/**
 * Encode the w:rPr element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];

  // Process property translators
  const attributes = encodeProperties(node, { [gridColTranslator.xmlName]: gridColTranslator }, true);

  return {
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode the tableProperties in the table node back into OOXML <w:tblPr>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { grid: rawGrid } = params.node.attrs || {};
  const grid = Array.isArray(rawGrid) ? rawGrid : [];
  const { firstRow = {} } = params.extraParams || {};

  const cellNodes = firstRow.content?.filter((n) => n.type === 'tableCell') ?? [];

  const columnCountFromCells = cellNodes.reduce((count, cell) => {
    const spanCount = Math.max(1, cell?.attrs?.colspan ?? 1);
    return count + spanCount;
  }, 0);

  const totalColumns = Math.max(columnCountFromCells, grid.length);
  const fallbackColumnWidthTwips = resolveFallbackColumnWidthTwips(params, totalColumns, cellMinWidth);

  // Build the <w:tblGrid> columns
  const elements = [];
  let columnIndex = 0;

  const pushColumn = (widthTwips) => {
    let numericWidth = typeof widthTwips === 'string' ? parseInt(widthTwips, 10) : widthTwips;
    if (numericWidth == null || Number.isNaN(numericWidth) || numericWidth <= 0) {
      numericWidth = fallbackColumnWidthTwips;
    }
    numericWidth = Math.max(numericWidth, cellMinWidth);
    const decoded = gridColTranslator.decode({
      node: { type: /** @type {string} */ (gridColTranslator.sdNodeOrKeyName), attrs: { col: numericWidth } },
    });
    if (decoded) elements.push(decoded);
  };

  cellNodes.forEach((cell) => {
    const { colspan = 1, colwidth } = cell?.attrs || {};
    const spanCount = Math.max(1, colspan);

    for (let span = 0; span < spanCount; span++) {
      const cellWidthPixels = Array.isArray(colwidth) ? colwidth[span] : undefined;
      const colGridAttrs = grid?.[columnIndex] || {};
      const gridWidthTwips = normalizeTwipWidth(colGridAttrs.col);
      const gridWidthPixels = gridWidthTwips != null ? twipsToPixels(gridWidthTwips) : null;

      let cellWidthTwips;
      if (cellWidthPixels != null) {
        if (gridWidthTwips != null && gridWidthPixels === cellWidthPixels) {
          cellWidthTwips = gridWidthTwips;
        } else {
          cellWidthTwips = pixelsToTwips(cellWidthPixels);
        }
      } else if (gridWidthTwips != null) {
        cellWidthTwips = gridWidthTwips;
      } else {
        cellWidthTwips = fallbackColumnWidthTwips;
      }

      pushColumn(cellWidthTwips);
      columnIndex++;
    }
  });

  // Some documents define more grid columns than there are cells in the first row (e.g. empty header rows
  // or grid templates). We still need to emit those trailing columns so the exported grid matches the original.
  while (columnIndex < grid.length) {
    const gridWidthTwips = normalizeTwipWidth(grid[columnIndex]?.col);
    pushColumn(gridWidthTwips);
    columnIndex++;
  }

  const newNode = {
    name: XML_NODE_NAME,
    attributes: {},
    elements,
  };

  return newNode;
};

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  encode,
  decode,
};

/**
 * The NodeTranslator instance for the w:tblPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
