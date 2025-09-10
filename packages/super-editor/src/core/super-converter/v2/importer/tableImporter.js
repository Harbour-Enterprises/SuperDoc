import { eigthPointsToPixels, halfPointToPoints, twipsToPixels } from '../../helpers.js';
import { translator as tcTranslator } from '../../v3/handlers/w/tc/tc-translator.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleAllTableNodes = (params) => {
  const { nodes } = params;
  if (nodes.length === 0) {
    return { nodes: [], consumed: 0 };
  }
  const node = nodes[0];

  switch (node.name) {
    case 'w:tbl':
      return { nodes: [handleTableNode(node, params)], consumed: 1 };
  }

  return { nodes: [], consumed: 0 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const tableNodeHandlerEntity = {
  handlerName: 'tableNodeHandler',
  handler: handleAllTableNodes,
};

/**
 *
 * @param {XmlNode} node
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @param {boolean} insideTrackChange
 * @returns {{type: string, content: *, attrs: {borders: *, tableWidth: *, tableWidthType: *}}}
 */
export function handleTableNode(node, params) {
  const { docx, nodeListHandler } = params;
  // Table styles
  const tblPr = node.elements.find((el) => el.name === 'w:tblPr');

  // Table borders can be specified in tblPr or inside a referenced style tag
  const tableBordersElement = tblPr.elements.find((el) => el.name === 'w:tblBorders');
  const tableBorders = tableBordersElement?.elements || [];
  const { borders, rowBorders } = processTableBorders(tableBorders);
  const tblStyleTag = tblPr.elements.find((el) => el.name === 'w:tblStyle');
  const tableStyleId = tblStyleTag?.attributes['w:val'];

  const attrs = { tableStyleId };

  // Other table properties
  const tableIndent = tblPr?.elements.find((el) => el.name === 'w:tblInd');
  if (tableIndent) {
    const { 'w:w': width, 'w:type': type } = tableIndent.attributes;
    attrs['tableIndent'] = { width: twipsToPixels(width), type };
  }

  const tableLayout = tblPr?.elements.find((el) => el.name === 'w:tblLayout');
  if (tableLayout) {
    const { 'w:type': type } = tableLayout.attributes;
    attrs['tableLayout'] = type;
  }

  const referencedStyles = getReferencedTableStyles(tblStyleTag, docx, nodeListHandler);
  const tblW = tblPr.elements.find((el) => el.name === 'w:tblW');

  if (tblW) {
    attrs['tableWidth'] = {
      width: twipsToPixels(tblW.attributes['w:w']),
      type: tblW.attributes['w:type'],
    };
  }

  const tblCellSpacing = tblPr.elements.find((el) => el.name === 'w:tblCellSpacing');
  if (tblCellSpacing) {
    attrs['tableCellSpacing'] = {
      w: tblCellSpacing.attributes['w:w'],
      type: tblCellSpacing.attributes['w:type'],
    };
    attrs['borderCollapse'] = 'separate';
  }

  const tblJustification = tblPr.elements.find((el) => el.name === 'w:jc');
  if (tblJustification?.attributes) {
    attrs['justification'] = tblJustification.attributes['w:val'];
  }

  // TODO: What does this do?
  // const tblLook = tblPr.elements.find((el) => el.name === 'w:tblLook');

  const rows = node.elements.filter((el) => el.name === 'w:tr');
  const refStylesBorders = referencedStyles?.borders || {};
  const refStylesRowBorders = referencedStyles?.rowBorders || {};

  const borderData = Object.keys(borders)?.length ? Object.assign(refStylesBorders, borders) : refStylesBorders;
  const borderRowData = Object.keys(rowBorders)?.length
    ? Object.assign(refStylesRowBorders, rowBorders)
    : refStylesRowBorders;
  attrs['borders'] = borderData;

  const content = [];
  rows.forEach((row) => {
    const result = handleTableRowNode(row, node, borderRowData, tblStyleTag, params);
    if (result.content?.length) content.push(result);
  });

  return {
    type: 'table',
    content,
    attrs,
  };
}

/**
 * @param {Object} options
 * @returns {{type: string, content: (*|*[]), attrs: {}}}
 */
export function handleTableCellNode({
  params,
  node,
  table,
  row,
  rowBorders,
  styleTag,
  columnIndex,
  columnWidth = null,
}) {
  const translatorParams = {
    ...params,
    extraParams: {
      node,
      table,
      row,
      rowBorders,
      styleTag,
      columnIndex,
      columnWidth,
    },
  };
  const schemaNode = tcTranslator.encode(translatorParams);
  return schemaNode;
}

/**
 *
 * @param tblStyleTag
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @returns {{uiPriotity: *, borders: {}, name: *, rowBorders: {}, basedOn: *}|null}
 */
export function getReferencedTableStyles(tblStyleTag, docx) {
  if (!tblStyleTag) return null;

  const stylesToReturn = {};
  const { attributes = {} } = tblStyleTag;
  const tableStyleReference = attributes['w:val'];
  if (!tableStyleReference) return null;

  const styles = docx['word/styles.xml'];
  const { elements } = styles.elements[0];
  const styleElements = elements.filter((el) => el.name === 'w:style');
  const styleTag = styleElements.find((el) => el.attributes['w:styleId'] === tableStyleReference);
  if (!styleTag) return null;

  stylesToReturn.name = styleTag.elements.find((el) => el.name === 'w:name');

  // TODO: Do we need this?
  const basedOn = styleTag.elements.find((el) => el.name === 'w:basedOn');

  let baseTblPr;
  if (basedOn?.attributes) {
    const baseStyles = styleElements.find((el) => el.attributes['w:styleId'] === basedOn.attributes['w:val']);
    baseTblPr = baseStyles ? baseStyles.elements.find((el) => el.name === 'w:tblPr') : {};
  }

  const pPr = styleTag.elements.find((el) => el.name === 'w:pPr');
  if (pPr) {
    const justification = pPr.elements.find((el) => el.name === 'w:jc');
    if (justification?.attributes) stylesToReturn.justification = justification.attributes['w:val'];
  }

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

  const tblPr = styleTag.elements.find((el) => el.name === 'w:tblPr');
  if (tblPr && tblPr.elements) {
    if (baseTblPr && baseTblPr.elements) {
      tblPr.elements.push(...baseTblPr.elements);
    }

    const tableBorders = tblPr?.elements?.find((el) => el.name === 'w:tblBorders');
    const { elements: borderElements = [] } = tableBorders || {};
    const { borders, rowBorders } = processTableBorders(borderElements);
    if (borders) stylesToReturn.borders = borders;
    if (rowBorders) stylesToReturn.rowBorders = rowBorders;

    const tableCellMargin = tblPr?.elements.find((el) => el.name === 'w:tblCellMar');
    if (tableCellMargin) {
      const marginLeft = tableCellMargin.elements.find((el) => el.name === 'w:left');
      const marginRight = tableCellMargin.elements.find((el) => el.name === 'w:right');
      const marginTop = tableCellMargin.elements.find((el) => el.name === 'w:top');
      const marginBottom = tableCellMargin.elements.find((el) => el.name === 'w:bottom');
      stylesToReturn.cellMargins = {
        marginLeft: marginLeft?.attributes['w:w'],
        marginRight: marginRight?.attributes['w:w'],
        marginTop: marginTop?.attributes['w:w'],
        marginBottom: marginBottom?.attributes['w:w'],
      };
    }
  }

  return stylesToReturn;
}

/**
 * Process the table borders
 * @param {Object[]} borderElements
 * @returns
 */
function processTableBorders(borderElements) {
  const borders = {};
  const rowBorders = {};
  borderElements.forEach((borderElement) => {
    const { name } = borderElement;
    const borderName = name.split('w:')[1];
    const { attributes } = borderElement;

    const attrs = {};
    const color = attributes['w:color'];
    const size = attributes['w:sz'];
    if (color && color !== 'auto') attrs['color'] = color.startsWith('#') ? color : `#${color}`;
    if (size && size !== 'auto') attrs['size'] = eigthPointsToPixels(size);

    const rowBorderNames = ['insideH', 'insideV'];
    if (rowBorderNames.includes(borderName)) rowBorders[borderName] = attrs;
    borders[borderName] = attrs;
  });

  return {
    borders,
    rowBorders,
  };
}

/**
 * Process a table row node
 * @param node
 * @param {undefined | null | {insideH?: *, insideV?: *}} rowBorders
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @param {boolean} insideTrackChange
 * @returns {*}
 */
export function handleTableRowNode(node, table, rowBorders, styleTag, params) {
  const attrs = {};

  const tPr = node.elements.find((el) => el.name === 'w:trPr');
  const rowHeightTag = tPr?.elements?.find((el) => el.name === 'w:trHeight');
  const rowHeight = rowHeightTag?.attributes['w:val'];

  // Detect cantSplit flag
  const cantSplitTag = tPr?.elements?.find((el) => el.name === 'w:cantSplit');
  if (cantSplitTag) {
    attrs['cantSplit'] = true;
  }

  const borders = {};
  if (rowBorders?.insideH) borders['bottom'] = rowBorders.insideH;
  if (rowBorders?.insideV) borders['right'] = rowBorders.insideV;
  attrs['borders'] = borders;

  if (rowHeight) {
    attrs['rowHeight'] = twipsToPixels(rowHeight);
  }

  const gridColumnWidths = getGridColumnWidths(table);
  const cellNodes = node.elements.filter((el) => el.name === 'w:tc');

  let currentColumnIndex = 0;
  const content =
    cellNodes?.map((n) => {
      let colWidth = gridColumnWidths?.[currentColumnIndex] || null;

      const result = handleTableCellNode({
        params,
        node: n,
        table,
        row: node,
        rowBorders: borders,
        styleTag,
        columnIndex: currentColumnIndex,
        columnWidth: colWidth,
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
    attrs,
  };
  return newNode;
}

export const getGridColumnWidths = (tableNode) => {
  const tblGrid = tableNode.elements.find((el) => el.name === 'w:tblGrid');
  if (!tblGrid) return [];
  const columnWidths =
    tblGrid?.elements?.flatMap((el) => {
      if (el.name !== 'w:gridCol') return [];
      return twipsToPixels(el.attributes['w:w']);
    }) || [];
  return columnWidths;
};
