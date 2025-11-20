// @ts-check
import { halfPointToPoints, ptToTwips, twipsToPt } from '@converter/helpers.js';
import { translator as w_pPrTranslator } from '@converter/v3/handlers/w/pPr';
import { translator as w_rPrTranslator } from '@converter/v3/handlers/w/rpr';
import { isValidHexColor, getHexColorFromDocxSystem } from '@converter/helpers';
import { SuperConverter } from '@converter/SuperConverter.js';
import { getUnderlineCssString } from '@extensions/linked-styles/underline-css.js';

/**
 * Gets the resolved run properties by merging defaults, styles, and inline properties.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Object} inlineRpr - The inline run properties.
 * @param {Object} resolvedPpr - The resolved paragraph properties.
 * @returns {Object} The resolved run properties.
 */
export const resolveRunProperties = (
  params,
  inlineRpr,
  resolvedPpr,
  isListNumber = false,
  numberingDefinedInline = false,
) => {
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

  let styleChain;

  if (isNormalDefault) {
    styleChain = [defaultProps, normalProps];
  } else {
    styleChain = [normalProps, defaultProps];
  }

  if (isListNumber) {
    // Numbering properties
    let numberingProps = {};
    if (resolvedPpr?.numberingProperties?.numId != null) {
      numberingProps = getNumberingProperties(
        params,
        resolvedPpr.numberingProperties.ilvl ?? 0,
        resolvedPpr.numberingProperties.numId,
        w_rPrTranslator,
      );
    }

    if (!numberingDefinedInline) {
      // If numbering is not defined inline, we need to ignore the inline rPr
      inlineRpr = {};
    }

    // Inline underlines are ignored for list numbers
    if (inlineRpr?.underline) {
      delete inlineRpr.underline;
    }

    styleChain = [...styleChain, paragraphStyleProps, runStyleProps, inlineRpr, numberingProps];
  } else {
    styleChain = [...styleChain, paragraphStyleProps, runStyleProps, inlineRpr];
  }

  const finalProps = combineProperties(styleChain, ['fontFamily', 'color']);
  return finalProps;
};

/**
 * Gets the resolved paragraph properties by merging defaults, styles, and inline properties.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Object} inlineProps - The inline paragraph properties.
 * @param {boolean} [overrideInlineStyleId=false] - Whether to override the inline style ID with the one from numbering.
 * @returns {Object} The resolved paragraph properties.
 */
export function resolveParagraphProperties(params, inlineProps, overrideInlineStyleId = false) {
  const defaultProps = getDefaultProperties(params, w_pPrTranslator);
  const { properties: normalProps, isDefault: isNormalDefault } = getStyleProperties(params, 'Normal', w_pPrTranslator);

  let styleId = inlineProps?.styleId;
  let styleProps = inlineProps?.styleId ? resolveStyleChain(params, inlineProps?.styleId, w_pPrTranslator) : {};

  // Numbering style
  let numberingProps = {};
  let ilvl = inlineProps?.numberingProperties?.ilvl ?? styleProps?.numberingProperties?.ilvl;
  const numId = inlineProps?.numberingProperties?.numId ?? styleProps?.numberingProperties?.numId;
  let numberingDefinedInline = inlineProps?.numberingProperties?.numId != null;
  const isList = numId != null;
  if (isList) {
    ilvl = ilvl != null ? ilvl : 0;
    numberingProps = getNumberingProperties(params, ilvl, numId, w_pPrTranslator);
    if (overrideInlineStyleId && numberingProps.styleId) {
      styleId = numberingProps.styleId;
      styleProps = resolveStyleChain(params, styleId, w_pPrTranslator);
      if (inlineProps) {
        inlineProps.styleId = styleId;

        if (
          styleProps.numberingProperties?.ilvl === inlineProps.numberingProperties?.ilvl &&
          styleProps.numberingProperties?.numId === inlineProps.numberingProperties?.numId
        ) {
          // Numbering is already defined in style, so remove from inline props
          delete inlineProps.numberingProperties;
          numberingDefinedInline = false;
        }
      }
    }
  }

  // Resolve property chain - regular properties are treated differently from indentation
  //   Chain for regular properties
  let defaultsChain;
  if (isNormalDefault) {
    defaultsChain = [defaultProps, normalProps];
  } else {
    defaultsChain = [normalProps, defaultProps];
  }
  const propsChain = [...defaultsChain, numberingProps, styleProps, inlineProps];

  //  Chain for indentation properties
  let indentChain;
  if (isList) {
    if (numberingDefinedInline) {
      // If numbering is defined inline, then numberingProps should override styleProps for indentation
      indentChain = [...defaultsChain, styleProps, numberingProps, inlineProps];
    } else {
      // Otherwise, styleProps should override numberingProps for indentation but it should not follow the based-on chain
      styleProps = resolveStyleChain(params, styleId, w_pPrTranslator, false);
      indentChain = [...defaultsChain, numberingProps, styleProps, inlineProps];
    }
  } else {
    // Otherwise, styleProps should override numberingProps for indentation
    indentChain = [...defaultsChain, numberingProps, styleProps, inlineProps];
  }

  let finalProps = combineProperties(propsChain);
  let finalIndent = combineProperties(
    indentChain.map((props) => (props.indent != null ? { indent: props.indent } : {})),
    [],
    {
      firstLine: (target, source) => {
        // If a higher priority source defines firstLine, remove hanging from the final result
        if (target.hanging != null && source.firstLine != null) {
          delete target.hanging;
        }

        return source.firstLine;
      },
    },
  );
  finalProps.indent = finalIndent.indent;

  return finalProps;
}

const resolveStyleChain = (params, styleId, translator, followBasedOnChain = true) => {
  let styleProps = {},
    basedOn = null;
  if (styleId && styleId !== 'Normal') {
    ({ properties: styleProps, basedOn } = getStyleProperties(params, styleId, translator));
  }

  let styleChain = [styleProps];
  const seenStyles = new Set();
  let nextBasedOn = basedOn;
  while (followBasedOnChain && nextBasedOn) {
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
    return { ...emptyResult, basedOn };
  }
  const result = translator.encode({ ...params, nodes: [elementPr] }) || {};

  return { properties: result, isDefault: style?.attributes?.['w:default'] === '1', basedOn };
}

export function getNumberingProperties(params, ilvl, numId, translator, tries = 0) {
  const { numbering: allDefinitions } = params;
  const { definitions, abstracts } = allDefinitions;

  const propertiesChain = [];

  // Find the num definition for the given numId
  const numDefinition = definitions[numId];
  if (!numDefinition) return {};

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
  const abstractNumId = numDefinition.elements?.find((item) => item.name === 'w:abstractNumId')?.attributes?.['w:val'];

  const listDefinitionForThisNumId = abstracts[abstractNumId];
  if (!listDefinitionForThisNumId) return {};

  // Handle numStyleLink if present
  const numStyleLink = listDefinitionForThisNumId.elements?.find((item) => item.name === 'w:numStyleLink');
  const styleId = numStyleLink?.attributes?.['w:val'];

  if (styleId && tries < 1) {
    const { properties: styleProps } = getStyleProperties(params, styleId, w_pPrTranslator);
    if (styleProps?.numberingProperties?.numId) {
      return getNumberingProperties(params, ilvl, styleProps.numberingProperties.numId, translator, tries + 1);
    }
  }

  // Find the level definition within the abstractNum

  const levelDefinition = listDefinitionForThisNumId?.elements?.find(
    (element) => element.name === 'w:lvl' && element.attributes['w:ilvl'] == ilvl,
  );
  if (!levelDefinition) return {};

  // Find the properties element within the level definition
  const abstractElementPr = levelDefinition?.elements?.find((el) => el.name === translator.xmlName);
  if (!abstractElementPr) return {};
  const abstractProps = translator.encode({ ...params, nodes: [abstractElementPr] }) || {};

  // Find pStyle for this level, if any
  const pStyleElement = levelDefinition?.elements?.find((el) => el.name === 'w:pStyle');
  if (pStyleElement) {
    const pStyleId = pStyleElement?.attributes?.['w:val'];
    abstractProps.styleId = pStyleId;
  }
  propertiesChain.push(abstractProps);

  // Combine properties
  propertiesChain.reverse();
  const result = combineProperties(propertiesChain);

  return result;
}

export const combineProperties = (propertiesArray, fullOverrideProps = [], specialHandling = {}) => {
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
            const handler = specialHandling[key];
            if (handler && typeof handler === 'function') {
              output[key] = handler(output, source);
            } else {
              output[key] = source[key];
            }
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

export function encodeCSSFromRPr(runProperties, docx) {
  if (!runProperties || typeof runProperties !== 'object') {
    return {};
  }

  const css = {};
  const textDecorationLines = new Set();
  let hasTextDecorationNone = false;
  let highlightColor = null;
  let hasHighlightTag = false;

  Object.keys(runProperties).forEach((key) => {
    const value = runProperties[key];
    switch (key) {
      case 'bold': {
        const normalized = normalizeToggleValue(value);
        if (normalized === true) {
          css['font-weight'] = 'bold';
        } else if (normalized === false) {
          css['font-weight'] = 'normal';
        }
        break;
      }
      case 'italic': {
        const normalized = normalizeToggleValue(value);
        if (normalized === true) {
          css['font-style'] = 'italic';
        } else if (normalized === false) {
          css['font-style'] = 'normal';
        }
        break;
      }
      case 'strike': {
        const normalized = normalizeToggleValue(value);
        if (normalized === true) {
          addTextDecorationEntries(textDecorationLines, 'line-through');
        } else if (normalized === false) {
          css['text-decoration'] = 'none';
          hasTextDecorationNone = true;
        }
        break;
      }
      case 'textTransform': {
        if (value != null) {
          css['text-transform'] = value;
        }
        break;
      }
      case 'color': {
        const colorVal = value?.val;
        if (colorVal == null || colorVal === '') {
          break;
        }
        if (String(colorVal).toLowerCase() === 'auto') {
          css['color'] = 'auto';
        } else {
          css['color'] = `#${String(colorVal).replace('#', '').toUpperCase()}`;
        }
        break;
      }
      case 'underline': {
        const underlineType = value?.['w:val'];
        if (!underlineType) break;
        let underlineColor = value?.['w:color'];
        if (
          underlineColor &&
          typeof underlineColor === 'string' &&
          underlineColor.toLowerCase() !== 'auto' &&
          !underlineColor.startsWith('#')
        ) {
          underlineColor = `#${underlineColor}`;
        }

        const underlineCssString = getUnderlineCssString({ type: underlineType, color: underlineColor });
        const underlineCss = parseCssDeclarations(underlineCssString);

        Object.entries(underlineCss).forEach(([prop, propValue]) => {
          if (!propValue) return;
          if (prop === 'text-decoration') {
            css[prop] = propValue;
            if (propValue === 'none') {
              hasTextDecorationNone = true;
            }
            return;
          }
          if (prop === 'text-decoration-line') {
            addTextDecorationEntries(textDecorationLines, propValue);
            return;
          }
          css[prop] = propValue;
        });
        break;
      }
      case 'fontSize': {
        if (value == null) break;
        const points = halfPointToPoints(value);
        if (Number.isFinite(points)) {
          css['font-size'] = `${points}pt`;
        }
        break;
      }
      case 'letterSpacing': {
        if (value == null) break;
        const spacing = twipsToPt(value);
        if (Number.isFinite(spacing)) {
          css['letter-spacing'] = `${spacing}pt`;
        }
        break;
      }
      case 'fontFamily': {
        if (!value) break;
        const fontFamily = getFontFamilyValue(value, docx);
        if (fontFamily) {
          css['font-family'] = fontFamily;
        }
        const eastAsiaFamily = value['eastAsia'];
        if (eastAsiaFamily) {
          const eastAsiaCss = SuperConverter.toCssFontFamily(eastAsiaFamily, docx);
          if (eastAsiaCss && (!fontFamily || eastAsiaCss !== fontFamily)) {
            css['font-family'] = css['font-family'] || eastAsiaCss;
          }
        }
        break;
      }
      case 'highlight': {
        const color = getHighLightValue(value);
        if (color) {
          hasHighlightTag = true;
          highlightColor = color;
        }
        break;
      }
      case 'shading': {
        if (hasHighlightTag) {
          break;
        }
        const fill = value?.['fill'];
        const shdVal = value?.['val'];
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
      default:
        break;
    }
  });

  if (!hasTextDecorationNone && textDecorationLines.size) {
    const combined = new Set();
    addTextDecorationEntries(combined, css['text-decoration-line']);
    textDecorationLines.forEach((entry) => combined.add(entry));
    css['text-decoration-line'] = Array.from(combined).join(' ');
  }

  if (highlightColor) {
    css['background-color'] = highlightColor;
    if (!('color' in css)) {
      // @ts-expect-error - CSS object allows string indexing
      css['color'] = 'inherit';
    }
  }

  return css;
}

export function decodeRPrFromMarks(marks) {
  const runProperties = {};
  if (!marks) {
    return runProperties;
  }

  marks.forEach((mark) => {
    switch (mark.type) {
      case 'strike':
      case 'italic':
      case 'bold':
        if (mark.attrs.value != null) {
          runProperties[mark.type] = mark.attrs.value;
        }
        break;
      case 'underline': {
        const { underlineType, underlineColor } = mark.attrs;
        const underlineAttrs = {};
        if (underlineType) {
          underlineAttrs['w:val'] = underlineType;
        }
        if (underlineColor) {
          underlineAttrs['w:color'] = underlineColor.replace('#', '');
        }
        if (Object.keys(underlineAttrs).length > 0) {
          runProperties.underline = underlineAttrs;
        }
        break;
      }
      case 'highlight':
        if (mark.attrs.color) {
          if (mark.attrs.color.toLowerCase() === 'transparent') {
            runProperties.highlight = { 'w:val': 'none' };
          } else {
            runProperties.highlight = { 'w:val': mark.attrs.color };
          }
        }
        break;
      case 'textStyle':
        Object.keys(mark.attrs).forEach((attr) => {
          const value = mark.attrs[attr];
          switch (attr) {
            case 'textTransform':
              if (value != null) {
                runProperties[attr] = value;
              }
              break;
            case 'color':
              if (value != null) {
                runProperties.color = { val: value.replace('#', '') };
              }
              break;
            case 'fontSize': {
              const points = parseFloat(value);
              if (!isNaN(points)) {
                runProperties.fontSize = points * 2;
              }
              break;
            }
            case 'letterSpacing': {
              const ptValue = parseFloat(value);
              if (!isNaN(ptValue)) {
                // convert to twips
                runProperties.letterSpacing = ptToTwips(ptValue);
              }
              break;
            }
            case 'fontFamily':
              if (value != null) {
                const cleanValue = value.split(',')[0].trim();
                const result = {};
                ['ascii', 'eastAsia', 'hAnsi', 'cs'].forEach((attr) => {
                  result[attr] = cleanValue;
                });
                runProperties.fontFamily = result;
              }
              break;
          }
        });
        break;
    }
  });

  return runProperties;
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

function normalizeToggleValue(value) {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === '0' || normalized === 'false' || normalized === 'off') return false;
    if (normalized === '1' || normalized === 'true' || normalized === 'on') return true;
  }
  return Boolean(value);
}

function parseCssDeclarations(cssString) {
  if (!cssString || typeof cssString !== 'string') {
    return {};
  }
  return cssString
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, declaration) => {
      const separatorIndex = declaration.indexOf(':');
      if (separatorIndex === -1) return acc;
      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();
      if (!property || !value) return acc;
      acc[property] = value;
      return acc;
    }, {});
}

function addTextDecorationEntries(targetSet, value) {
  if (!value) return;
  if (value instanceof Set) {
    value.forEach((entry) => addTextDecorationEntries(targetSet, entry));
    return;
  }
  String(value)
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => targetSet.add(entry));
}
