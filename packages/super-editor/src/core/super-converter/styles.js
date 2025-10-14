// @ts-check
import { halfPointToPoints, twipsToPt } from '@converter/helpers.js';
import { translator as w_pPrTranslator } from '@converter/v3/handlers/w/pPr';
import { translator as w_rPrTranslator } from '@converter/v3/handlers/w/rpr';
import { isValidHexColor, getHexColorFromDocxSystem } from '@converter/helpers';
import { SuperConverter } from '@converter/SuperConverter.js';

/**
 * Gets the resolved run properties by merging defaults, styles, and inline properties.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Object} inlineRpr - The inline run properties.
 * @param {Object} resolvedPpr - The resolved paragraph properties.
 * @returns {Object} The resolved run properties.
 */
export const resolveRunProperties = (params, inlineRpr, resolvedPpr, isListNumber = false) => {
  const paragraphStyleId = resolvedPpr?.styleId;
  const paragraphStyleProps = resolveStyleChain(params, paragraphStyleId, w_rPrTranslator);

  // Get default run properties
  const defaultProps = getDefaultProperties(params, w_rPrTranslator);
  const { properties: normalProps, isDefault: isNormalDefault } = getStyleProperties(params, 'Normal', w_rPrTranslator);

  // Get run properties from direct character style, unless it's inside a TOC paragraph style
  let runStyleProps = {};
  if (!paragraphStyleId?.startsWith('TOC')) {
    runStyleProps = inlineRpr.styleId ? resolveStyleChain(params, inlineRpr.styleId, w_rPrTranslator) : {};
  }

  // Numbering properties
  let numberingProps = {};
  if (resolvedPpr?.numberingProperties?.ilvl != null && resolvedPpr?.numberingProperties?.numId != null) {
    numberingProps = getNumberingProperties(
      params,
      resolvedPpr.numberingProperties.ilvl,
      resolvedPpr.numberingProperties.numId,
      w_rPrTranslator,
    );
  }

  let styleChain;

  if (isNormalDefault) {
    styleChain = [defaultProps, normalProps];
  } else {
    styleChain = [normalProps, defaultProps];
  }

  if (isListNumber) {
    styleChain.push(numberingProps);
  }

  styleChain = [...styleChain, paragraphStyleProps, runStyleProps, inlineRpr];

  const finalProps = combineProperties(styleChain, ['fontFamily', 'color']);
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

  const styleProps = inlineProps?.styleId ? resolveStyleChain(params, inlineProps?.styleId, w_pPrTranslator) : {};

  // Numbering style
  let numberingProps = {};
  const ilvl = inlineProps?.numberingProperties?.ilvl ?? styleProps?.numberingProperties?.ilvl;
  const numId = inlineProps?.numberingProperties?.numId ?? styleProps?.numberingProperties?.numId;
  if (ilvl != null && numId != null) {
    numberingProps = getNumberingProperties(params, ilvl, numId, w_pPrTranslator);
  }

  let propsChain;
  if (isNormalDefault) {
    propsChain = [defaultProps, normalProps, numberingProps, styleProps, inlineProps];
  } else {
    propsChain = [normalProps, defaultProps, numberingProps, styleProps, inlineProps];
  }

  let finalProps = combineProperties(propsChain);

  if (insideTable && !inlineProps?.spacing && !styleProps.spacing) {
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

export function getNumberingProperties(params, ilvl, numId, translator) {
  const { docx } = params;
  const numberingElements = docx['word/numbering.xml'].elements?.[0]?.elements;
  if (!numberingElements) return {};

  const propertiesChain = [];

  // Find the num definition for the given numId
  const abstractDefinitions = numberingElements?.filter((element) => element.name === 'w:abstractNum');
  const numDefinitions = numberingElements?.filter((element) => element.name === 'w:num');
  const numDefinition = numDefinitions?.find((element) => element.attributes['w:numId'] == numId);

  // Find overrides for this level in the num definition
  const lvlOverride = numDefinition?.elements?.find(
    (element) => element.name === 'w:lvlOverride' && element.attributes['w:ilvl'] == ilvl,
  );
  const overridePr = lvlOverride?.elements?.find((el) => el.name === translator.xmlName);
  if (overridePr) {
    const overrideProps = translator.encode({ ...params, nodes: [overridePr] }) || {};
    propertiesChain.push(overrideProps);
  }

  // Find corresponding abstractNum definition
  const abstractNumId = numDefinition?.elements[0].attributes['w:val'];
  const listDefinitionForThisNumId = abstractDefinitions?.find(
    (element) => element.attributes['w:abstractNumId'] === abstractNumId,
  );
  if (!listDefinitionForThisNumId) return {};

  // Find the level definition within the abstractNum
  const levelDefinition = listDefinitionForThisNumId?.elements?.find(
    (element) => element.name === 'w:lvl' && element.attributes['w:ilvl'] == ilvl,
  );
  if (!levelDefinition) return {};

  // Find the properties element within the level definition
  const abstractElementPr = levelDefinition?.elements?.find((el) => el.name === translator.xmlName);
  if (!abstractElementPr) return {};
  const abstractProps = translator.encode({ ...params, nodes: [abstractElementPr] }) || {};
  propertiesChain.push(abstractProps);

  // Combine properties
  propertiesChain.reverse();
  const result = combineProperties(propertiesChain);

  return result;
}

export const combineProperties = (propertiesArray, fullOverrideProps = []) => {
  if (!propertiesArray || propertiesArray.length === 0) {
    return {};
  }

  const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

  const merge = (target, source) => {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (!fullOverrideProps.includes(key) && isObject(source[key])) {
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

export const combineRunProperties = (propertiesArray) => {
  return combineProperties(propertiesArray, ['fontFamily', 'color']);
};

export function encodeMarksFromRPr(runProperties, docx) {
  const marks = [];
  const textStyleAttrs = {};
  let highlightColor = null;
  let hasHighlightTag = false;
  Object.keys(runProperties).forEach((key) => {
    const value = runProperties[key];
    switch (key) {
      case 'strike':
      case 'italic':
      case 'bold':
        // case 'boldCs':
        marks.push({ type: key, attrs: { value } });
        break;
      case 'textTransform':
        textStyleAttrs[key] = value;
        break;
      case 'color':
        if (!value.val) {
          textStyleAttrs[key] = null;
        } else if (value.val.toLowerCase() === 'auto') {
          textStyleAttrs[key] = value.val;
        } else {
          textStyleAttrs[key] = `#${value['val'].replace('#', '').toUpperCase()}`;
        }
        break;
      case 'underline':
        let underlineType = value['w:val'];
        if (!underlineType) {
          break;
        }
        let underlineColor = value['w:color'];
        if (underlineColor && underlineColor.toLowerCase() !== 'auto' && !underlineColor.startsWith('#')) {
          underlineColor = `#${underlineColor}`;
        }
        marks.push({
          type: key,
          attrs: {
            underlineType,
            underlineColor,
          },
        });
        break;
      case 'styleId':
        textStyleAttrs[key] = value;
        break;
      case 'fontSize':
        // case 'fontSizeCs':
        const points = halfPointToPoints(value);
        textStyleAttrs[key] = `${points}pt`;
        break;
      case 'letterSpacing':
        const spacing = twipsToPt(value);
        textStyleAttrs[key] = `${spacing}pt`;
        break;
      case 'fontFamily':
        const fontFamily = getFontFamilyValue(value, docx);
        textStyleAttrs[key] = fontFamily;
        const eastAsiaFamily = value['eastAsia'];

        if (eastAsiaFamily) {
          const eastAsiaCss = SuperConverter.toCssFontFamily(eastAsiaFamily, docx);
          if (!fontFamily || eastAsiaCss !== textStyleAttrs.fontFamily) {
            textStyleAttrs.eastAsiaFontFamily = eastAsiaCss;
          }
        }
        break;
      case 'highlight':
        const color = getHighLightValue(value);
        if (color) {
          hasHighlightTag = true;
          highlightColor = color;
        }
        break;
      case 'shading': {
        if (hasHighlightTag) {
          break;
        }
        const fill = value['fill'];
        const shdVal = value['val'];
        if (fill && String(fill).toLowerCase() !== 'auto') {
          highlightColor = `#${String(fill).replace('#', '')}`;
        } else if (typeof shdVal === 'string') {
          const normalized = shdVal.toLowerCase();
          if (normalized === 'clear' || normalized === 'nil' || normalized === 'none') {
            highlightColor = 'transparent';
          }
        }
        break;
      }
    }
  });

  if (Object.keys(textStyleAttrs).length) {
    marks.push({ type: 'textStyle', attrs: textStyleAttrs });
  }

  if (highlightColor) {
    marks.push({ type: 'highlight', attrs: { color: highlightColor } });
  }
  return marks;
}

function getFontFamilyValue(attributes, docx) {
  const ascii = attributes['w:ascii'] ?? attributes['ascii'];
  const themeAscii = attributes['w:asciiTheme'] ?? attributes['asciiTheme'];

  let resolved = ascii;

  if (docx && themeAscii) {
    const theme = docx['word/theme/theme1.xml'];
    if (theme?.elements?.length) {
      const { elements: topElements } = theme;
      const { elements } = topElements[0] || {};
      const themeElements = elements?.find((el) => el.name === 'a:themeElements');
      const fontScheme = themeElements?.elements?.find((el) => el.name === 'a:fontScheme');
      const prefix = themeAscii.startsWith('minor') ? 'minor' : 'major';
      const font = fontScheme?.elements?.find((el) => el.name === `a:${prefix}Font`);
      const latin = font?.elements?.find((el) => el.name === 'a:latin');
      resolved = latin?.attributes?.typeface || resolved;
    }
  }

  if (!resolved) return null;

  return SuperConverter.toCssFontFamily(resolved, docx);
}

function getHighLightValue(attributes) {
  const fill = attributes['w:fill'];
  if (fill && fill !== 'auto') return `#${fill}`;
  if (attributes?.['w:val'] === 'none') return 'transparent';
  if (isValidHexColor(attributes?.['w:val'])) return `#${attributes['w:val']}`;
  return getHexColorFromDocxSystem(attributes?.['w:val']) || null;
}
