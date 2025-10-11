// @ts-check
import { translator as w_pPrTranslator } from '@converter/v3/handlers/w/pPr';

/**
 * Gets the resolved paragraph properties by merging defaults, styles, and inline properties.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Object} inlinePpr - The inline paragraph properties.
 * @param {boolean} [insideTable=false] - Whether the paragraph is inside a table.
 * @returns {Object} The resolved paragraph properties.
 */
export const resolveParagraphProperties = (params, inlinePpr, insideTable = false) => {
  const styleId = inlinePpr?.styleId;
  const defaultPpr = getDefaultParagraphProperties(params);
  const { properties: normalPpr, isDefault: isNormalDefault } = getStyleParagraphProperties(params, 'Normal');
  let stylePpr = {},
    basedOn = null;
  if (styleId && styleId !== 'Normal') {
    ({ properties: stylePpr, basedOn } = getStyleParagraphProperties(params, styleId));
  }
  let styleChain = [stylePpr];
  const seenStyles = new Set();
  let nextBasedOn = basedOn;
  while (nextBasedOn) {
    if (seenStyles.has(basedOn)) {
      break;
    }
    seenStyles.add(basedOn);
    const { properties: basedOnPpr, basedOn: nextBasedOn } = getStyleParagraphProperties(params, basedOn);
    if (basedOnPpr && Object.keys(basedOnPpr).length) {
      styleChain.push(basedOnPpr);
    }
    basedOn = nextBasedOn;
  }
  styleChain = styleChain.reverse();
  const combinedStylePpr = combineProperties(styleChain);

  if (isNormalDefault) {
    styleChain = [defaultPpr, normalPpr, combinedStylePpr, inlinePpr];
  } else {
    styleChain = [normalPpr, defaultPpr, combinedStylePpr, inlinePpr];
  }

  const finalPpr = combineProperties(styleChain);

  if (insideTable && !inlinePpr?.spacing && !combinedStylePpr.spacing) {
    // Word ignores doc-default spacing inside table cells unless explicitly set,
    // so drop the derived values when nothing is defined inline or via style.
    finalPpr.spacing = undefined;
  }
  return finalPpr;
};

export const getDefaultParagraphProperties = (params) => {
  const { docx } = params;
  const styles = docx['word/styles.xml'];
  const rootElements = styles?.elements?.[0]?.elements;
  if (!rootElements?.length) {
    return {};
  }
  const defaults = rootElements.find((el) => el.name === 'w:docDefaults');
  const pPrDefault = defaults?.elements?.find((el) => el.name === 'w:pPrDefault') || {};
  const pPr = pPrDefault?.elements?.find((el) => el.name === 'w:pPr');
  if (!pPr) {
    return {};
  }
  const result = w_pPrTranslator.encode({ ...params, nodes: [pPr] }) || {};
  return result;
};

export const getStyleParagraphProperties = (params, styleId) => {
  const { docx } = params;
  const emptyResult = { properties: {}, isDefault: false, basedOn: null };
  if (!styleId) return emptyResult;
  const styles = docx['word/styles.xml'];
  const rootElements = styles?.elements?.[0]?.elements;
  if (!rootElements?.length) {
    return emptyResult;
  }

  const style = rootElements.find((el) => el.name === 'w:style' && el.attributes['w:styleId'] === styleId);
  let basedOn = style?.elements?.find((el) => el.name === 'w:basedOn');
  if (basedOn) {
    basedOn = basedOn?.attributes?.['w:val'];
  }
  const pPr = style?.elements?.find((el) => el.name === 'w:pPr');
  if (!pPr) {
    return emptyResult;
  }
  const result = w_pPrTranslator.encode({ ...params, nodes: [pPr] }) || {};

  return { properties: result, isDefault: style?.attributes?.['w:default'] === '1', basedOn };
};

const combineProperties = (propertiesArray) => {
  if (!propertiesArray || propertiesArray.length === 0) {
    return {};
  }

  const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

  const merge = (target, source) => {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (isObject(source[key])) {
            if (key in target && isObject(target[key])) {
              output[key] = merge(target[key], source[key]);
            } else {
              output[key] = source[key];
            }
          } else {
            output[key] = source[key];
          }
        }
      }
    }

    return output;
  };

  return propertiesArray.reduce((acc, current) => merge(acc, current), {});
};
