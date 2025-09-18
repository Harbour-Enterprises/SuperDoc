// @ts-check
import { NodeTranslator } from '@translator';
import { twipsToPixels, pixelsToTwips, twipsToLines, linesToTwips, twipsToPt, ptToTwips } from '@converter/helpers.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:spacing';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'spacing';

/**
 * Encode w:spacing element from OOXML to SuperDoc spacing object.
 * Handles unit conversions and special cases like exact line rules and autospacing.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs]
 * @returns {Object|undefined} The SuperDoc spacing object
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes, docx } = params;
  const node = nodes[0];

  if (!node || node.name !== XML_NODE_NAME) {
    return undefined;
  }

  const attributes = node.attributes || {};
  const spacing = {};

  // Handle line spacing (w:line and w:lineRule)
  const lineSpacing = attributes['w:line'];
  const lineRule = attributes['w:lineRule'];

  if (lineRule) {
    spacing.lineRule = lineRule;
  }

  if (lineSpacing) {
    if (lineRule === 'exact') {
      // For exact line rules, convert twips to points
      spacing.line = `${twipsToPt(lineSpacing)}pt`;
    } else {
      // For auto/atLeast rules, convert twips to lines (240 twips = 1 line)
      spacing.line = twipsToLines(lineSpacing);
    }
  }

  // Handle before spacing (w:before)
  const beforeSpacing = attributes['w:before'];
  if (beforeSpacing) {
    spacing.lineSpaceBefore = twipsToPixels(beforeSpacing);
  }

  // Handle after spacing (w:after)
  const afterSpacing = attributes['w:after'];
  if (afterSpacing) {
    spacing.lineSpaceAfter = twipsToPixels(afterSpacing);
  }

  // Handle autospacing - this requires font size from text style marks
  // Note: Autospacing calculation will be handled at the paragraph level
  // where we have access to text style marks
  const beforeAutospacing = attributes['w:beforeAutospacing'];
  const afterAutospacing = attributes['w:afterAutospacing'];

  if (beforeAutospacing === '1') {
    spacing.beforeAutospacing = true;
  }

  if (afterAutospacing === '1') {
    spacing.afterAutospacing = true;
  }

  // Return undefined if no spacing attributes were found
  return Object.keys(spacing).length > 0 ? spacing : undefined;
};

/**
 * Decode SuperDoc spacing object back to OOXML w:spacing element.
 * Handles reverse unit conversions and special cases.
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs]
 * @returns {import('@translator').SCDecoderResult|undefined}
 */
const decode = (params, decodedAttrs = {}) => {
  const { node } = params;
  const spacing = node.attrs?.spacing;

  if (!spacing || typeof spacing !== 'object') {
    return undefined;
  }

  const attributes = {};

  // Handle line spacing and line rule
  const { line, lineRule } = spacing;

  if (lineRule) {
    attributes['w:lineRule'] = lineRule;
  }

  if (line != null) {
    if (typeof line === 'string' && line.endsWith('pt')) {
      // Convert points to twips for exact line rules
      const ptValue = parseFloat(line.replace('pt', ''));
      attributes['w:line'] = ptToTwips(ptValue);
      if (!lineRule) {
        attributes['w:lineRule'] = 'exact';
      }
    } else {
      // Convert lines to twips for auto/atLeast rules
      attributes['w:line'] = linesToTwips(line);
      if (!lineRule) {
        attributes['w:lineRule'] = 'auto';
      }
    }
  }

  // Handle before spacing
  const { lineSpaceBefore } = spacing;
  if (lineSpaceBefore != null && lineSpaceBefore >= 0) {
    attributes['w:before'] = pixelsToTwips(lineSpaceBefore);
  }

  // Handle after spacing
  const { lineSpaceAfter } = spacing;
  if (lineSpaceAfter != null && lineSpaceAfter >= 0) {
    attributes['w:after'] = pixelsToTwips(lineSpaceAfter);
  }

  // Handle autospacing flags
  if (spacing.beforeAutospacing) {
    attributes['w:beforeAutospacing'] = '1';
  }

  if (spacing.afterAutospacing) {
    attributes['w:afterAutospacing'] = '1';
  }

  // Return undefined if no attributes were generated
  if (Object.keys(attributes).length === 0) {
    return undefined;
  }

  return attributes;
};

/**
 * The w:spacing translator for handling paragraph spacing attributes.
 * This translator handles complex multi-attribute spacing with unit conversions.
 */
export const translator = new NodeTranslator(
  XML_NODE_NAME,
  SD_NODE_NAME,
  encode,
  decode,
  0, // priority
);
