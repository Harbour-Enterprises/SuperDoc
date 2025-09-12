import { eigthPointsToPixels, twipsToPixels } from '@converter/helpers';
import { getGridColumnWidths, getReferencedTableStyles } from '@converter/v2/importer/tableImporter';

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
  const { docx, nodeListHandler } = params;
  const tcPr = node.elements.find((el) => el.name === 'w:tcPr');
  const borders = tcPr?.elements?.find((el) => el.name === 'w:tcBorders');

  if (rowBorders?.insideH) {
    rowBorders['bottom'] = rowBorders.insideH;
    delete rowBorders.insideH;
  }
  if (rowBorders?.insideV) {
    rowBorders['right'] = rowBorders.insideV;
    delete rowBorders?.insideV;
  }
  const inlineBorders = processInlineCellBorders(borders, rowBorders);

  const gridColumnWidths = getGridColumnWidths(table);

  const tcWidth = tcPr?.elements?.find((el) => el.name === 'w:tcW');
  let width = tcWidth ? twipsToPixels(tcWidth.attributes['w:w']) : null;
  const widthType = tcWidth?.attributes['w:type'];

  if (!width && columnWidth) width = columnWidth;

  const vMerge = getTableCellMergeTag(node);
  const { attributes: vMergeAttrs } = vMerge || {};

  // TODO: Do we need other background attrs?
  const backgroundColor = tcPr?.elements?.find((el) => el.name === 'w:shd');
  const background = {
    color: backgroundColor?.attributes['w:fill'],
  };

  const colspanTag = tcPr?.elements?.find((el) => el.name === 'w:gridSpan');
  const colspan = colspanTag?.attributes['w:val'];

  const marginTag = tcPr?.elements?.find((el) => el.name === 'w:tcMar');

  const verticalAlignTag = tcPr?.elements?.find((el) => el.name === 'w:vAlign');
  const verticalAlign = verticalAlignTag?.attributes['w:val'] || 'top';

  const attributes = {};
  const referencedStyles = getReferencedTableStyles(styleTag, docx) || {};
  attributes.cellMargins = getTableCellMargins(marginTag, referencedStyles);

  const { fontSize, fonts = {} } = referencedStyles;
  const fontFamily = fonts['ascii'];

  if (width) {
    attributes['colwidth'] = [width];
    attributes['widthUnit'] = 'px';

    const defaultColWidths = gridColumnWidths;
    const hasDefaultColWidths = gridColumnWidths && gridColumnWidths.length > 0;
    const colspanNum = parseInt(colspan || 1, 10);

    if (colspanNum && colspanNum > 1 && hasDefaultColWidths) {
      let colwidth = [];

      for (let i = 0; i < colspanNum; i++) {
        let colwidthValue = defaultColWidths[columnIndex + i];
        let defaultColwidth = 100;

        if (typeof colwidthValue !== 'undefined') {
          colwidth.push(colwidthValue);
        } else {
          colwidth.push(defaultColwidth);
        }
      }

      if (colwidth.length) {
        attributes['colwidth'] = [...colwidth];
      }
    }
  }

  if (widthType) attributes['widthType'] = widthType;
  if (colspan) attributes['colspan'] = parseInt(colspan, 10);
  if (background) attributes['background'] = background;
  if (verticalAlign) attributes['verticalAlign'] = verticalAlign;
  if (fontSize) attributes['fontSize'] = fontSize;
  if (fontFamily) attributes['fontFamily'] = fontFamily['ascii'];
  if (rowBorders) attributes['borders'] = { ...rowBorders };
  if (inlineBorders) attributes['borders'] = Object.assign(attributes['borders'] || {}, inlineBorders);

  // Tables can have vertically merged cells, indicated by the vMergeAttrs
  // if (vMerge) attributes['vMerge'] = vMergeAttrs || 'merged';
  if (vMergeAttrs && vMergeAttrs['w:val'] === 'restart') {
    const rows = table.elements.filter((el) => el.name === 'w:tr');
    const currentRowIndex = rows.findIndex((r) => r === row);
    const remainingRows = rows.slice(currentRowIndex + 1);

    const cellsInRow = row.elements.filter((el) => el.name === 'w:tc');
    let cellIndex = cellsInRow.findIndex((el) => el === node);
    let rowspan = 1;

    // Iterate through all remaining rows after the current cell, and find all cells that need to be merged
    for (let remainingRow of remainingRows) {
      const firstCell = remainingRow.elements.findIndex((el) => el.name === 'w:tc');
      const cellAtIndex = remainingRow.elements[firstCell + cellIndex];

      if (!cellAtIndex) break;

      const vMerge = getTableCellMergeTag(cellAtIndex);
      const { attributes: currentCellMergeAttrs } = vMerge || {};
      if (
        (!vMerge && !currentCellMergeAttrs) ||
        (currentCellMergeAttrs && currentCellMergeAttrs['w:val'] === 'restart')
      ) {
        // We have reached the end of the vertically merged cells
        break;
      }

      // This cell is part of a merged cell, merge it (remove it from its row)
      rowspan++;
      remainingRow.elements.splice(firstCell + cellIndex, 1);
    }
    attributes['rowspan'] = rowspan;
  }

  return {
    type: 'tableCell',
    content: nodeListHandler.handler({
      ...params,
      nodes: node.elements,
      path: [...(params.path || []), node],
    }),
    attrs: attributes,
  };
}

const processInlineCellBorders = (borders, rowBorders) => {
  if (!borders) return null;

  const processedBorders = {};
  const inlineBorderBottom = processBorder(borders, 'bottom', rowBorders);
  if (inlineBorderBottom) processedBorders['bottom'] = inlineBorderBottom;
  const inlineBorderTop = processBorder(borders, 'top', rowBorders);
  if (inlineBorderTop) processedBorders['top'] = inlineBorderTop;
  const inlineBorderLeft = processBorder(borders, 'left', rowBorders);
  if (inlineBorderLeft) processedBorders['left'] = inlineBorderLeft;
  const inlineBorderRight = processBorder(borders, 'right', rowBorders);
  if (inlineBorderRight) processedBorders['right'] = inlineBorderRight;

  return processedBorders;
};

const processBorder = (borders, direction, rowBorders = {}) => {
  const borderAttrs = borders?.elements?.find((el) => el.name === `w:${direction}`)?.attributes;

  if (borderAttrs && borderAttrs['w:val'] !== 'nil') {
    const border = {};
    const color = borderAttrs['w:color'];
    if (color) border['color'] = color === 'auto' ? '#000000' : `#${color}`;
    const size = borderAttrs['w:sz'];
    if (size) border['size'] = eigthPointsToPixels(size);
    return border;
  }
  if (borderAttrs && borderAttrs['w:val'] === 'nil') {
    const border = Object.assign({}, rowBorders[direction] || {});
    if (!Object.keys(border)) return null;
    border['val'] = 'none';
    return border;
  }
  return null;
};

const getTableCellMergeTag = (node) => {
  const tcPr = node.elements.find((el) => el.name === 'w:tcPr');
  const vMerge = tcPr?.elements?.find((el) => el.name === 'w:vMerge');
  return vMerge;
};

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
    marginBottom: marginBottomStyle,
  } = cellMargins;

  const margins = {
    left: twipsToPixels(inlineMarginLeftValue ?? marginLeftStyle),
    right: twipsToPixels(inlineMarginRightValue ?? marginRightStyle),
    top: twipsToPixels(inlineMarginTopValue ?? marginTopStyle),
    bottom: twipsToPixels(inlineMarginBottomValue ?? marginBottomStyle),
  };
  return margins;
};
