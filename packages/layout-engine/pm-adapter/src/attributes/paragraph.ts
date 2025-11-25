/**
 * Paragraph Attributes Computation Module
 *
 * Functions for computing, merging, and normalizing paragraph attributes,
 * including style resolution, boolean attributes, and Word layout integration.
 */

import type { ParagraphAttrs, ParagraphIndent, ParagraphSpacing, TabStop } from '@superdoc/contracts';
import type { PMNode, StyleNode, StyleContext, ListCounterContext, ListRenderingAttrs } from '../types.js';
import { resolveStyle } from '@superdoc/style-engine';
import type {
  WordParagraphLayoutOutput,
  ResolvedParagraphProperties,
  DocDefaults,
  NumberingProperties,
  ResolvedRunProperties,
  ResolvedTabStop,
} from '@superdoc/word-layout';
import { computeWordParagraphLayout } from '@superdoc/word-layout';
import { Engines } from '@superdoc/contracts';
import { pickNumber, twipsToPx, isFiniteNumber } from '../utilities.js';
import {
  normalizeAlignment,
  normalizeParagraphSpacing,
  normalizeParagraphIndent,
  normalizePxIndent,
  spacingPxToPt,
  indentPxToPt,
  spacingPtToPx,
  indentPtToPx,
} from './spacing-indent.js';
import { normalizeOoxmlTabs } from './tabs.js';
import { normalizeParagraphBorders, normalizeParagraphShading } from './borders.js';
import { mirrorIndentForRtl, ensureBidiIndentPx, DEFAULT_BIDI_INDENT_PX } from './bidi.js';
import { hydrateParagraphStyleAttrs } from './paragraph-styles.js';
import type { ParagraphStyleHydration } from './paragraph-styles.js';
import type { ConverterContext } from '../converter-context.js';

const { resolveSpacingIndent } = Engines;

const DEFAULT_DECIMAL_SEPARATOR = '.';

/**
 * Check if a value represents a truthy boolean.
 */
const isTruthy = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'on') {
      return true;
    }
  }
  return false;
};

/**
 * Check if a value represents an explicit false boolean.
 */
const isExplicitFalse = (value: unknown): boolean => {
  if (value === false || value === 0) return true;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    return normalized === 'false' || normalized === '0' || normalized === 'off';
  }
  return false;
};

/**
 * Infer boolean value from OOXML paragraph elements.
 */
const inferBooleanFromParagraphElements = (
  paragraphProps: Record<string, unknown>,
  elementNames: string | string[],
): boolean | undefined => {
  const elements = (paragraphProps as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return undefined;

  const normalizedTargets = new Set(
    (Array.isArray(elementNames) ? elementNames : [elementNames]).flatMap((name) =>
      name.startsWith('w:') ? [name, name.slice(2)] : [name, `w:${name}`],
    ),
  );

  const match = elements.find((el): el is { name: string; attributes?: Record<string, unknown> } => {
    if (!el || typeof el !== 'object') return false;
    const name = (el as { name?: unknown }).name;
    return typeof name === 'string' && normalizedTargets.has(name);
  });

  if (!match) return undefined;

  const rawVal = match.attributes?.['w:val'] ?? match.attributes?.val;

  if (rawVal == null) return true;
  if (isExplicitFalse(rawVal)) return false;
  if (isTruthy(rawVal)) return true;
  return undefined;
};

/**
 * Resolve a boolean attribute from paragraph node, checking both direct attrs and paragraphProperties.
 */
export const resolveParagraphBooleanAttr = (para: PMNode, key: string, elementName: string): boolean | undefined => {
  const attrs = (para.attrs ?? {}) as Record<string, unknown>;
  if (key in attrs) {
    const direct = attrs[key];
    if (isTruthy(direct)) return true;
    if (isExplicitFalse(direct)) return false;
  }
  const paragraphProps = attrs.paragraphProperties as Record<string, unknown> | undefined;
  if (!paragraphProps) return undefined;
  if (key in paragraphProps) {
    const nested = (paragraphProps as Record<string, unknown>)[key];
    if (isTruthy(nested)) return true;
    if (isExplicitFalse(nested)) return false;
  }
  return inferBooleanFromParagraphElements(paragraphProps, elementName);
};

/**
 * Check if paragraph has page break before it.
 */
export const hasPageBreakBefore = (para: PMNode): boolean => {
  const attrs = (para.attrs ?? {}) as Record<string, unknown>;
  if (isTruthy(attrs.pageBreakBefore)) {
    return true;
  }
  const paragraphProps = attrs.paragraphProperties as Record<string, unknown> | undefined;
  if (paragraphProps && isTruthy(paragraphProps.pageBreakBefore)) {
    return true;
  }
  if (paragraphProps) {
    const inferred = inferBooleanFromParagraphElements(paragraphProps, 'w:pageBreakBefore');
    if (typeof inferred === 'boolean') {
      return inferred;
    }
  }
  return false;
};

/**
 * Clone paragraph attributes deeply.
 */
export const cloneParagraphAttrs = (attrs?: ParagraphAttrs): ParagraphAttrs | undefined => {
  if (!attrs) return undefined;
  const clone: ParagraphAttrs = { ...attrs };
  if (attrs.spacing) clone.spacing = { ...attrs.spacing };
  if (attrs.indent) clone.indent = { ...attrs.indent };
  if (attrs.borders) {
    const borderClone: ParagraphAttrs['borders'] = {};
    (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
      const border = attrs.borders?.[side];
      if (border) {
        borderClone[side] = { ...border };
      }
    });
    clone.borders = Object.keys(borderClone).length ? borderClone : undefined;
  }
  if (attrs.shading) clone.shading = { ...attrs.shading };
  if (attrs.tabs) clone.tabs = attrs.tabs.map((tab) => ({ ...tab }));
  return clone;
};

/**
 * Build a style node from paragraph node attributes.
 * Used for style resolution with the style engine.
 */
export const buildStyleNodeFromAttrs = (
  attrs: Record<string, unknown> | undefined,
  spacing?: ParagraphSpacing,
  indent?: ParagraphIndent,
): StyleNode => {
  if (!attrs) return {};

  const paragraphProps: StyleNode['paragraphProps'] = {};

  const alignment = normalizeAlignment(attrs.alignment ?? attrs.textAlign);
  if (alignment) {
    paragraphProps.alignment = alignment;
  }

  if (spacing) {
    paragraphProps.spacing = spacingPxToPt(spacing);
  }

  if (indent) {
    paragraphProps.indent = indentPxToPt(indent);
  }

  const rawTabs = (attrs.tabs ?? attrs.tabStops) as unknown;
  const tabs = normalizeOoxmlTabs(rawTabs);
  if (tabs) {
    paragraphProps.tabs = tabs;
  }

  const styleNode: StyleNode = {};
  if (paragraphProps && Object.keys(paragraphProps).length > 0) {
    styleNode.paragraphProps = paragraphProps;
  }

  return styleNode;
};

/**
 * Normalize list rendering attributes from raw attributes.
 */
export const normalizeListRenderingAttrs = (value: unknown): ListRenderingAttrs | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;

  const markerText = typeof source.markerText === 'string' ? source.markerText : undefined;
  const justification =
    source.justification === 'left' || source.justification === 'right' || source.justification === 'center'
      ? source.justification
      : undefined;
  const numberingType = typeof source.numberingType === 'string' ? source.numberingType : undefined;
  const suffix =
    source.suffix === 'tab' || source.suffix === 'space' || source.suffix === 'nothing' ? source.suffix : undefined;

  const path =
    Array.isArray(source.path) && source.path.length
      ? (source.path
          .map((entry) => (typeof entry === 'number' ? entry : Number(entry)))
          .filter((entry) => Number.isFinite(entry)) as number[])
      : undefined;

  return {
    markerText,
    justification,
    numberingType,
    suffix,
    path: path && path.length ? path : undefined,
  };
};

/**
 * Build numbering path for multi-level lists (e.g., "1.2.3").
 */
export const buildNumberingPath = (
  numId: number | undefined,
  ilvl: number,
  counterValue: number,
  listCounterContext?: ListCounterContext,
): number[] => {
  const targetLevel = Number.isFinite(ilvl) && ilvl > 0 ? Math.floor(ilvl) : 0;
  if (!listCounterContext || typeof numId !== 'number') {
    return Array.from({ length: targetLevel + 1 }, (_, level) => (level === targetLevel ? counterValue : 1));
  }

  const path: number[] = [];
  for (let level = 0; level < targetLevel; level += 1) {
    const parentValue = listCounterContext.getListCounter(numId, level);
    path.push(parentValue > 0 ? parentValue : 1);
  }
  path.push(counterValue);
  return path;
};

/**
 * Convert indent from twips to pixels.
 */
const convertIndentTwipsToPx = (indent?: ParagraphIndent | null): ParagraphIndent | undefined => {
  if (!indent) return undefined;
  const result: ParagraphIndent = {};
  if (isFiniteNumber(indent.left)) result.left = twipsToPx(Number(indent.left));
  if (isFiniteNumber(indent.right)) result.right = twipsToPx(Number(indent.right));
  if (isFiniteNumber(indent.firstLine)) result.firstLine = twipsToPx(Number(indent.firstLine));
  if (isFiniteNumber(indent.hanging)) result.hanging = twipsToPx(Number(indent.hanging));
  return Object.keys(result).length > 0 ? result : undefined;
};

type AdapterNumberingProps = (NumberingProperties & {
  path?: number[];
  counterValue?: number;
  resolvedLevelIndent?: ParagraphIndent;
  resolvedMarkerRpr?: ResolvedRunProperties;
}) &
  Record<string, unknown>;

const toAdapterNumberingProps = (value: unknown): AdapterNumberingProps | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const rawNumId = candidate.numId;
  if (typeof rawNumId !== 'number' && typeof rawNumId !== 'string') {
    return undefined;
  }
  const rawIlvl = candidate.ilvl;
  const normalizedIlvl = Number.isFinite(rawIlvl) ? Math.floor(Number(rawIlvl)) : 0;
  return {
    ...(candidate as Record<string, unknown>),
    numId: rawNumId,
    ilvl: normalizedIlvl,
  } as AdapterNumberingProps;
};

const toResolvedTabStops = (tabs?: TabStop[] | null): ResolvedTabStop[] | undefined => {
  if (!Array.isArray(tabs) || tabs.length === 0) return undefined;
  const resolved: ResolvedTabStop[] = [];

  for (const stop of tabs) {
    if (!stop || typeof stop.pos !== 'number') continue;
    const alignment = normalizeResolvedTabAlignment(stop.val);
    if (!alignment) continue;
    const position = twipsToPx(stop.pos);
    if (!Number.isFinite(position)) continue;

    const resolvedStop: ResolvedTabStop = {
      position,
      alignment,
    };
    if (stop.leader && stop.leader !== 'none') {
      resolvedStop.leader = stop.leader as ResolvedTabStop['leader'];
    }
    resolved.push(resolvedStop);
  }

  return resolved.length > 0 ? resolved : undefined;
};

const normalizeResolvedTabAlignment = (value: TabStop['val']): ResolvedTabStop['alignment'] | undefined => {
  switch (value) {
    case 'start':
    case 'center':
    case 'end':
    case 'decimal':
    case 'bar':
      return value;
    default:
      return undefined;
  }
};

/**
 * Compute Word paragraph layout for numbered paragraphs.
 * Integrates with @superdoc/word-layout for accurate numbering layout.
 */
export const computeWordLayoutForParagraph = (
  paragraphAttrs: ParagraphAttrs,
  numberingProps: AdapterNumberingProps | undefined,
  styleContext: StyleContext,
): WordParagraphLayoutOutput | null => {
  try {
    // Merge paragraph indent with level-specific indent from numbering definition
    let effectiveIndent = paragraphAttrs.indent;
    if (numberingProps?.resolvedLevelIndent) {
      const resolvedIndentPx = convertIndentTwipsToPx(numberingProps.resolvedLevelIndent as ParagraphIndent);
      // Level indent from numbering definition takes precedence
      effectiveIndent = {
        ...paragraphAttrs.indent,
        ...(resolvedIndentPx ?? (numberingProps.resolvedLevelIndent as ParagraphIndent)),
      };
    }

    const resolvedTabs = toResolvedTabStops(paragraphAttrs.tabs);

    // Build resolved paragraph properties
    const resolvedParagraph: ResolvedParagraphProperties = {
      indent: effectiveIndent,
      spacing: paragraphAttrs.spacing,
      tabs: resolvedTabs,
      tabIntervalTwips: paragraphAttrs.tabIntervalTwips,
      alignment: paragraphAttrs.alignment as 'left' | 'center' | 'right' | 'justify' | undefined,
      decimalSeparator: paragraphAttrs.decimalSeparator,
      numberingProperties: numberingProps,
    };

    // Build doc defaults
    const docDefaults: DocDefaults = {
      defaultTabIntervalTwips: styleContext.defaults?.defaultTabIntervalTwips ?? 720,
      decimalSeparator: styleContext.defaults?.decimalSeparator ?? '.',
      run: {
        fontFamily: 'Times New Roman',
        fontSize: 12,
      },
      paragraph: {
        indent: {},
        spacing: {},
      },
    };

    // Compute Word paragraph layout
    return computeWordParagraphLayout({
      paragraph: resolvedParagraph,
      numbering: numberingProps,
      markerRun: numberingProps.resolvedMarkerRpr, // Use cached if available
      docDefaults,
    });
  } catch {
    // Graceful fallback if wordLayout computation fails
    return null;
  }
};

/**
 * Compute paragraph attributes from PM node, resolving styles and handling BiDi text.
 * This is the main function for converting PM paragraph attributes to layout engine format.
 */
export const computeParagraphAttrs = (
  para: PMNode,
  styleContext: StyleContext,
  listCounterContext?: ListCounterContext,
  converterContext?: ConverterContext,
  hydrationOverride?: ParagraphStyleHydration | null,
): ParagraphAttrs | undefined => {
  const attrs = para.attrs ?? {};
  const paragraphProps =
    typeof attrs.paragraphProperties === 'object' && attrs.paragraphProperties !== null
      ? (attrs.paragraphProperties as Record<string, unknown>)
      : {};
  const hydrated = hydrationOverride ?? hydrateParagraphStyleAttrs(para, converterContext);
  // Prefer explicit spacing from attrs even if it's null/empty - don't fall back to hydrated
  const spacingSource =
    attrs.spacing !== undefined
      ? attrs.spacing
      : paragraphProps.spacing !== undefined
        ? paragraphProps.spacing
        : hydrated?.spacing;
  const normalizedSpacing = normalizeParagraphSpacing(spacingSource);
  const indentSource = attrs.indent ?? paragraphProps.indent ?? hydrated?.indent;
  const normalizedIndent =
    normalizePxIndent(indentSource) ?? normalizeParagraphIndent(indentSource ?? attrs.textIndent);
  const styleNodeAttrs =
    hydrated?.tabStops && !attrs.tabStops && !attrs.tabs
      ? { ...attrs, tabStops: hydrated.tabStops }
      : !attrs.tabStops && paragraphProps.tabStops
        ? { ...attrs, tabStops: paragraphProps.tabStops }
        : attrs;
  const styleNode = buildStyleNodeFromAttrs(styleNodeAttrs, normalizedSpacing, normalizedIndent);
  if (styleNodeAttrs.styleId == null && paragraphProps.styleId) {
    styleNode.styleId = paragraphProps.styleId as string;
  }
  const computed = resolveStyle(styleNode, styleContext);
  const { spacing, indent } = resolveSpacingIndent(computed.paragraph, computed.numbering);

  const paragraphAttrs: ParagraphAttrs = {};
  const bidi = resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi') === true;
  const adjustRightInd = resolveParagraphBooleanAttr(para, 'adjustRightInd', 'w:adjustRightInd') === true;

  if (bidi) {
    paragraphAttrs.direction = 'rtl';
    paragraphAttrs.rtl = true;
  }

  const explicitAlignment = normalizeAlignment(attrs.alignment ?? attrs.textAlign);
  const styleAlignment = hydrated?.alignment ? normalizeAlignment(hydrated.alignment) : undefined;
  if (bidi && adjustRightInd) {
    paragraphAttrs.alignment = 'right';
  } else if (explicitAlignment) {
    paragraphAttrs.alignment = explicitAlignment;
  } else if (bidi) {
    // RTL paragraphs without explicit alignment default to right
    paragraphAttrs.alignment = 'right';
  } else if (styleAlignment) {
    paragraphAttrs.alignment = styleAlignment;
  } else if (computed.paragraph.alignment) {
    paragraphAttrs.alignment = computed.paragraph.alignment;
  }

  const spacingPx = spacingPtToPx(spacing, normalizedSpacing);
  if (spacingPx) paragraphAttrs.spacing = spacingPx;
  if (normalizedSpacing?.beforeAutospacing != null || normalizedSpacing?.afterAutospacing != null) {
    paragraphAttrs.spacing = paragraphAttrs.spacing ?? {};
    if (normalizedSpacing?.beforeAutospacing != null) {
      (paragraphAttrs.spacing as Record<string, unknown>).beforeAutospacing = normalizedSpacing.beforeAutospacing;
    }
    if (normalizedSpacing?.afterAutospacing != null) {
      (paragraphAttrs.spacing as Record<string, unknown>).afterAutospacing = normalizedSpacing.afterAutospacing;
    }
  }
  if (normalizedSpacing?.contextualSpacing != null) {
    paragraphAttrs.contextualSpacing = normalizedSpacing.contextualSpacing;
  }

  const hasExplicitIndent = Boolean(normalizedIndent);
  const hasNumberingIndent = Boolean(computed.numbering?.indent?.left || computed.numbering?.indent?.hanging);
  if (hasExplicitIndent || hasNumberingIndent || (bidi && adjustRightInd)) {
    const indentPx = indentPtToPx(indent);

    if (indentPx) {
      const adjustedIndent = bidi && adjustRightInd ? ensureBidiIndentPx({ ...indentPx }) : indentPx;
      const finalIndent = bidi && adjustRightInd ? mirrorIndentForRtl({ ...adjustedIndent }) : adjustedIndent;
      paragraphAttrs.indent = finalIndent;
    } else if (bidi && adjustRightInd) {
      const syntheticIndent: ParagraphIndent = { left: DEFAULT_BIDI_INDENT_PX, right: DEFAULT_BIDI_INDENT_PX };
      const finalIndent = mirrorIndentForRtl({ ...syntheticIndent });
      paragraphAttrs.indent = finalIndent;
    }
  }

  const borders = normalizeParagraphBorders(attrs.borders ?? hydrated?.borders);
  if (borders) paragraphAttrs.borders = borders;

  const shading = normalizeParagraphShading(attrs.shading ?? hydrated?.shading);
  if (shading) paragraphAttrs.shading = shading;

  const keepNext = paragraphProps.keepNext ?? hydrated?.keepNext ?? attrs.keepNext;
  if (keepNext === true) paragraphAttrs.keepNext = true;
  const keepLines = paragraphProps.keepLines ?? hydrated?.keepLines ?? attrs.keepLines;
  if (keepLines === true) paragraphAttrs.keepLines = true;

  const paragraphDecimalSeparator = styleContext.defaults?.decimalSeparator ?? DEFAULT_DECIMAL_SEPARATOR;
  if (paragraphDecimalSeparator !== DEFAULT_DECIMAL_SEPARATOR) {
    paragraphAttrs.decimalSeparator = paragraphDecimalSeparator;
  }
  const styleIdAttr = typeof attrs.styleId === 'string' ? attrs.styleId : undefined;
  if (styleIdAttr) {
    paragraphAttrs.styleId = styleIdAttr;
  } else if (paragraphProps.styleId) {
    paragraphAttrs.styleId = paragraphProps.styleId as string;
  }

  // Per‑paragraph tab interval override (px or twips)
  const paraIntervalTwips =
    pickNumber(attrs.tabIntervalTwips) ??
    ((): number | undefined => {
      const px = pickNumber(attrs.tabIntervalPx);
      return px != null ? Math.round(px * 15) : undefined;
    })();
  const defaultIntervalTwips = styleContext.defaults?.defaultTabIntervalTwips;
  if (paraIntervalTwips != null) {
    paragraphAttrs.tabIntervalTwips = paraIntervalTwips;
  } else if (defaultIntervalTwips != null) {
    paragraphAttrs.tabIntervalTwips = defaultIntervalTwips;
  }

  if (computed.paragraph.tabs && computed.paragraph.tabs.length > 0) {
    paragraphAttrs.tabs = computed.paragraph.tabs.map((tab) => ({ ...tab }));
  } else if (hydrated?.tabStops) {
    const normalizedTabs = normalizeOoxmlTabs(hydrated.tabStops as unknown);
    if (normalizedTabs) {
      paragraphAttrs.tabs = normalizedTabs;
    }
  }

  // Extract floating alignment from framePr (OOXML w:framePr/@w:xAlign)
  // Used for positioned paragraphs like right-aligned page numbers in headers/footers
  // Note: framePr may be at top level (from converter) or nested in paragraphProperties (from PM serialization)
  let framePr = attrs.framePr as { xAlign?: string } | undefined;

  // If not at top level, try to extract from paragraphProperties
  if (!framePr && attrs.paragraphProperties && typeof attrs.paragraphProperties === 'object') {
    const pPr = attrs.paragraphProperties as Record<string, unknown>;
    if (pPr.elements && Array.isArray(pPr.elements)) {
      const framePrElement = pPr.elements.find((el: Record<string, unknown>) => el.name === 'w:framePr');
      if (framePrElement?.attributes) {
        framePr = {
          xAlign: framePrElement.attributes['w:xAlign'],
        };
      }
    }
  }

  if (framePr?.xAlign) {
    const xAlign = framePr.xAlign.toLowerCase();
    if (xAlign === 'left' || xAlign === 'right' || xAlign === 'center') {
      paragraphAttrs.floatAlignment = xAlign;
    }
  }

  // Track B: Compute wordLayout for paragraphs with numberingProperties
  const numberingSource =
    attrs.numberingProperties ?? paragraphProps.numberingProperties ?? hydrated?.numberingProperties;
  const rawNumberingProps = toAdapterNumberingProps(numberingSource);
  if (rawNumberingProps) {
    const numberingProps = rawNumberingProps;
    const numId = numberingProps.numId;
    const ilvl = Number.isFinite(numberingProps.ilvl) ? Math.max(0, Math.floor(Number(numberingProps.ilvl))) : 0;
    const listRendering = normalizeListRenderingAttrs(attrs.listRendering);
    const numericNumId = typeof numId === 'number' ? numId : undefined;

    // Track B: Increment list counter and build path array
    let counterValue = 1;
    if (listCounterContext && typeof numericNumId === 'number') {
      counterValue = listCounterContext.incrementListCounter(numericNumId, ilvl);

      // Reset deeper levels when returning to a shallower level
      // (e.g., going from level 1 back to level 0 should reset level 1's counter)
      for (let deeperLevel = ilvl + 1; deeperLevel <= 8; deeperLevel++) {
        listCounterContext.resetListCounter(numericNumId, deeperLevel);
      }
    }

    // Build path array for multi-level numbering (e.g., "1.2.3")
    const path =
      (listRendering?.path && listRendering.path.length ? listRendering.path : undefined) ??
      buildNumberingPath(numericNumId, ilvl, counterValue, listCounterContext);
    const resolvedCounterValue = path[path.length - 1] ?? counterValue;

    // Enrich numberingProperties with path and counter info
    const enrichedNumberingProps: AdapterNumberingProps = {
      ...numberingProps,
      path,
      counterValue: resolvedCounterValue,
    };

    if (listRendering?.numberingType && enrichedNumberingProps.format == null) {
      enrichedNumberingProps.format = listRendering.numberingType;
    }
    if (listRendering?.markerText && enrichedNumberingProps.markerText == null) {
      enrichedNumberingProps.markerText = listRendering.markerText;
    }
    if (listRendering?.justification && enrichedNumberingProps.lvlJc == null) {
      enrichedNumberingProps.lvlJc = listRendering.justification;
    }
    if (listRendering?.suffix && enrichedNumberingProps.suffix == null) {
      enrichedNumberingProps.suffix = listRendering.suffix;
    }

    const wordLayout = computeWordLayoutForParagraph(paragraphAttrs, enrichedNumberingProps, styleContext);
    if (wordLayout) {
      if (wordLayout.marker) {
        if (listRendering?.markerText) {
          wordLayout.marker.markerText = listRendering.markerText;
        }
        if (listRendering?.justification) {
          wordLayout.marker.justification = listRendering.justification;
        }
        if (listRendering?.suffix) {
          wordLayout.marker.suffix = listRendering.suffix;
        }
      }
      paragraphAttrs.wordLayout = wordLayout;

      // Track B: Update paragraphAttrs.indent with the effective indent from resolvedLevelIndent
      // This ensures the renderer uses the correct level-specific indent for padding
      if (enrichedNumberingProps.resolvedLevelIndent) {
        const resolvedIndentPx = convertIndentTwipsToPx(enrichedNumberingProps.resolvedLevelIndent);
        paragraphAttrs.indent = {
          ...paragraphAttrs.indent,
          ...(resolvedIndentPx ?? enrichedNumberingProps.resolvedLevelIndent),
        };
      }
    }
    // Preserve numberingProperties for downstream consumers (e.g., measurement stage)
    paragraphAttrs.numberingProperties = enrichedNumberingProps as Record<string, unknown>;
  }

  return Object.keys(paragraphAttrs).length > 0 ? paragraphAttrs : undefined;
};

/**
 * Merge two paragraph attributes, with override taking precedence.
 */
export const mergeParagraphAttrs = (base?: ParagraphAttrs, override?: ParagraphAttrs): ParagraphAttrs | undefined => {
  if (!base && !override) return undefined;
  if (!base) return override;
  if (!override) return base;

  const merged: ParagraphAttrs = { ...base };
  if (override.alignment) {
    merged.alignment = override.alignment;
  }
  if (override.spacing) {
    merged.spacing = { ...(base.spacing ?? {}), ...override.spacing };
  }
  if (override.indent) {
    merged.indent = { ...(base.indent ?? {}), ...override.indent };
  }
  if (override.borders) {
    merged.borders = { ...(base.borders ?? {}), ...override.borders };
  }
  if (override.shading) {
    merged.shading = { ...(base.shading ?? {}), ...override.shading };
  }
  return merged;
};

/**
 * Convert list paragraph attributes to paragraph attrs format.
 */
export const convertListParagraphAttrs = (attrs?: Record<string, unknown>): ParagraphAttrs | undefined => {
  if (!attrs) return undefined;
  const paragraphAttrs: ParagraphAttrs = {};

  const alignment = normalizeAlignment(attrs.alignment ?? attrs.lvlJc);
  if (alignment) paragraphAttrs.alignment = alignment;

  const spacing = normalizeParagraphSpacing(attrs.spacing);
  if (spacing) paragraphAttrs.spacing = spacing;

  const shading = normalizeParagraphShading(attrs.shading);
  if (shading) paragraphAttrs.shading = shading;

  return Object.keys(paragraphAttrs).length > 0 ? paragraphAttrs : undefined;
};
