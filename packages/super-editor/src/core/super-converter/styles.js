// @ts-check
import {
  halfPointToPoints,
  ptToTwips,
  twipsToPt,
  twipsToPixels,
  twipsToLines,
  eighthPointsToPixels,
  linesToTwips,
} from '@converter/helpers.js';
import { translator as w_pPrTranslator } from '@converter/v3/handlers/w/pPr';
import { translator as w_rPrTranslator } from '@converter/v3/handlers/w/rpr';
import { isValidHexColor, getHexColorFromDocxSystem } from '@converter/helpers';
import { SuperConverter } from '@converter/SuperConverter.js';
import { getUnderlineCssString } from '@extensions/linked-styles/underline-css.js';

/**
 * Properties that must be explicitly overridden by inline formatting.
 * These properties require special handling because inline w:rPr formatting must
 * always take precedence over character style (w:rStyle) properties, even though
 * both are merged in the style chain. This explicit override ensures that direct
 * formatting (e.g., w:sz for fontSize) always wins over linked character styles.
 *
 * Note: fontFamily and color are already handled by combineProperties with full override logic.
 */
const INLINE_OVERRIDE_PROPERTIES = ['fontSize', 'bold', 'italic', 'strike', 'underline', 'letterSpacing'];

/**
 * Default font size in half-points (20 half-points = 10pt).
 * This baseline ensures all text has a valid, positive font size when no other source provides one.
 * Used as the final fallback in fontSize resolution cascade:
 * 1. Inline formatting (highest priority)
 * 2. Character style
 * 3. Paragraph style
 * 4. Document defaults
 * 5. Normal style
 * 6. DEFAULT_FONT_SIZE_HALF_POINTS (this constant)
 */
const DEFAULT_FONT_SIZE_HALF_POINTS = 20;

/**
 * Gets the resolved run properties by merging defaults, styles, and inline properties.
 *
 * FontSize Fallback Behavior:
 * - Validates that the resolved fontSize is a valid positive number
 * - If fontSize is null, 0, negative, or NaN, applies fallback cascade:
 *   1. Document defaults (defaultProps.fontSize)
 *   2. Normal style (normalProps.fontSize)
 *   3. Baseline constant (DEFAULT_FONT_SIZE_HALF_POINTS = 20 half-points = 10pt)
 * - Each fallback source is validated before use (must be positive finite number)
 * - Ensures all text has a valid font size, preventing rendering issues
 *
 * @param {import('@translator').SCEncoderConfig} params - Converter context containing docx data.
 * @param {Object} inlineRpr - The inline run properties.
 * @param {Object} resolvedPpr - The resolved paragraph properties.
 * @param {boolean} [isListNumber=false] - Whether this run is a list number marker. When true,
 *                                         applies special handling for numbering properties and
 *                                         removes inline underlines.
 * @param {boolean} [numberingDefinedInline=false] - Whether numbering is defined inline rather than
 *                                                   in the style definition. When false, inline rPr
 *                                                   is ignored for list numbers.
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
    const numId = resolvedPpr?.numberingProperties?.numId;
    /**
     * Per OOXML spec §17.9.16, numId="0" (or '0') is a special sentinel value that disables
     * numbering inherited from paragraph styles. We only fetch numbering properties when
     * numId is not null/undefined and not the special zero value.
     */
    if (numId != null && numId !== 0 && numId !== '0') {
      numberingProps = getNumberingProperties(
        params,
        resolvedPpr.numberingProperties.ilvl ?? 0,
        numId,
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

  // Ensure direct formatting (inline properties) always win over character style properties.
  // Even though inlineRpr is last in styleChain, we explicitly override to guarantee correctness.
  // This is critical for properties like fontSize where inline w:sz must override w:rStyle fontSize.
  // Note: fontFamily and color are already handled by combineProperties with full override.
  for (const prop of INLINE_OVERRIDE_PROPERTIES) {
    if (inlineRpr?.[prop] != null) {
      finalProps[prop] = inlineRpr[prop];
    }
  }

  // If no fontSize resolved from any source, fall back to defaults/Normal or a 10pt baseline (20 half-points)
  // Validate that the resolved fontSize is a valid positive number
  if (
    finalProps.fontSize == null ||
    typeof finalProps.fontSize !== 'number' ||
    !Number.isFinite(finalProps.fontSize) ||
    finalProps.fontSize <= 0
  ) {
    // Cascade through fallback sources, validating each
    let defaultFontSize = DEFAULT_FONT_SIZE_HALF_POINTS;

    if (
      defaultProps?.fontSize != null &&
      typeof defaultProps.fontSize === 'number' &&
      Number.isFinite(defaultProps.fontSize) &&
      defaultProps.fontSize > 0
    ) {
      defaultFontSize = defaultProps.fontSize;
    } else if (
      normalProps?.fontSize != null &&
      typeof normalProps.fontSize === 'number' &&
      Number.isFinite(normalProps.fontSize) &&
      normalProps.fontSize > 0
    ) {
      defaultFontSize = normalProps.fontSize;
    }

    finalProps.fontSize = defaultFontSize;
  }

  return finalProps;
};

/**
 * Gets the resolved paragraph properties by merging defaults, styles, and inline properties.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Object} inlineProps - The inline paragraph properties.
 * @param {boolean} [insideTable=false] - Whether the paragraph is inside a table.
 * @param {boolean} [overrideInlineStyleId=false] - Whether to override the inline style ID with the one from numbering.
 * @param {string | null} [tableStyleId=null] - styleId for the current table, if any.
 * @returns {Object} The resolved paragraph properties.
 */
export function resolveParagraphProperties(
  params,
  inlineProps,
  insideTable = false,
  overrideInlineStyleId = false,
  tableStyleId = null,
) {
  const defaultProps = getDefaultProperties(params, w_pPrTranslator);
  const { properties: normalProps, isDefault: isNormalDefault } = getStyleProperties(params, 'Normal', w_pPrTranslator);

  let styleId = inlineProps?.styleId;
  let styleProps = inlineProps?.styleId ? resolveStyleChain(params, inlineProps?.styleId, w_pPrTranslator) : {};

  // Numbering style
  let numberingProps = {};
  let ilvl = inlineProps?.numberingProperties?.ilvl ?? styleProps?.numberingProperties?.ilvl;
  let numId = inlineProps?.numberingProperties?.numId ?? styleProps?.numberingProperties?.numId;
  let numberingDefinedInline = inlineProps?.numberingProperties?.numId != null;
  /**
   * Per OOXML spec §17.9.16, numId="0" (or '0') is a special sentinel value that disables/removes
   * numbering inherited from paragraph styles. When encountered inline, we set numId to null to
   * prevent referencing a numbering definition.
   */
  const inlineNumIdDisablesNumbering =
    inlineProps?.numberingProperties?.numId === 0 || inlineProps?.numberingProperties?.numId === '0';
  if (inlineNumIdDisablesNumbering) {
    numId = null;
  }
  /**
   * Validates that the paragraph has valid numbering properties.
   * Per OOXML spec §17.9.16, numId="0" (or '0') disables numbering.
   */
  const isList = numId != null && numId !== 0 && numId !== '0';
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

  const tableProps = tableStyleId ? resolveStyleChain(params, tableStyleId, w_pPrTranslator) : {};

  // Resolve property chain - regular properties are treated differently from indentation
  //   Chain for regular properties
  let defaultsChain;
  if (isNormalDefault) {
    defaultsChain = [defaultProps, normalProps];
  } else {
    defaultsChain = [normalProps, defaultProps];
  }
  const propsChain = [...defaultsChain, tableProps, numberingProps, styleProps, inlineProps];

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

  // TODO: the following likely isn't exactly true --- rather, the doc-default spacing can be overridden by table-level paragraph settings. See 17.7.2 (Style Hierarchy) in the spec.
  if (insideTable && !inlineProps?.spacing && !styleProps.spacing) {
    // Word ignores doc-default spacing inside table cells unless explicitly set,
    // so drop the derived values when nothing is defined inline or via style.
    finalProps.spacing = undefined;
  }
  return finalProps;
}

/**
 * Resolves a style's property chain by following its based-on ancestry.
 * @param {import('@translator').SCEncoderConfig} params - Converter context containing docx data.
 * @param {string} styleId - The style ID to resolve.
 * @param {Object} translator - Translator used to encode style properties.
 * @param {boolean} [followBasedOnChain=true] - Whether to walk the basedOn hierarchy.
 * @returns {Object} Combined properties for the requested style chain.
 */
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

/**
 * Reads document default properties for a given element type (paragraph/run).
 * @param {import('@translator').SCEncoderConfig} params - Converter context with parsed docx.
 * @param {Object} translator - Translator responsible for encoding element properties.
 * @returns {Object} Default property map for the requested element.
 */
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

/**
 * Retrieves the properties for a specific style ID.
 * @param {import('@translator').SCEncoderConfig} params - Converter context with parsed docx.
 * @param {string} styleId - The style identifier to look up.
 * @param {Object} translator - Translator used to encode style properties.
 * @returns {{properties: Object, isDefault: boolean, basedOn: string|null}} Style metadata and properties.
 */
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

/**
 * Resolves numbering properties for a given level and numbering definition.
 * @param {import('@translator').SCEncoderConfig} params - Converter context with numbering data.
 * @param {number} ilvl - Indent level within the numbering definition.
 * @param {number|string} numId - Numbering definition identifier.
 * @param {Object} translator - Translator used to encode numbering properties.
 * @param {number} [tries=0] - Internal guard to avoid infinite recursion when following numStyleLink.
 * @returns {Object} Combined numbering property object for the level.
 */
export function getNumberingProperties(params, ilvl, numId, translator, tries = 0) {
  const { numbering: allDefinitions } = params;
  if (!allDefinitions) return {};
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

/**
 * Performs a deep merge on an ordered list of property objects.
 * @param {Array<Object>} propertiesArray - Ordered list of property objects to combine.
 * @param {Array<string>} [fullOverrideProps=[]] - Keys that should overwrite instead of merge.
 * @param {Object<string, Function>} [specialHandling={}] - Optional per-key merge overrides.
 * @returns {Object} Combined property object.
 */
export const combineProperties = (propertiesArray, fullOverrideProps = [], specialHandling = {}) => {
  if (!propertiesArray || propertiesArray.length === 0) {
    return {};
  }

  /**
   * Determines whether the supplied value is a mergeable plain object.
   * @param {unknown} item - Value to inspect.
   * @returns {boolean} True when the value is a non-array object.
   */
  const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

  /**
   * Deep merges two objects while respecting override lists and per-key handlers.
   * @param {Object} target - Accumulated target object.
   * @param {Object} source - Next source object to merge.
   * @returns {Object} New merged object.
   */
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

/**
 * Combines run property objects while fully overriding certain keys.
 * @param {Array<Object>} propertiesArray - Ordered list of run property objects.
 * @returns {Object} Combined run property object.
 */
export const combineRunProperties = (propertiesArray) => {
  return combineProperties(propertiesArray, ['fontFamily', 'color']);
};

/**
 * Encodes run property objects into mark definitions for the editor schema.
 * @param {Object} runProperties - Run properties extracted from DOCX.
 * @param {Object} docx - Parsed DOCX structure used for theme lookups.
 * @returns {Array<Object>} Mark definitions representing the run styling.
 */
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

/**
 * Converts paragraph properties into a CSS declaration map.
 * @param {Object} paragraphProperties - Paragraph properties after resolution.
 * @param {boolean} hasPreviousParagraph - Whether there is a preceding paragraph.
 * @param {Object | null} nextParagraphProps - Resolved properties of the next paragraph.
 * @returns {Object} CSS properties keyed by CSS property name.
 */
export function encodeCSSFromPPr(paragraphProperties, hasPreviousParagraph, nextParagraphProps) {
  if (!paragraphProperties || typeof paragraphProperties !== 'object') {
    return {};
  }

  let css = {};
  const { spacing, indent, borders, justification } = paragraphProperties;
  const nextStyleId = nextParagraphProps?.styleId;

  if (spacing) {
    const getEffectiveBefore = (nextSpacing, isListItem) => {
      if (!nextSpacing) return 0;
      if (nextSpacing.beforeAutospacing && isListItem) {
        return 0;
      }
      return nextSpacing.before || 0;
    };

    const isDropCap = Boolean(paragraphProperties.framePr?.dropCap);
    const spacingCopy = { ...spacing };
    if (hasPreviousParagraph) {
      delete spacingCopy.before; // Has already been handled by the previous paragraph
    }
    if (isDropCap) {
      spacingCopy.line = linesToTwips(1.0);
      spacingCopy.lineRule = 'auto';
      delete spacingCopy.after;
    } else {
      const nextBefore = getEffectiveBefore(
        nextParagraphProps?.spacing,
        Boolean(nextParagraphProps?.numberingProperties),
      );
      spacingCopy.after = Math.max(spacingCopy.after || 0, nextBefore);
      if (paragraphProperties.contextualSpacing && nextStyleId != null && nextStyleId === paragraphProperties.styleId) {
        spacingCopy.after -= paragraphProperties.spacing?.after || 0;
      }

      if (nextParagraphProps?.contextualSpacing && nextStyleId != null && nextStyleId === paragraphProperties.styleId) {
        spacingCopy.after -= nextBefore;
      }

      spacingCopy.after = Math.max(spacingCopy.after, 0);
    }
    const spacingStyle = getSpacingStyle(spacingCopy, Boolean(paragraphProperties.numberingProperties));
    css = { ...css, ...spacingStyle };
  }

  if (indent && typeof indent === 'object') {
    const hasIndentValue = Object.values(indent).some((value) => value != null && Number(value) !== 0);
    if (hasIndentValue) {
      const { left, right, firstLine, hanging } = indent;
      if (left != null) {
        css['margin-left'] = `${twipsToPixels(left)}px`;
      }
      if (right != null) {
        css['margin-right'] = `${twipsToPixels(right)}px`;
      }
      if (firstLine != null && !hanging) {
        css['text-indent'] = `${twipsToPixels(firstLine)}px`;
      }
      if (firstLine != null && hanging != null) {
        css['text-indent'] = `${twipsToPixels(firstLine - hanging)}px`;
      }
      if (firstLine == null && hanging != null) {
        css['text-indent'] = `${twipsToPixels(-hanging)}px`;
      }
    }
  }

  if (borders && typeof borders === 'object') {
    const sideOrder = ['top', 'right', 'bottom', 'left'];
    const valToCss = {
      single: 'solid',
      dashed: 'dashed',
      dotted: 'dotted',
      double: 'double',
    };

    sideOrder.forEach((side) => {
      const b = borders[side];
      if (!b) return;
      if (['nil', 'none', undefined, null].includes(b.val)) {
        css[`border-${side}`] = 'none';
        return;
      }

      const width = b.size != null ? `${eighthPointsToPixels(b.size)}px` : '1px';
      const cssStyle = valToCss[b.val] || 'solid';
      const color = !b.color || b.color === 'auto' ? '#000000' : `#${b.color}`;

      css[`border-${side}`] = `${width} ${cssStyle} ${color}`;

      if (b.space != null && side === 'bottom') {
        css[`padding-bottom`] = `${eighthPointsToPixels(b.space)}px`;
      }
    });
  }

  if (justification) {
    if (justification === 'both') {
      css['text-align'] = 'justify';
    } else {
      css['text-align'] = justification;
    }
  }

  return css;
}

/**
 * Converts run properties into a CSS declaration map.
 * @param {Object} runProperties - Run properties after resolution.
 * @param {Object} docx - Parsed DOCX content used for theme lookups.
 * @returns {Object} CSS properties keyed by CSS property name.
 */
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

/**
 * Decodes mark definitions back into run property objects.
 * @param {Array<Object>} marks - Mark array from the editor schema.
 * @returns {Object} Run property object.
 */
export function decodeRPrFromMarks(marks) {
  const runProperties = {};
  if (!marks) {
    return runProperties;
  }

  marks.forEach((mark) => {
    const type = mark.type.name ?? mark.type;
    switch (type) {
      case 'strike':
      case 'italic':
      case 'bold':
        runProperties[type] = mark.attrs.value !== '0' && mark.attrs.value !== false;
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

/**
 * Resolves a DOCX font family entry (including theme links) to a CSS font-family string.
 * @param {Object} attributes - Font family attributes from run properties.
 * @param {Object} docx - Parsed DOCX package for theme lookups.
 * @returns {string|null} CSS-ready font-family string or null if unresolved.
 */
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

/**
 * Normalizes highlight/shading attributes to a CSS color value.
 * @param {Object} attributes - Highlight attributes from run properties.
 * @returns {string|null} Hex color string, 'transparent', or null when unsupported.
 */
function getHighLightValue(attributes) {
  const fill = attributes['w:fill'];
  if (fill && fill !== 'auto') return `#${fill}`;
  if (attributes?.['w:val'] === 'none') return 'transparent';
  if (isValidHexColor(attributes?.['w:val'])) return `#${attributes['w:val']}`;
  return getHexColorFromDocxSystem(attributes?.['w:val']) || null;
}

/**
 * Normalizes various toggle representations into booleans.
 * @param {unknown} value - Toggle value from DOCX (bool/number/string).
 * @returns {boolean|null} Normalized boolean or null when indeterminate.
 */
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

/**
 * Parses a CSS declaration string into an object map.
 * @param {string} cssString - CSS string such as "color: red; font-size: 12pt".
 * @returns {Object} Key/value pairs for CSS declarations.
 */
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

/**
 * Adds one or more text-decoration entries to a target Set.
 * @param {Set<string>} targetSet - Set collecting decoration keywords.
 * @param {string|Set<string>} value - Decoration string or Set to merge.
 */
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

/**
 * Converts paragraph spacing values into a CSS style object.
 * @param {Object} spacing - Spacing values expressed in twips.
 * @param {boolean} [isListItem] - Whether the spacing belongs to a list item (affects autospacing).
 * @returns {Object} CSS properties keyed by CSS property name.
 */
export const getSpacingStyle = (spacing, isListItem) => {
  let { before, after, line, lineRule, beforeAutospacing, afterAutospacing } = spacing;
  line = twipsToLines(line);
  // Prevent values less than 1 to avoid squashed text
  if (line != null && line < 1) {
    line = 1;
  }
  if (lineRule === 'exact' && line) {
    line = String(line);
  }

  before = twipsToPixels(before);
  if (beforeAutospacing) {
    if (isListItem) {
      before = 0; // Lists do not apply before autospacing
    }
  }

  after = twipsToPixels(after);
  if (afterAutospacing) {
    if (isListItem) {
      after = 0; // Lists do not apply after autospacing
    }
  }

  const css = {};
  if (before) {
    css['margin-top'] = `${before}px`;
  }
  if (after) {
    css['margin-bottom'] = `${after}px`;
  }
  if (line) {
    if (lineRule !== 'atLeast' || line >= 1) {
      // Prevent values less than 1 to avoid squashed text (unless using explicit units like pt)
      line = Math.max(line, 1);
      css['line-height'] = String(line);
    }
  }

  return css;
};
