// @ts-check
import { 
  twipsToPixels, 
  pixelsToTwips, 
  twipsToLines, 
  linesToTwips, 
  twipsToPt, 
  ptToTwips 
} from '../../../../helpers.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:spacing';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_NAME = 'spacing';

/**
 * Encode OOXML w:spacing attributes to SuperDoc spacing object.
 * Handles multiple interacting attributes with proper unit conversions.
 * 
 * @param {Object} attributes - The OOXML w:spacing element attributes
 * @param {Object} context - Additional context (docx, styleId, marks, etc.)
 * @returns {Object|undefined} The SuperDoc spacing object
 */
const encode = (attributes, context = {}) => {
  if (!attributes || !Object.keys(attributes).length) return undefined;

  const spacing = {};
  const { marks = [] } = context;

  // Handle line spacing - w:line attribute
  const lineSpacing = attributes['w:line'];
  if (lineSpacing) {
    spacing.line = twipsToLines(lineSpacing);
  }

  // Handle line rule - w:lineRule attribute  
  const lineRule = attributes['w:lineRule'];
  if (lineRule) {
    spacing.lineRule = lineRule;
  }

  // Special case: exact line rule converts to points
  if (lineRule === 'exact' && lineSpacing) {
    spacing.line = `${twipsToPt(lineSpacing)}pt`;
  }

  // Handle before spacing - w:before attribute
  const beforeSpacing = attributes['w:before'];
  if (beforeSpacing) {
    spacing.lineSpaceBefore = twipsToPixels(beforeSpacing);
  }

  // Handle after spacing - w:after attribute  
  const afterSpacing = attributes['w:after'];
  if (afterSpacing) {
    spacing.lineSpaceAfter = twipsToPixels(afterSpacing);
  }

  // Handle autospacing - requires font size from text style marks
  const beforeAutospacing = attributes['w:beforeAutospacing'];
  const afterAutospacing = attributes['w:afterAutospacing'];
  
  if ((beforeAutospacing === '1' || afterAutospacing === '1')) {
    const textStyleMark = marks.find((mark) => mark.type === 'textStyle');
    const fontSize = textStyleMark?.attrs?.fontSize;
    
    if (fontSize) {
      const autoSpacingValue = Math.round((parseInt(fontSize) * 0.5 * 96) / 72);
      
      if (beforeAutospacing === '1') {
        spacing.lineSpaceBefore = (spacing.lineSpaceBefore || 0) + autoSpacingValue;
      }
      
      if (afterAutospacing === '1') {
        spacing.lineSpaceAfter = (spacing.lineSpaceAfter || 0) + autoSpacingValue;
      }
    }
  }

  return Object.keys(spacing).length ? spacing : undefined;
};

/**
 * Decode SuperDoc spacing object to OOXML w:spacing attributes.
 * Handles reverse unit conversions and special cases.
 * 
 * @param {Object} attrs - The SuperDoc node attributes
 * @param {Object} context - Additional context
 * @returns {Object|undefined} The OOXML w:spacing attributes
 */
const decode = (attrs, context = {}) => {
  const spacing = attrs.spacing;
  if (!spacing || !Object.keys(spacing).length) return undefined;

  const attributes = {};

  // Handle lineSpaceBefore -> w:before (pixels to twips)
  if (spacing.lineSpaceBefore >= 0) {
    attributes['w:before'] = pixelsToTwips(spacing.lineSpaceBefore);
  }

  // Handle lineSpaceAfter -> w:after (pixels to twips)  
  if (spacing.lineSpaceAfter >= 0) {
    attributes['w:after'] = pixelsToTwips(spacing.lineSpaceAfter);
  }

  // Handle lineRule -> w:lineRule
  const lineRule = spacing.lineRule;
  if (lineRule) {
    attributes['w:lineRule'] = lineRule;
  } else {
    attributes['w:lineRule'] = 'auto'; // Default
  }

  // Handle line spacing -> w:line
  const line = spacing.line;
  if (line !== undefined && line !== null) {
    if (lineRule === 'exact') {
      // For exact line rule, line should be in points, convert to twips
      const lineValue = typeof line === 'string' && line.endsWith('pt') 
        ? parseFloat(line) 
        : line;
      attributes['w:line'] = ptToTwips(lineValue);
    } else {
      // For other rules, line is in line units, convert to twips
      attributes['w:line'] = linesToTwips(line);
    }
  }

  return Object.keys(attributes).length ? attributes : undefined;
};

/** @type {import('@translator').AttrConfig} */
export const attrConfig = Object.freeze({
  xmlName: XML_NODE_NAME,
  sdName: SD_ATTR_NAME,
  encode,
  decode,
});