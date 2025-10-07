import { eigthPointsToPixels, twipsToPixels } from '@converter/helpers';
import { getReferencedTableStyles } from '@converter/v2/importer/tableImporter';
import { translator as tcPrTranslator } from '../../tcPr';

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
  allColumnWidths = [],
}) {
  const { docx, nodeListHandler } = params;
  const attributes = {};

  // Table Cell Properties
  const tcPr = node.elements.find((el) => el.name === 'w:tcPr');
  const tableCellProperties = tcPr ? (tcPrTranslator.encode({ ...params, nodes: [tcPr] }) ?? {}) : {};
  attributes['tableCellProperties'] = tableCellProperties;

  // Borders
  if (rowBorders?.insideH) {
    rowBorders['bottom'] = rowBorders.insideH;
    delete rowBorders.insideH;
  }
  if (rowBorders?.insideV) {
    rowBorders['right'] = rowBorders.insideV;
    delete rowBorders?.insideV;
  }
  if (rowBorders) attributes['borders'] = { ...rowBorders };
  const inlineBorders = processInlineCellBorders(tableCellProperties.borders, rowBorders);
  if (inlineBorders) attributes['borders'] = Object.assign(attributes['borders'] || {}, inlineBorders);

  // Colspan
  const colspan = tableCellProperties.gridSpan;
  if (colspan && !isNaN(parseInt(colspan, 10))) attributes['colspan'] = parseInt(colspan, 10);

  // Width
  let width = tableCellProperties.cellWidth?.value ? twipsToPixels(tableCellProperties.cellWidth?.value) : null;
  const widthType = tableCellProperties.cellWidth?.type;
  if (widthType) attributes['widthType'] = widthType;

  if (!width && columnWidth) width = columnWidth;
  if (width) {
    attributes['colwidth'] = [width];
    attributes['widthUnit'] = 'px';

    const defaultColWidths = allColumnWidths;
    const hasDefaultColWidths = allColumnWidths && allColumnWidths.length > 0;
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

  // Background
  const background = {
    color: tableCellProperties.shading?.fill,
  };
  // TODO: Do we need other background attrs?
  if (background.color) attributes['background'] = background;

  // Vertical Align
  const verticalAlign = tableCellProperties.vAlign;
  if (verticalAlign) attributes['verticalAlign'] = verticalAlign;

  // Cell Margins
  const referencedStyles = getReferencedTableStyles(styleTag, docx) || { fontSize: null, fonts: {}, cellMargins: {} };
  attributes.cellMargins = getTableCellMargins(tableCellProperties.cellMargins, referencedStyles);

  // Font size and family
  const { fontSize, fonts = {} } = referencedStyles;
  const fontFamily = fonts['ascii'];
  if (fontSize) attributes['fontSize'] = fontSize;
  if (fontFamily) attributes['fontFamily'] = fontFamily;

  // Rowspan - tables can have vertically merged cells
  if (tableCellProperties.vMerge === 'restart') {
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

      const vMerge = getTableCellVMerge(cellAtIndex);

      if (!vMerge || vMerge === 'restart') {
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

  return ['bottom', 'top', 'left', 'right'].reduce((acc, direction) => {
    const borderAttrs = borders[direction];
    const rowBorderAttrs = rowBorders[direction];

    if (borderAttrs && borderAttrs['val'] !== 'nil') {
      const color = borderAttrs['color'];
      let size = borderAttrs['size'];
      if (size) size = eigthPointsToPixels(size);
      acc[direction] = { color, size, val: borderAttrs['val'] };
      return acc;
    }
    if (borderAttrs && borderAttrs['val'] === 'nil') {
      const border = Object.assign({}, rowBorderAttrs || {});
      if (!Object.keys(border).length) {
        return acc;
      } else {
        border['val'] = 'none';
        acc[direction] = border;
        return acc;
      }
    }
    return acc;
  }, {});
};

const getTableCellVMerge = (node) => {
  const tcPr = node.elements.find((el) => el.name === 'w:tcPr');
  const vMerge = tcPr?.elements?.find((el) => el.name === 'w:vMerge');
  if (!vMerge) return null;
  return vMerge.attributes?.['w:val'] || 'continue';
};

/**
 * Process the margins for a table cell
 * @param {Object} inlineMargins
 * @param {Object} referencedStyles
 * @returns
 */
const getTableCellMargins = (inlineMargins, referencedStyles) => {
  const { cellMargins = {} } = referencedStyles;
  return ['left', 'right', 'top', 'bottom'].reduce((acc, direction) => {
    const key = `margin${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
    const inlineValue = inlineMargins ? inlineMargins?.[key]?.value : null;
    const styleValue = cellMargins ? cellMargins[key] : null;
    if (inlineValue != null) {
      acc[direction] = twipsToPixels(inlineValue);
    } else if (styleValue == null) {
      acc[direction] = undefined;
    } else if (typeof styleValue === 'object') {
      acc[direction] = twipsToPixels(styleValue.value);
    } else {
      acc[direction] = twipsToPixels(styleValue);
    }
    return acc;
  }, {});
};
