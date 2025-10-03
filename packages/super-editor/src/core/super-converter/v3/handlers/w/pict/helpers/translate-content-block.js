import { translator as alternateChoiceTranslator } from '@converter/v3/handlers/mc/altermateContent';
import { generateRandomSigned32BitIntStrId } from '@helpers/generateDocxRandomId';
import { wrapTextInRun } from '@converter/exporter';

/**
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateContentBlock(params) {
  const { node } = params;
  const { vmlAttributes, horizontalRule } = node.attrs;

  // Handle VML v:rect elements (like horizontal rules)
  if (vmlAttributes || horizontalRule) {
    return translateVRectContentBlock(params);
  }

  const alternateContent = alternateChoiceTranslator.decode(params);
  return wrapTextInRun(alternateContent);
}

/**
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateVRectContentBlock(params) {
  const { node } = params;
  const { vmlAttributes, background, attributes, style } = node.attrs;

  const rectAttrs = {
    id: attributes?.id || `_x0000_i${Math.floor(Math.random() * 10000)}`,
  };

  if (style) {
    rectAttrs.style = style;
  }

  if (background) {
    rectAttrs.fillcolor = background;
  }

  if (vmlAttributes) {
    if (vmlAttributes.hralign) rectAttrs['o:hralign'] = vmlAttributes.hralign;
    if (vmlAttributes.hrstd) rectAttrs['o:hrstd'] = vmlAttributes.hrstd;
    if (vmlAttributes.hr) rectAttrs['o:hr'] = vmlAttributes.hr;
    if (vmlAttributes.stroked) rectAttrs.stroked = vmlAttributes.stroked;
  }

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (!rectAttrs[key] && value !== undefined) {
        rectAttrs[key] = value;
      }
    });
  }

  // Create the v:rect element
  const rect = {
    name: 'v:rect',
    attributes: rectAttrs,
  };

  // Wrap in w:pict
  const pict = {
    name: 'w:pict',
    attributes: {
      'w14:anchorId': generateRandomSigned32BitIntStrId(),
    },
    elements: [rect],
  };

  return wrapTextInRun(pict);
}
