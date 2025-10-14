// @ts-check
import { NodeTranslator } from '@translator';
import { twipsToPixels, pixelsToTwips } from '@core/super-converter/helpers.js';
import { createAttributeHandler } from '@converter/v3/handlers/utils.js';

import { translateChildNodes } from '@core/super-converter/v2/exporter/helpers/index.js';
import { translator as tcTranslator } from '../tc';
import { translator as trPrTranslator } from '../trPr';
import { advancePastRowSpans, fillPlaceholderColumns, isPlaceholderCell } from './tr-helpers.js';

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
    tableRowProperties = trPrTranslator.encode({
      ...params,
      nodes: [tPr],
    });
  }
  const gridBeforeRaw = tableRowProperties?.['gridBefore'];
  const safeGridBefore =
    typeof gridBeforeRaw === 'number' && Number.isFinite(gridBeforeRaw) && gridBeforeRaw > 0 ? gridBeforeRaw : 0;

  encodedAttrs['tableRowProperties'] = Object.freeze(tableRowProperties);

  // Move some properties up a level for easier access
  encodedAttrs['rowHeight'] = twipsToPixels(tableRowProperties['rowHeight']?.value);
  encodedAttrs['cantSplit'] = tableRowProperties['cantSplit'];

  // Handling cells
  const { columnWidths: gridColumnWidths, activeRowSpans = [] } = params.extraParams;
  const totalColumns = Array.isArray(gridColumnWidths) ? gridColumnWidths.length : 0;
  const pendingRowSpans = Array.isArray(activeRowSpans) ? activeRowSpans.slice() : [];
  while (pendingRowSpans.length < totalColumns) pendingRowSpans.push(0);
  const cellNodes = row.elements.filter((el) => el.name === 'w:tc');
  const content = [];
  let currentColumnIndex = 0;

  const fillUntil = (target, reason) => {
    currentColumnIndex = fillPlaceholderColumns({
      content,
      pendingRowSpans,
      currentIndex: currentColumnIndex,
      targetIndex: target,
      totalColumns,
      gridColumnWidths,
      reason,
    });
  };

  const skipOccupiedColumns = () => {
    currentColumnIndex = advancePastRowSpans(pendingRowSpans, currentColumnIndex, totalColumns);
  };

  fillUntil(safeGridBefore, 'gridBefore');
  skipOccupiedColumns();

  cellNodes?.forEach((node) => {
    skipOccupiedColumns();

    const startColumn = currentColumnIndex;
    const columnWidth = gridColumnWidths?.[startColumn] || null;

    const result = tcTranslator.encode({
      ...params,
      extraParams: {
        ...params.extraParams,
        node,
        columnIndex: startColumn,
        columnWidth,
      },
    });

    if (result) {
      content.push(result);
      const colspan = Math.max(1, result.attrs?.colspan || 1);
      const rowspan = Math.max(1, result.attrs?.rowspan || 1);

      if (rowspan > 1) {
        for (let offset = 0; offset < colspan; offset += 1) {
          const target = startColumn + offset;
          if (target < pendingRowSpans.length) {
            pendingRowSpans[target] = Math.max(pendingRowSpans[target], rowspan - 1);
          }
        }
      }

      currentColumnIndex = startColumn + colspan;
    }
  });

  skipOccupiedColumns();
  fillUntil(totalColumns, 'gridAfter');

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

  const cells = node.content || [];
  let leadingPlaceholders = 0;
  while (leadingPlaceholders < cells.length && isPlaceholderCell(cells[leadingPlaceholders])) {
    leadingPlaceholders += 1;
  }

  let trailingPlaceholders = 0;
  while (
    trailingPlaceholders < cells.length - leadingPlaceholders &&
    isPlaceholderCell(cells[cells.length - 1 - trailingPlaceholders])
  ) {
    trailingPlaceholders += 1;
  }

  const trimmedSlice = cells.slice(leadingPlaceholders, cells.length - trailingPlaceholders);
  const sanitizedCells = trimmedSlice.map((cell) => {
    if (cell?.attrs && '__placeholder' in cell.attrs) {
      const { __placeholder, ...rest } = cell.attrs;
      return { ...cell, attrs: rest };
    }
    return cell;
  });
  const trimmedContent = sanitizedCells.filter((_, index) => !isPlaceholderCell(trimmedSlice[index]));

  const translateParams = {
    ...params,
    node: { ...node, content: trimmedContent },
  };

  const elements = translateChildNodes(translateParams);

  if (node.attrs?.tableRowProperties) {
    const tableRowProperties = { ...node.attrs.tableRowProperties };
    if (leadingPlaceholders > 0) {
      tableRowProperties.gridBefore = leadingPlaceholders;
    }
    if (trailingPlaceholders > 0) {
      tableRowProperties.gridAfter = trailingPlaceholders;
    }
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
