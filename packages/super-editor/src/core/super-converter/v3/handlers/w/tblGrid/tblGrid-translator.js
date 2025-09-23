// @ts-check
import { NodeTranslator } from '@translator';
import { encodeProperties } from '../../utils.js';
import { translator as gridColTranslator } from '../gridCol';
import { twipsToPixels, pixelsToTwips } from '@converter/helpers.js';

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
  const { grid = [] } = params.node.attrs || {};
  const { firstRow = {} } = params.extraParams || {};

  const cellNodes = firstRow.content?.filter((n) => n.type === 'tableCell') ?? [];
  const numberOfColumns = cellNodes.length || grid.length;

  // Build the <w:tblGrid> columns
  const elements = [];
  for (let cellIdx = 0; cellIdx < numberOfColumns; cellIdx++) {
    const cell = cellNodes[cellIdx];
    const { colspan = 1, colwidth } = cell?.attrs || {};

    for (let mergedCellIdx = 0; mergedCellIdx < colspan; mergedCellIdx++) {
      const cellWidthPixels = colwidth && colwidth[mergedCellIdx];
      const colGridAttrs = grid?.[mergedCellIdx] || {};
      const gridWidthTwips = colGridAttrs.col;
      const gridWidthPixels = twipsToPixels(gridWidthTwips);

      // If cell width matches grid width, use that to avoid rounding issues
      let cellWidthTwips;
      if (gridWidthPixels === cellWidthPixels) {
        cellWidthTwips = gridWidthTwips;
      } else if (cellWidthPixels) {
        cellWidthTwips = pixelsToTwips(cellWidthPixels);
      }

      // Check if pixel width matches
      const widthTwips = Math.max(cellWidthTwips, cellMinWidth);
      elements.push(
        gridColTranslator.decode({
          node: { type: /** @type {string} */ (gridColTranslator.sdNodeOrKeyName), attrs: { col: widthTwips } },
        }),
      );
    }
  }

  const newNode = {
    name: XML_NODE_NAME,
    attributes: {},
    elements: elements,
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
