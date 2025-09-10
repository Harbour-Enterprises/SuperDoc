import { pixelsToTwips, inchesToTwips, pixelsToEightPoints } from '@converter/helpers';
import { translateChildNodes } from '@converter/v2/exporter/helpers/index';

/**
 * Main translation function for a table cell.
 * @param {import('@converter/exporter').ExportParams} params
 * @returns {import('@converter/exporter').XmlReadyNode}
 */
export function translateTableCell(params) {
  const elements = translateChildNodes({
    ...params,
    tableCell: params.node,
  });

  const cellProps = generateTableCellProperties(params.node);
  elements.unshift(cellProps);

  return {
    name: 'w:tc',
    elements,
  };
}

/**
 * Generate w:tcPr properties node for a table cell
 * @param {import('@converter/exporter').SchemaNode} node
 * @returns {import('@converter/exporter').XmlReadyNode}
 */
export function generateTableCellProperties(node) {
  const elements = [];

  const { attrs } = node;
  const { colwidth = [], cellWidthType = 'dxa', background = {}, colspan, rowspan, widthUnit } = attrs;
  const colwidthSum = colwidth.reduce((acc, curr) => acc + curr, 0);

  const cellWidthElement = {
    name: 'w:tcW',
    attributes: {
      'w:w': widthUnit === 'px' ? pixelsToTwips(colwidthSum) : inchesToTwips(colwidthSum),
      'w:type': cellWidthType,
    },
  };
  elements.push(cellWidthElement);

  if (colspan) {
    const gridSpanElement = {
      name: 'w:gridSpan',
      attributes: { 'w:val': `${colspan}` },
    };
    elements.push(gridSpanElement);
  }

  const { color } = background || {};
  if (color) {
    const cellBgElement = {
      name: 'w:shd',
      attributes: { 'w:fill': color },
    };
    elements.push(cellBgElement);
  }

  const { cellMargins } = attrs;
  if (cellMargins) {
    const cellMarginsElement = {
      name: 'w:tcMar',
      elements: generateCellMargins(cellMargins),
    };
    elements.push(cellMarginsElement);
  }

  const { verticalAlign } = attrs;
  if (verticalAlign) {
    const vertAlignElement = {
      name: 'w:vAlign',
      attributes: { 'w:val': verticalAlign },
    };
    elements.push(vertAlignElement);
  }

  // const { vMerge } = attrs;
  // if (vMerge) {}
  if (rowspan && rowspan > 1) {
    const vMergeElement = {
      name: 'w:vMerge',
      type: 'element',
      attributes: { 'w:val': 'restart' },
    };
    elements.push(vMergeElement);
  } else if (attrs.continueMerge) {
    const vMergeElement = {
      name: 'w:vMerge',
      type: 'element',
    };
    elements.push(vMergeElement);
  }

  const { borders = {} } = attrs;
  if (!!borders && Object.keys(borders).length) {
    const cellBordersElement = {
      name: 'w:tcBorders',
      elements: Object.entries(borders).map(([key, value]) => {
        if (!value.size || value.val === 'none') {
          return {
            name: `w:${key}`,
            attributes: {
              'w:val': 'nil',
            },
          };
        }
        return {
          name: `w:${key}`,
          attributes: {
            'w:val': 'single',
            'w:color': value.color ? value.color.substring(1) : 'auto',
            'w:sz': pixelsToEightPoints(value.size),
            'w:space': value.space || 0,
          },
        };
      }),
    };

    elements.push(cellBordersElement);
  }

  return {
    name: 'w:tcPr',
    elements,
  };
}

/**
 * @param {Object} cellMargins
 * @returns {Array}
 */
export function generateCellMargins(cellMargins) {
  const elements = [];
  const { top, right, bottom, left } = cellMargins;
  if (top != null) elements.push({ name: 'w:top', attributes: { 'w:w': pixelsToTwips(top) } });
  if (right != null) elements.push({ name: 'w:right', attributes: { 'w:w': pixelsToTwips(right) } });
  if (bottom != null) elements.push({ name: 'w:bottom', attributes: { 'w:w': pixelsToTwips(bottom) } });
  if (left != null) elements.push({ name: 'w:left', attributes: { 'w:w': pixelsToTwips(left) } });
  return elements;
}
