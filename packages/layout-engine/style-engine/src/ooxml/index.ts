/**
 * @superdoc/style-engine/ooxml
 *
 * Shared OOXML style resolution logic used by the converter and layout engine.
 * This module is format-aware (docx), but translator-agnostic.
 */

import {
  applyInlineOverrides,
  combineIndentProperties,
  combineProperties,
  combineRunProperties,
  createFirstLineIndentHandler,
  DEFAULT_FONT_SIZE_HALF_POINTS,
  INLINE_OVERRIDE_PROPERTIES,
  isValidFontSize,
  orderDefaultsAndNormal,
  resolveFontSizeWithFallback,
} from '../cascade.js';
import type { CombinePropertiesOptions, PropertyObject, SpecialHandler } from '../cascade.js';

export {
  applyInlineOverrides,
  combineIndentProperties,
  combineProperties,
  combineRunProperties,
  createFirstLineIndentHandler,
  DEFAULT_FONT_SIZE_HALF_POINTS,
  INLINE_OVERRIDE_PROPERTIES,
  isValidFontSize,
  orderDefaultsAndNormal,
  resolveFontSizeWithFallback,
};
export type { CombinePropertiesOptions, PropertyObject, SpecialHandler };

export interface OoxmlTranslator {
  xmlName: string;
  encode: (params: unknown) => Record<string, unknown> | null | undefined;
}

export interface OoxmlTranslators {
  pPr: OoxmlTranslator;
  rPr: OoxmlTranslator;
}

export interface OoxmlNumberingContext {
  definitions?: Record<string, unknown>;
  abstracts?: Record<string, unknown>;
}

export interface OoxmlResolverParams {
  docx?: Record<string, unknown>;
  numbering?: OoxmlNumberingContext | null;
}

export function createOoxmlResolver(translators: OoxmlTranslators) {
  return {
    resolveRunProperties: (
      params: OoxmlResolverParams,
      inlineRpr: Record<string, unknown> | null | undefined,
      resolvedPpr: Record<string, unknown> | null | undefined,
      isListNumber = false,
      numberingDefinedInline = false,
    ) => resolveRunProperties(translators, params, inlineRpr, resolvedPpr, isListNumber, numberingDefinedInline),
    resolveParagraphProperties: (
      params: OoxmlResolverParams,
      inlineProps: Record<string, unknown> | null | undefined,
      insideTable = false,
      overrideInlineStyleId = false,
      tableStyleId: string | null = null,
    ) => resolveParagraphProperties(translators, params, inlineProps, insideTable, overrideInlineStyleId, tableStyleId),
    getDefaultProperties,
    getStyleProperties,
    resolveStyleChain,
    getNumberingProperties: (
      params: OoxmlResolverParams,
      ilvl: number,
      numId: number | string,
      translator: OoxmlTranslator,
      tries = 0,
    ) => getNumberingProperties(translators, params, ilvl, numId, translator, tries),
  };
}

export function resolveRunProperties(
  translators: OoxmlTranslators,
  params: OoxmlResolverParams,
  inlineRpr: Record<string, unknown> | null | undefined,
  resolvedPpr: Record<string, unknown> | null | undefined,
  isListNumber = false,
  numberingDefinedInline = false,
): Record<string, unknown> {
  const paragraphStyleId = resolvedPpr?.styleId as string | undefined;
  const paragraphStyleProps = resolveStyleChain(params, paragraphStyleId, translators.rPr);

  const defaultProps = getDefaultProperties(params, translators.rPr);
  const { properties: normalProps, isDefault: isNormalDefault } = getStyleProperties(params, 'Normal', translators.rPr);

  let runStyleProps: Record<string, unknown> = {};
  if (!paragraphStyleId?.startsWith('TOC')) {
    runStyleProps = inlineRpr?.styleId ? resolveStyleChain(params, inlineRpr.styleId as string, translators.rPr) : {};
  }

  const defaultsChain = orderDefaultsAndNormal(defaultProps, normalProps, isNormalDefault);
  const inlineRprSafe = inlineRpr ?? {};
  let styleChain: PropertyObject[];
  let inlineOverrideSource: Record<string, unknown> = inlineRprSafe;

  if (isListNumber) {
    let numberingProps: Record<string, unknown> = {};
    const numberingProperties = resolvedPpr?.numberingProperties as Record<string, unknown> | undefined;
    const numId = numberingProperties?.numId as number | string | undefined;
    if (numId != null && numId !== 0 && numId !== '0') {
      numberingProps = getNumberingProperties(
        translators,
        params,
        (numberingProperties?.ilvl as number | undefined) ?? 0,
        numId,
        translators.rPr,
      );
    }

    const inlineRprForList = numberingDefinedInline ? inlineRprSafe : {};
    if (inlineRprForList?.underline) {
      delete inlineRprForList.underline;
    }

    styleChain = [...defaultsChain, paragraphStyleProps, runStyleProps, inlineRprForList, numberingProps];
    inlineOverrideSource = inlineRprForList;
  } else {
    styleChain = [...defaultsChain, paragraphStyleProps, runStyleProps, inlineRprSafe];
  }

  const finalProps = combineRunProperties(styleChain);

  applyInlineOverrides(finalProps, inlineOverrideSource);
  finalProps.fontSize = resolveFontSizeWithFallback(finalProps.fontSize, defaultProps, normalProps);

  return finalProps;
}

export function resolveParagraphProperties(
  translators: OoxmlTranslators,
  params: OoxmlResolverParams,
  inlineProps: Record<string, unknown> | null | undefined,
  insideTable = false,
  overrideInlineStyleId = false,
  tableStyleId: string | null = null,
): Record<string, unknown> {
  const defaultProps = getDefaultProperties(params, translators.pPr);
  const { properties: normalProps, isDefault: isNormalDefault } = getStyleProperties(params, 'Normal', translators.pPr);

  const inlinePropsSafe = inlineProps ?? {};
  let styleId = inlinePropsSafe?.styleId as string | undefined;
  let styleProps = inlinePropsSafe?.styleId
    ? resolveStyleChain(params, inlinePropsSafe.styleId as string, translators.pPr)
    : {};

  let numberingProps: Record<string, unknown> = {};
  let ilvl =
    (inlinePropsSafe?.numberingProperties as Record<string, unknown> | undefined)?.ilvl ??
    (styleProps?.numberingProperties as Record<string, unknown> | undefined)?.ilvl;
  let numId =
    (inlinePropsSafe?.numberingProperties as Record<string, unknown> | undefined)?.numId ??
    (styleProps?.numberingProperties as Record<string, unknown> | undefined)?.numId;
  let numberingDefinedInline =
    (inlinePropsSafe?.numberingProperties as Record<string, unknown> | undefined)?.numId != null;

  const inlineNumId = (inlinePropsSafe?.numberingProperties as Record<string, unknown> | undefined)?.numId;
  const inlineNumIdDisablesNumbering = inlineNumId === 0 || inlineNumId === '0';
  if (inlineNumIdDisablesNumbering) {
    numId = null;
  }

  const isList = numId != null && numId !== 0 && numId !== '0';
  if (isList) {
    ilvl = ilvl != null ? (ilvl as number) : 0;
    numberingProps = getNumberingProperties(translators, params, ilvl, numId as number | string, translators.pPr);
    if (overrideInlineStyleId && numberingProps.styleId) {
      styleId = numberingProps.styleId as string;
      styleProps = resolveStyleChain(params, styleId, translators.pPr);
      if (inlinePropsSafe) {
        inlinePropsSafe.styleId = styleId;
        const inlineNumProps = inlinePropsSafe.numberingProperties as Record<string, unknown> | undefined;
        if (
          (styleProps.numberingProperties as Record<string, unknown> | undefined)?.ilvl === inlineNumProps?.ilvl &&
          (styleProps.numberingProperties as Record<string, unknown> | undefined)?.numId === inlineNumProps?.numId
        ) {
          delete inlinePropsSafe.numberingProperties;
          numberingDefinedInline = false;
        }
      }
    }
  }

  const tableProps = tableStyleId ? resolveStyleChain(params, tableStyleId, translators.pPr) : {};

  const defaultsChain = orderDefaultsAndNormal(defaultProps, normalProps, isNormalDefault);
  const propsChain = [...defaultsChain, tableProps, numberingProps, styleProps, inlinePropsSafe];

  let indentChain: PropertyObject[];
  if (isList) {
    if (numberingDefinedInline) {
      indentChain = [...defaultsChain, styleProps, numberingProps, inlinePropsSafe];
    } else {
      styleProps = resolveStyleChain(params, styleId, translators.pPr, false);
      indentChain = [...defaultsChain, numberingProps, styleProps, inlinePropsSafe];
    }
  } else {
    indentChain = [...defaultsChain, numberingProps, styleProps, inlinePropsSafe];
  }

  const finalProps = combineProperties(propsChain);
  const finalIndent = combineIndentProperties(indentChain);
  finalProps.indent = (finalIndent as Record<string, unknown>).indent;

  if (insideTable && !inlinePropsSafe?.spacing && !(styleProps as Record<string, unknown>)?.spacing) {
    finalProps.spacing = undefined;
  }

  return finalProps;
}

export function resolveStyleChain(
  params: OoxmlResolverParams,
  styleId: string | undefined,
  translator: OoxmlTranslator,
  followBasedOnChain = true,
): Record<string, unknown> {
  let styleProps: Record<string, unknown> = {};
  let basedOn: string | null = null;
  if (styleId && styleId !== 'Normal') {
    ({ properties: styleProps, basedOn } = getStyleProperties(params, styleId, translator));
  }

  let styleChain: Record<string, unknown>[] = [styleProps];
  const seenStyles = new Set<string>();
  let nextBasedOn = basedOn;
  while (followBasedOnChain && nextBasedOn) {
    if (seenStyles.has(basedOn as string)) {
      break;
    }
    seenStyles.add(basedOn as string);
    const result = getStyleProperties(params, nextBasedOn, translator);
    const basedOnProps = result.properties;
    nextBasedOn = result.basedOn;
    if (basedOnProps && Object.keys(basedOnProps).length) {
      styleChain.push(basedOnProps);
    }
    basedOn = nextBasedOn;
  }
  styleChain = styleChain.reverse();
  return combineProperties(styleChain);
}

export function getDefaultProperties(
  params: OoxmlResolverParams,
  translator: OoxmlTranslator,
): Record<string, unknown> {
  const docx = params?.docx as Record<string, unknown> | undefined;
  const styles = docx?.['word/styles.xml'] as Record<string, unknown> | undefined;
  const rootElements = (styles as { elements?: Array<Record<string, unknown>> })?.elements?.[0]?.elements as
    | Array<Record<string, unknown>>
    | undefined;
  if (!rootElements?.length) {
    return {};
  }

  const defaults = rootElements.find((el) => el.name === 'w:docDefaults');
  const xmlName = translator.xmlName;
  const elementPrDefault = (defaults as Record<string, unknown>)?.elements?.find(
    (el: Record<string, unknown>) => el.name === `${xmlName}Default`,
  ) as Record<string, unknown> | undefined;
  const elementPr = elementPrDefault?.elements?.find((el: Record<string, unknown>) => el.name === xmlName) as
    | Record<string, unknown>
    | undefined;
  if (!elementPr) {
    return {};
  }

  return translator.encode({ ...params, nodes: [elementPr] }) || {};
}

export function getStyleProperties(
  params: OoxmlResolverParams,
  styleId: string,
  translator: OoxmlTranslator,
): { properties: Record<string, unknown>; isDefault: boolean; basedOn: string | null } {
  const emptyResult = { properties: {}, isDefault: false, basedOn: null };
  if (!styleId) return emptyResult;

  const docx = params?.docx as Record<string, unknown> | undefined;
  const styles = docx?.['word/styles.xml'] as Record<string, unknown> | undefined;
  const rootElements = (styles as { elements?: Array<Record<string, unknown>> })?.elements?.[0]?.elements as
    | Array<Record<string, unknown>>
    | undefined;
  if (!rootElements?.length) {
    return emptyResult;
  }

  const style = rootElements.find(
    (el) => el.name === 'w:style' && (el.attributes as Record<string, unknown>)?.['w:styleId'] === styleId,
  ) as Record<string, unknown> | undefined;
  let basedOn = style?.elements?.find((el: Record<string, unknown>) => el.name === 'w:basedOn') as
    | Record<string, unknown>
    | undefined;
  if (basedOn) {
    basedOn = basedOn?.attributes?.['w:val'] as string | undefined;
  }
  const elementPr = style?.elements?.find((el: Record<string, unknown>) => el.name === translator.xmlName) as
    | Record<string, unknown>
    | undefined;
  if (!elementPr) {
    return { ...emptyResult, basedOn: basedOn as string | null };
  }

  const result = translator.encode({ ...params, nodes: [elementPr] }) || {};
  const isDefault = (style?.attributes as Record<string, unknown>)?.['w:default'] === '1';

  return { properties: result, isDefault, basedOn: basedOn as string | null };
}

export function getNumberingProperties(
  translators: OoxmlTranslators,
  params: OoxmlResolverParams,
  ilvl: number,
  numId: number | string,
  translator: OoxmlTranslator,
  tries = 0,
): Record<string, unknown> {
  const numbering = params?.numbering as OoxmlNumberingContext | null | undefined;
  if (!numbering) return {};
  const { definitions, abstracts } = numbering;
  if (!definitions || !abstracts) return {};

  const propertiesChain: Record<string, unknown>[] = [];

  const numDefinition = definitions[numId as keyof typeof definitions] as Record<string, unknown> | undefined;
  if (!numDefinition) return {};

  const lvlOverride = (numDefinition.elements as Array<Record<string, unknown>> | undefined)?.find(
    (element) => element.name === 'w:lvlOverride' && element.attributes?.['w:ilvl'] == ilvl,
  ) as Record<string, unknown> | undefined;
  const overridePr = lvlOverride?.elements?.find((el: Record<string, unknown>) => el.name === translator.xmlName) as
    | Record<string, unknown>
    | undefined;
  if (overridePr) {
    const overrideProps = translator.encode({ ...params, nodes: [overridePr] }) || {};
    propertiesChain.push(overrideProps);
  }

  const abstractNumId = numDefinition.elements?.find((item: Record<string, unknown>) => item.name === 'w:abstractNumId')
    ?.attributes?.['w:val'] as string | undefined;

  const listDefinitionForThisNumId = abstracts[abstractNumId as keyof typeof abstracts] as
    | Record<string, unknown>
    | undefined;
  if (!listDefinitionForThisNumId) return {};

  const numStyleLink = listDefinitionForThisNumId.elements?.find(
    (item: Record<string, unknown>) => item.name === 'w:numStyleLink',
  ) as Record<string, unknown> | undefined;
  const styleId = numStyleLink?.attributes?.['w:val'] as string | undefined;

  if (styleId && tries < 1) {
    const { properties: styleProps } = getStyleProperties(params, styleId, translators.pPr);
    const numIdFromStyle = (styleProps?.numberingProperties as Record<string, unknown> | undefined)?.numId;
    if (numIdFromStyle) {
      return getNumberingProperties(
        translators,
        params,
        ilvl,
        numIdFromStyle as number | string,
        translator,
        tries + 1,
      );
    }
  }

  const levelDefinition = listDefinitionForThisNumId?.elements?.find(
    (element: Record<string, unknown>) => element.name === 'w:lvl' && element.attributes?.['w:ilvl'] == ilvl,
  ) as Record<string, unknown> | undefined;
  if (!levelDefinition) return {};

  const abstractElementPr = levelDefinition?.elements?.find(
    (el: Record<string, unknown>) => el.name === translator.xmlName,
  ) as Record<string, unknown> | undefined;
  if (!abstractElementPr) return {};
  const abstractProps = translator.encode({ ...params, nodes: [abstractElementPr] }) || {};

  const pStyleElement = levelDefinition?.elements?.find((el: Record<string, unknown>) => el.name === 'w:pStyle') as
    | Record<string, unknown>
    | undefined;
  if (pStyleElement) {
    const pStyleId = pStyleElement?.attributes?.['w:val'] as string | undefined;
    (abstractProps as Record<string, unknown>).styleId = pStyleId;
  }
  propertiesChain.push(abstractProps as Record<string, unknown>);

  propertiesChain.reverse();
  return combineProperties(propertiesChain);
}

export function resolveDocxFontFamily(
  attributes: Record<string, unknown> | null | undefined,
  docx: Record<string, unknown> | null | undefined,
  toCssFontFamily?: (fontName: string, docx?: Record<string, unknown>) => string,
): string | null {
  if (!attributes || typeof attributes !== 'object') return null;

  const ascii = (attributes['w:ascii'] ?? attributes['ascii']) as string | undefined;
  const themeAscii = (attributes['w:asciiTheme'] ?? attributes['asciiTheme']) as string | undefined;

  let resolved = ascii;
  if (docx && themeAscii) {
    const theme = docx['word/theme/theme1.xml'] as Record<string, unknown> | undefined;
    if (theme?.elements?.length) {
      const { elements: topElements } = theme as { elements?: Array<Record<string, unknown>> };
      const { elements } = (topElements?.[0] as { elements?: Array<Record<string, unknown>> }) || {};
      const themeElements = elements?.find((el) => el.name === 'a:themeElements') as
        | Record<string, unknown>
        | undefined;
      const fontScheme = themeElements?.elements?.find((el: Record<string, unknown>) => el.name === 'a:fontScheme') as
        | Record<string, unknown>
        | undefined;
      const prefix = themeAscii.startsWith('minor') ? 'minor' : 'major';
      const font = fontScheme?.elements?.find((el: Record<string, unknown>) => el.name === `a:${prefix}Font`) as
        | Record<string, unknown>
        | undefined;
      const latin = font?.elements?.find((el: Record<string, unknown>) => el.name === 'a:latin') as
        | Record<string, unknown>
        | undefined;
      const typeface = latin?.attributes?.typeface as string | undefined;
      resolved = typeface || resolved;
    }
  }

  if (!resolved) return null;
  if (toCssFontFamily) {
    return toCssFontFamily(resolved, docx ?? undefined);
  }
  return resolved;
}
