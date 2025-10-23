import { eighthPointsToPixels, twipsToPixels } from '@converter/helpers';
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
  columnIndex,
  columnWidth = null,
  allColumnWidths = [],
  referencedStyles = { fontSize: null, fonts: {}, cellMargins: {} },
}) {
  const { nodeListHandler } = params;
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
    content: normalizeTableCellContent(
      nodeListHandler.handler({
        ...params,
        nodes: node.elements,
        path: [...(params.path || []), node],
      }),
      params.editor,
    ),
    attrs: attributes,
  };
}

function normalizeTableCellContent(content, editor) {
  if (!Array.isArray(content) || content.length === 0) return content;

  const normalized = [];
  const pendingForNextBlock = [];
  const schema = editor?.schema;

  const cloneBlock = (node) => {
    if (!node) return node;
    const cloned = { ...node };
    if (Array.isArray(node.content)) {
      cloned.content = [...node.content];
    } else if (!('content' in node)) {
      // Leave undefined; will be set only if needed
    }
    return cloned;
  };

  const ensureArray = (node) => {
    if (!Array.isArray(node.content)) {
      node.content = [];
    }
    return node.content;
  };

  const isInlineNode = (node) => {
    if (!node || typeof node.type !== 'string') return false;
    if (node.type === 'text') return true;
    if (node.type === 'bookmarkStart' || node.type === 'bookmarkEnd') return true;

    const nodeType = schema?.nodes?.[node.type];
    if (nodeType) {
      if (typeof nodeType.isInline === 'boolean') return nodeType.isInline;
      if (nodeType.spec?.group && typeof nodeType.spec.group === 'string') {
        return nodeType.spec.group.split(' ').includes('inline');
      }
    }

    return false;
  };

  for (const node of content) {
    if (!node || typeof node.type !== 'string') {
      normalized.push(node);
      continue;
    }

    if (!isInlineNode(node)) {
      const blockNode = cloneBlock(node);
      if (pendingForNextBlock.length) {
        const blockContent = ensureArray(blockNode);
        const leadingInline = pendingForNextBlock.splice(0);
        blockNode.content = [...leadingInline, ...blockContent];
      } else if (Array.isArray(blockNode.content)) {
        blockNode.content = [...blockNode.content];
      }

      normalized.push(blockNode);
      continue;
    }

    const targetIsNextBlock = node.type === 'bookmarkStart' || normalized.length === 0;
    if (targetIsNextBlock) {
      pendingForNextBlock.push(node);
    } else {
      const lastIndex = normalized.length - 1;
      const lastNode = normalized[lastIndex];
      if (!lastNode || typeof lastNode.type !== 'string' || isInlineNode(lastNode)) {
        pendingForNextBlock.push(node);
        continue;
      }

      const blockContent = ensureArray(lastNode);
      if (pendingForNextBlock.length) {
        blockContent.push(...pendingForNextBlock.splice(0));
      }
      blockContent.push(node);
    }
  }

  if (pendingForNextBlock.length) {
    if (normalized.length) {
      const lastIndex = normalized.length - 1;
      const lastNode = normalized[lastIndex];
      if (lastNode && typeof lastNode.type === 'string' && !isInlineNode(lastNode)) {
        const blockContent = ensureArray(lastNode);
        blockContent.push(...pendingForNextBlock);
        pendingForNextBlock.length = 0;
      }
    }

    if (pendingForNextBlock.length) {
      normalized.push({
        type: 'paragraph',
        attrs: {},
        content: [...pendingForNextBlock],
      });
      pendingForNextBlock.length = 0;
    }
  }

  return normalized;
}
const processInlineCellBorders = (borders, rowBorders) => {
  if (!borders) return null;

  return ['bottom', 'top', 'left', 'right'].reduce((acc, direction) => {
    const borderAttrs = borders[direction];
    const rowBorderAttrs = rowBorders[direction];

    if (borderAttrs && borderAttrs['val'] !== 'nil') {
      const color = borderAttrs['color'];
      let size = borderAttrs['size'];
      if (size) size = eighthPointsToPixels(size);
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
