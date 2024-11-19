import {
  twipsToPixels,
  twipsToInches,
  halfPointToPixels,
  eigthPointsToPixels,
  halfPointToPoints
} from "../../helpers.js";


/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleAllTableNodes = (nodes, docx, nodeListHandler, insideTrackChange) => {
  if (nodes.length === 0) {
    return { nodes: [], consumed: 0 };
  }
  const node = nodes[0];

  switch (node.name) {
    case 'w:tbl':
      return { nodes: [handleTableNode(node, docx, nodeListHandler)], consumed: 1 };
    case 'w:tr':
      return { nodes: [handleTableRowNode(node, undefined, docx, nodeListHandler, insideTrackChange)], consumed: 1 };
    case 'w:tc':
      return { nodes: [handleTableCellNode(node, docx, nodeListHandler, insideTrackChange)], consumed: 1 };
  }

  return { nodes: [], consumed: 0 };
}

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const tableNodeHandlerEntity = {
  handlerName: 'tableNodeHandler',
  handler: handleAllTableNodes
};



/**
 *
 * @param {XmlNode} node
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @param {boolean} insideTrackChange
 * @returns {{type: string, content: *, attrs: {borders: *, tableWidth: *, tableWidthType: *, gridColumnWidths: *}}}
 */
export function handleTableNode(node, docx, nodeListHandler, insideTrackChange) {
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
      }
    }
    
    // TODO: What does this do?
    // const tblLook = tblPr.elements.find((el) => el.name === 'w:tblLook');
    const tblGrid = node.elements.find((el) => el.name === 'w:tblGrid');
    const gridColumnWidths = tblGrid.elements?.map((el) => twipsToInches(el.attributes['w:w']));

    const rows = node.elements.filter((el) => el.name === 'w:tr');
    
    const borderData = Object.keys(borders)?.length ? borders : referencedStyles?.borders;
    const borderRowData = Object.keys(rowBorders)?.length ? rowBorders : referencedStyles?.rowBorders;
    attrs['borders'] = borderData;
    
    const content = rows.map((row) => handleTableRowNode(
      row,
      borderRowData,
      tblStyleTag,
      docx,
      nodeListHandler,
      insideTrackChange)
    );
    
    const hasCellBorders = content.some(row => row.content.some(cell => Object.keys(cell.attrs.borders).length > 0));
    if (hasCellBorders) {
      attrs['borderCollapse'] = 'separate';
    }
    
    return {
      type: 'table',
      content,
      attrs,
    }
}


/**
 *
 * @param node
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @param {boolean} insideTrackChange
 * @returns {{type: string, content: (*|*[]), attrs: {}}}
 */
export function handleTableCellNode(node, styleTag, docx, nodeListHandler, insideTrackChange) {
  const tcPr = node.elements.find((el) => el.name === 'w:tcPr');
  const borders = tcPr?.elements?.find((el) => el.name === 'w:tcBorders');
  const inlineBorders = processInlineCellBorders(borders);

  const tcWidth = tcPr?.elements?.find((el) => el.name === 'w:tcW');
  const width = tcWidth ? twipsToInches(tcWidth.attributes['w:w']) : null;
  const widthType = tcWidth?.attributes['w:type'];

  // TODO: Do we need other background attrs?
  const backgroundColor = tcPr?.elements?.find((el) => el.name === 'w:shd');
  const background = {
    color: backgroundColor?.attributes['w:fill'],
  }

  const colspanTag = tcPr?.elements?.find((el) => el.name === 'w:gridSpan');
  const colspan = colspanTag?.attributes['w:val'];

  const marginTag = tcPr?.elements?.find((el) => el.name === 'w:tcMar');

  const verticalAlignTag = tcPr?.elements?.find((el) => el.name === 'w:vAlign');
  const verticalAlign = verticalAlignTag?.attributes['w:val'];
  
  const attributes = {};
  const referencedStyles = getReferencedTableStyles(styleTag, docx) || {};
  attributes.cellMargins = getTableCellMargins(marginTag, referencedStyles);

  const { fontSize, fonts = {} } = referencedStyles;
  const fontFamily = fonts['ascii'];

  if (width) attributes['width'] = width;
  if (widthType) attributes['widthType'] = widthType;
  if (colspan) attributes['colspan'] = colspan;
  if (background) attributes['background'] = background;
  if (verticalAlign) attributes['verticalAlign'] = verticalAlign;
  if (fontSize) attributes['fontSize'] = fontSize;
  if (fontFamily) attributes['fontFamily'] = fontFamily['ascii'];
  if (inlineBorders) attributes['borders'] = inlineBorders;
  
  return {
    type: 'tableCell',
    content: nodeListHandler.handler(node.elements, docx, insideTrackChange),
    attrs: attributes,
  }
}

const processBorder = (borders, direction) => {
  const borderAttrs = borders?.elements?.find((el) => el.name === `w:${direction}`)?.attributes;
  if (borderAttrs && borderAttrs['w:val'] !== 'nil') {
    const border = {};
    const color = borderAttrs['w:color'];
    if (color) border['color'] = `#${color}`;
    const size = borderAttrs['w:sz'];
    if (size) border['size'] = halfPointToPixels(size);
    return border;
  }
  return null;
};

const processInlineCellBorders = (borders) => {
  if (!borders) return {};

  const processedBorders = {};
  const inlineBorderBottom = processBorder(borders, 'bottom');
  if (inlineBorderBottom) processedBorders['bottom'] = inlineBorderBottom;
  const inlineBorderTop = processBorder(borders, 'top');
  if (inlineBorderTop) processedBorders['top'] = inlineBorderTop;
  const inlineBorderLeft = processBorder(borders, 'left');
  if (inlineBorderLeft) processedBorders['left'] = inlineBorderLeft;
  const inlineBorderRight = processBorder(borders, 'right');
  if (inlineBorderRight) processedBorders['right'] = inlineBorderRight;

  return processedBorders;
};


/**
 *
 * @param tblStyleTag
 * @param {ParsedDocx} docx
 * @param {NodeListHandler} nodeListHandler
 * @returns {{uiPriotity: *, borders: {}, name: *, rowBorders: {}, basedOn: *}|null}
 */
function getReferencedTableStyles(tblStyleTag, docx, nodeListHandler) {
  if (!tblStyleTag) return null;

  const stylesToReturn = {};
  const { attributes } = tblStyleTag;
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
  const uiPriotity = styleTag.elements.find((el) => el.name === 'w:uiPriority');
  
  const pPr = styleTag.elements.find((el) => el.name === 'w:pPr');
  if (pPr) {
    const justification = pPr.elements.find((el) => el.name === 'w:jc');
    if (justification) stylesToReturn.justification = justification.attributes['w:val'];
  }

  const rPr = styleTag?.elements.find((el) => el.name === 'w:rPr');
  if (rPr) {
    const fonts = rPr.elements.find((el) => el.name === 'w:rFonts');
    if (fonts) {
      const { 'w:ascii': ascii, 'w:hAnsi': hAnsi, 'w:cs': cs } = fonts.attributes;
      stylesToReturn.fonts = { ascii, hAnsi, cs };
    }

    const fontSize = rPr.elements.find((el) => el.name === 'w:sz');
    if (fontSize) stylesToReturn.fontSize = halfPointToPoints(fontSize.attributes['w:val']) + 'pt';
  }

  const tblPr = styleTag.elements.find((el) => el.name === 'w:tblPr');
  if (tblPr && tblPr.elements) {
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
      }
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
    if (size && size !== 'auto') attrs['size'] = halfPointToPixels(size);

    const rowBorderNames = ['insideH', 'insideV'];
    if (rowBorderNames.includes(borderName)) rowBorders[borderName] = attrs;
    borders[borderName] = attrs;
  });

  //debugger
  return {
    borders,
    rowBorders
  }
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
export function handleTableRowNode(node, rowBorders, styleTag, docx, nodeListHandler,  insideTrackChange) {
  const attrs = {};

  const tPr = node.elements.find((el) => el.name === 'w:trPr');
  const rowHeightTag = tPr?.elements.find((el) => el.name === 'w:trHeight');
  const rowHeight = rowHeightTag?.attributes['w:val'];
  const rowHeightRule = rowHeightTag?.attributes['w:hRule'];

  const borders = {};
  if (rowBorders?.insideH) borders['bottom'] = rowBorders.insideH;
  if (rowBorders?.insideV) borders['right'] = rowBorders.insideV;
  attrs['borders'] = borders;

  if (rowHeight) {
    attrs['rowHeight'] = twipsToPixels(rowHeight);
  }

  const cellNodes = node.elements.filter((el) => el.name === 'w:tc');
  const content = cellNodes?.map((n) => handleTableCellNode(n, styleTag, docx, nodeListHandler, insideTrackChange)) || [];
  const newNode = {
    type: 'tableRow',
    content,
    attrs,
  }
  return newNode;
}

/**
 * Process the margins for a table cell
 * @param {Object} marginTag 
 * @param {Object} referencedStyles 
 * @returns 
 */
const getTableCellMargins = (marginTag, referencedStyles) => {
  const inlineMarginLeftTag = marginTag?.elements?.find((el) => el.name === 'w:left');
  const inlineMarginRightTag = marginTag?.elements?.find((el) => el.name === 'w:right');
  const inlineMarginTopTag = marginTag?.elements?.find((el) => el.name === 'w:top');
  const inlineMarginBottomTag = marginTag?.elements?.find((el) => el.name === 'w:bottom');

  const inlineMarginLeftValue = inlineMarginLeftTag?.attributes['w:w'];
  const inlineMarginRightValue = inlineMarginRightTag?.attributes['w:w'];
  const inlineMarginTopValue = inlineMarginTopTag?.attributes['w:w'];
  const inlineMarginBottomValue = inlineMarginBottomTag?.attributes['w:w'];

  const { cellMargins = {} } = referencedStyles;
  const {
    marginLeft: marginLeftStyle,
    marginRight: marginRightStyle,
    marginTop: marginTopStyle,
    marginBottom: marginBottomStyle
  } = cellMargins;

  const margins = {
    left: twipsToPixels(inlineMarginLeftValue ?? marginLeftStyle),
    right: twipsToPixels(inlineMarginRightValue ?? marginRightStyle),
    top: twipsToPixels(inlineMarginTopValue ?? marginTopStyle),
    bottom: twipsToPixels(inlineMarginBottomValue ?? marginBottomStyle),
  };
  return margins;
}
