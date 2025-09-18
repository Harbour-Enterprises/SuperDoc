// @ts-check
import { NodeTranslator } from '@translator';
import { twipsToPixels, pixelsToTwips } from '@core/super-converter/helpers.js';
import { createAttributeHandler } from '@converter/v3/handlers/utils.js';

import { translateChildNodes } from '@core/super-converter/v2/exporter/helpers/index.js';
import { translator as tcTranslator } from '../tc';
import { translator as trPrTranslator } from '../trPr';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'tableRow';

/**
 * The attributes that can be mapped between OOXML and SuperDoc.
 * Note: These are specifically OOXML valid attributes for a given node.
 * @type {import('@translator').AttrConfig[]}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 472
 */
const validXmlAttributes = ['w:rsidDel', 'w:rsidR', 'w:rsidRPr', 'w:rsidTr', 'w14:paraId', 'w14:textId'].map(
  (xmlName) => createAttributeHandler(xmlName),
);

/**
 * Encode a w:tr element as a SuperDoc 'tableRow' node.
 * @param {import('@translator').SCEncoderConfig} [params]
 * @param {import('@translator').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs) => {
  const { row } = params.extraParams;

  let tableRowProperties = {};
  const tPr = row.elements.find((el) => el.name === 'w:trPr');
  if (tPr) {
    ({ attributes: tableRowProperties } = trPrTranslator.encode({
      ...params,
      nodes: [tPr],
    }));
  }
  encodedAttrs['tableRowProperties'] = Object.freeze(tableRowProperties);

  // Move some properties up a level for easier access
  encodedAttrs['rowHeight'] = twipsToPixels(tableRowProperties['rowHeight']?.value);
  encodedAttrs['cantSplit'] = tableRowProperties['cantSplit'];

  // Handling cells
  const { columnWidths: gridColumnWidths } = params.extraParams;
  const cellNodes = row.elements.filter((el) => el.name === 'w:tc');
  let currentColumnIndex = 0;
  const content =
    cellNodes?.map((n) => {
      let columnWidth = gridColumnWidths?.[currentColumnIndex] || null;

      const result = tcTranslator.encode({
        ...params,
        extraParams: {
          ...params.extraParams,
          node: n,
          columnIndex: currentColumnIndex,
          columnWidth,
        },
      });

      const tcPr = n.elements?.find((el) => el.name === 'w:tcPr');
      const colspanTag = tcPr?.elements?.find((el) => el.name === 'w:gridSpan');
      const colspan = parseInt(colspanTag?.attributes['w:val'] || 1, 10);
      currentColumnIndex += colspan;

      return result;
    }) || [];

  const newNode = {
    type: 'tableRow',
    content,
    attrs: encodedAttrs,
  };
  return newNode;
};

/**
 * Decode the tableRow node back into OOXML <w:tr>.
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs] - The already decoded attributes
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params, decodedAttrs) => {
  const { node } = params;
  const elements = translateChildNodes(params);
  if (node.attrs?.tableRowProperties) {
    const tableRowProperties = { ...node.attrs.tableRowProperties };
    // Update rowHeight and cantSplit in tableRowProperties if they exist
    if (node.attrs.rowHeight != null) {
      const rowHeightPixels = twipsToPixels(node.attrs.tableRowProperties['rowHeight']?.value);
      if (rowHeightPixels !== node.attrs.rowHeight) {
        // If the value has changed, update it
        tableRowProperties['rowHeight'] = { value: String(pixelsToTwips(node.attrs['rowHeight'])) };
      }
    }
    tableRowProperties['cantSplit'] = node.attrs['cantSplit'];
    const trPr = trPrTranslator.decode({
      ...params,
      node: { ...node, attrs: { ...node.attrs, tableRowProperties } },
    });
    if (trPr) elements.unshift(trPr);
  }

  return {
    name: 'w:tr',
    attributes: decodedAttrs || {},
    elements,
  };
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_NODE_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
  attributes: validXmlAttributes,
};

/**
 * The NodeTranslator instance for the passthrough element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
