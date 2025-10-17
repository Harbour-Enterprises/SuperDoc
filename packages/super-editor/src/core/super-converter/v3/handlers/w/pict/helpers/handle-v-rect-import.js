import { parseInlineStyles } from './parse-inline-styles';
import { translator as wPTranslator } from '@converter/v3/handlers/w/p';

/**
 * Handler for v:rect elements
 * @param {Object} options
 * @returns {Object}
 */
export function handleVRectImport({ pNode, pict, params }) {
  const rect = pict.elements?.find((el) => el.name === 'v:rect');

  const schemaAttrs = {};
  const rectAttrs = rect.attributes || {};

  // Store all the attributes you specified
  schemaAttrs.attributes = rectAttrs;

  // Parse style attribute
  if (rectAttrs.style) {
    const parsedStyle = parseInlineStyles(rectAttrs.style);
    const rectStyle = buildVRectStyles(parsedStyle);

    if (rectStyle) {
      schemaAttrs.style = rectStyle;
    }

    // Extract dimensions for the size attribute
    const size = {};
    if (parsedStyle.width !== undefined) {
      const inlineWidth = parsePointsToPixels(parsedStyle.width);
      size.width = inlineWidth;

      // Check for full page width identifier and adjust width to be 100%
      if (rectAttrs['o:hr'] === 't' && !inlineWidth) {
        size.width = '100%';
      }
    }
    if (parsedStyle.height !== undefined) {
      size.height = parsePointsToPixels(parsedStyle.height);
    }
    if (Object.keys(size).length > 0) {
      schemaAttrs.size = size;
    }
  }

  // Handle fillcolor
  if (rectAttrs.fillcolor) {
    schemaAttrs.background = rectAttrs.fillcolor;
  }

  // Store VML-specific attributes
  const vmlAttrs = {};
  if (rectAttrs['o:hralign']) vmlAttrs.hralign = rectAttrs['o:hralign'];
  if (rectAttrs['o:hrstd']) vmlAttrs.hrstd = rectAttrs['o:hrstd'];
  if (rectAttrs['o:hr']) vmlAttrs.hr = rectAttrs['o:hr'];
  if (rectAttrs.stroked) vmlAttrs.stroked = rectAttrs.stroked;

  if (Object.keys(vmlAttrs).length > 0) {
    schemaAttrs.vmlAttributes = vmlAttrs;
  }

  // Determine if this is a horizontal rule
  const isHorizontalRule = rectAttrs['o:hr'] === 't' || rectAttrs['o:hrstd'] === 't';
  if (isHorizontalRule) {
    schemaAttrs.horizontalRule = true;
  }

  const pElement = wPTranslator.encode({
    ...params,
    nodes: [{ ...pNode, elements: pNode.elements.filter((el) => el.name !== 'w:r') }],
  });
  pElement.content = [
    {
      type: 'contentBlock',
      attrs: schemaAttrs,
    },
  ];

  return pElement;
}

export function parsePointsToPixels(value) {
  if (typeof value !== 'string') return value;

  // Convert points to pixels (1pt ≈ 1.33px)
  if (value.endsWith('pt')) {
    const val = value.replace('pt', '');
    if (isNaN(Number(val))) {
      return 0;
    }
    const points = parseFloat(val);
    return Math.ceil(points * 1.33);
  }

  // Handle pixel values
  if (value.endsWith('px')) {
    const val = value.replace('px', '');
    if (isNaN(Number(val))) {
      return 0;
    }
    return parseInt(val);
  }

  // Handle numeric values (assume pixels)
  const numValue = parseFloat(value);
  return isNaN(numValue) ? 0 : numValue;
}

/**
 * @param {Object} styleObject
 * @returns {string}
 */
export function buildVRectStyles(styleObject) {
  let style = '';
  for (const [prop, value] of Object.entries(styleObject)) {
    style += `${prop}: ${value};`;
  }
  return style;
}
