// @ts-check
import { translator as w_pPrTranslator } from '@converter/v3/handlers/w/pPr';
import { translator as w_rPrTranslator } from '@converter/v3/handlers/w/rpr';

/**
 * Gets the resolved run properties by merging defaults, styles, and inline properties.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Object} inlineRpr - The inline run properties.
 * @param {string} paragraphStyleId - The style ID of the parent paragraph.
 * @returns {Object} The resolved run properties.
 */
export const resolveRunProperties = (params, inlineRpr, paragraphStyleId) => {
  const paragraphStyleProps = resolveStyleChain(params, paragraphStyleId, w_rPrTranslator);
  let runStyleProps = {};

  if (!paragraphStyleId?.startsWith('TOC')) {
    runStyleProps = inlineRpr.styleId ? resolveStyleChain(params, inlineRpr.styleId, w_rPrTranslator) : {};
  }

  const defaultProps = getDefaultProperties(params, w_rPrTranslator);
  const { properties: normalProps, isDefault: isNormalDefault } = getStyleProperties(params, 'Normal', w_rPrTranslator);
  let styleChain;

  if (isNormalDefault) {
    styleChain = [defaultProps, normalProps, paragraphStyleProps, runStyleProps, inlineRpr];
  } else {
    styleChain = [normalProps, defaultProps, paragraphStyleProps, runStyleProps, inlineRpr];
  }

  const finalProps = combineProperties(styleChain);
  return finalProps;
};

/**
 * Gets the resolved paragraph properties by merging defaults, styles, and inline properties.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Object} inlineProps - The inline paragraph properties.
 * @param {boolean} [insideTable=false] - Whether the paragraph is inside a table.
 * @returns {Object} The resolved paragraph properties.
 */
export function resolveParagraphProperties(params, inlineProps, insideTable = false) {
  const defaultProps = getDefaultProperties(params, w_pPrTranslator);
  const { properties: normalProps, isDefault: isNormalDefault } = getStyleProperties(params, 'Normal', w_pPrTranslator);

  const combinedStyleProps = inlineProps?.styleId
    ? resolveStyleChain(params, inlineProps?.styleId, w_pPrTranslator)
    : {};

  let styleChain;
  if (isNormalDefault) {
    styleChain = [defaultProps, normalProps, combinedStyleProps, inlineProps];
  } else {
    styleChain = [normalProps, defaultProps, combinedStyleProps, inlineProps];
  }

  let finalProps = combineProperties(styleChain);

  if (insideTable && !inlineProps?.spacing && !combinedStyleProps.spacing) {
    // Word ignores doc-default spacing inside table cells unless explicitly set,
    // so drop the derived values when nothing is defined inline or via style.
    finalProps.spacing = undefined;
  }
  return finalProps;
}

const resolveStyleChain = (params, styleId, translator) => {
  let styleProps = {},
    basedOn = null;
  if (styleId && styleId !== 'Normal') {
    ({ properties: styleProps, basedOn } = getStyleProperties(params, styleId, translator));
  }

  let styleChain = [styleProps];
  const seenStyles = new Set();
  let nextBasedOn = basedOn;
  while (nextBasedOn) {
    if (seenStyles.has(basedOn)) {
      break;
    }
    seenStyles.add(basedOn);
    const result = getStyleProperties(params, basedOn, translator);
    const basedOnProps = result.properties;
    nextBasedOn = result.basedOn;
    if (basedOnProps && Object.keys(basedOnProps).length) {
      styleChain.push(basedOnProps);
    }
    basedOn = nextBasedOn;
  }
  styleChain = styleChain.reverse();
  const combinedStyleProps = combineProperties(styleChain);
  return combinedStyleProps;
};

export function getDefaultProperties(params, translator) {
  const { docx } = params;
  const styles = docx['word/styles.xml'];
  const rootElements = styles?.elements?.[0]?.elements;
  if (!rootElements?.length) {
    return {};
  }
  const defaults = rootElements.find((el) => el.name === 'w:docDefaults');
  const xmlName = translator.xmlName;
  const elementPrDefault = defaults?.elements?.find((el) => el.name === `${xmlName}Default`) || {};
  const elementPr = elementPrDefault?.elements?.find((el) => el.name === xmlName);
  if (!elementPr) {
    return {};
  }
  const result = translator.encode({ ...params, nodes: [elementPr] }) || {};
  return result;
}

export function getStyleProperties(params, styleId, translator) {
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
  const elementPr = style?.elements?.find((el) => el.name === translator.xmlName);
  if (!elementPr) {
    return emptyResult;
  }
  const result = translator.encode({ ...params, nodes: [elementPr] }) || {};

  return { properties: result, isDefault: style?.attributes?.['w:default'] === '1', basedOn };
}

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
