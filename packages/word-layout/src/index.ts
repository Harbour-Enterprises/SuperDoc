/**
 * Canonical Word layout contracts shared between SuperDoc packages.
 *
 * Track A focuses on defining data interfaces and pure helpers.
 */

import type {
  DocDefaults,
  ParagraphIndent,
  ResolveMarkerRunPropsInput,
  ResolvedNumberingProperties,
  ResolvedRunProperties,
  WordParagraphLayoutInput,
  WordParagraphLayoutOutput,
  WordListMarkerLayout,
  WordListSuffix,
} from './types.js';
import { buildFontCss, DEFAULT_LIST_HANGING_PX, formatMarkerText, LIST_MARKER_GAP } from './marker-utils.js';
import { twipsToPixels } from './unit-conversions.js';

export * from './types.js';

export { createNumberingManager } from './numbering-manager.js';
export type { NumberingManager } from './numbering-manager.js';

export {
  TWIPS_PER_PIXEL,
  PIXELS_PER_TWIP,
  TWIPS_PER_POINT,
  POINTS_PER_TWIP,
  pixelsToTwips,
  twipsToPixels,
  pointsToTwips,
  twipsToPoints,
  halfPointsToPoints,
  pointsToHalfPoints,
} from './unit-conversions.js';

export { buildFontCss, LIST_MARKER_GAP, DEFAULT_LIST_HANGING_PX } from './marker-utils.js';
export type { NumberingFormat } from './marker-utils.js';

/**
 * Computes the complete layout properties for a Word paragraph, including indentation,
 * tabs, and optional list marker positioning.
 *
 * This is the main entry point for Word paragraph layout calculation. It processes
 * paragraph properties, document defaults, and optional numbering to produce a complete
 * layout specification that can be used for rendering.
 *
 * @param input - The paragraph layout input containing paragraph properties, document defaults,
 *   optional numbering information, and an optional measurement adapter for calculating text widths.
 *
 * @returns A complete layout specification including:
 *   - `indentLeftPx`: Left indent in pixels
 *   - `hangingPx`: Hanging indent in pixels (clamped to >= 0)
 *   - `firstLinePx`: First line indent in pixels (if specified)
 *   - `tabsPx`: Array of tab stop positions in pixels
 *   - `textStartPx`: Horizontal position where paragraph text begins
 *   - `marker`: Optional list marker layout (position, text, styling)
 *   - `resolvedIndent`: Merged indent configuration
 *   - `resolvedTabs`: Resolved tab stops
 *   - `defaultTabIntervalPx`: Default tab interval in pixels
 *   - `firstLineIndentMode`: Boolean flag indicating firstLine indent pattern detection.
 *     When true, this indicates the paragraph uses OOXML's alternative list indent pattern
 *     where the marker is positioned at `left + firstLine` instead of the standard
 *     `left - hanging` pattern. This flag is set when `firstLine > 0` and `hanging` is
 *     not defined. It affects marker positioning and tab spacing calculations in the renderer.
 *
 * @example
 * ```typescript
 * // Standard hanging indent pattern
 * const layout1 = computeWordParagraphLayout({
 *   paragraph: {
 *     indent: { left: 720, hanging: 720 },
 *     tabs: [],
 *     numberingProperties: { numId: '1', ilvl: 0, format: 'decimal', lvlText: '%1.', path: [1] }
 *   },
 *   docDefaults: { run: { fontFamily: 'Calibri', fontSize: 12 } }
 * });
 * // layout1.firstLineIndentMode is undefined (standard pattern)
 * // Marker positioned at: left (720) - hanging (720) = 0
 *
 * // FirstLine indent pattern (alternative OOXML style)
 * const layout2 = computeWordParagraphLayout({
 *   paragraph: {
 *     indent: { left: 0, firstLine: 720 },
 *     tabs: [],
 *     numberingProperties: { numId: '1', ilvl: 0, format: 'decimal', lvlText: '%1.', path: [1] }
 *   },
 *   docDefaults: { run: { fontFamily: 'Calibri', fontSize: 12 } }
 * });
 * // layout2.firstLineIndentMode is true
 * // Marker positioned at: left (0) + firstLine (720) = 720
 * ```
 */
export function computeWordParagraphLayout(input: WordParagraphLayoutInput): WordParagraphLayoutOutput {
  const { paragraph, docDefaults, measurement } = input;
  const numbering = (input.numbering ?? paragraph.numberingProperties) || null;
  const indent = mergeIndent(docDefaults, paragraph.indent);
  const tabs = Array.isArray(paragraph.tabs) ? paragraph.tabs : [];

  const indentLeftPx = indent.left ?? 0;
  const hangingPxRaw = indent.hanging ?? (indent.firstLine != null && indent.firstLine < 0 ? -indent.firstLine : 0);
  const firstLinePx = indent.firstLine;
  const defaultTabIntervalPx = resolveDefaultTabIntervalPx(paragraph.tabIntervalTwips, docDefaults);
  const tabsPx = tabs.map((tab) => tab.position);

  // Detect "firstLine indent" pattern: OOXML allows lists to use firstLine instead of hanging.
  // Standard: left=720, hanging=720 (marker hangs back to position 0)
  // Alternative: left=0, firstLine=720 (marker at position 720, text follows)
  // Per OOXML spec, firstLine and hanging are mutually exclusive.
  // Validate that firstLine is a finite number to handle NaN, Infinity, and -Infinity gracefully.
  const hasFirstLineIndent =
    indent.firstLine != null && Number.isFinite(indent.firstLine) && indent.firstLine > 0 && !indent.hanging;

  const layout: WordParagraphLayoutOutput = {
    indentLeftPx,
    hangingPx: Math.max(hangingPxRaw, 0),
    firstLinePx,
    tabsPx,
    textStartPx: indentLeftPx,
    marker: undefined,
    resolvedIndent: indent,
    resolvedTabs: tabs,
    defaultTabIntervalPx,
  };

  if (!numbering) {
    return layout;
  }

  const markerRun =
    input.markerRun ??
    resolveMarkerRunProperties({
      inlineMarkerRpr: paragraph.numberingProperties?.resolvedMarkerRpr,
      resolvedParagraphProps: paragraph,
      numbering,
      docDefaults,
      cached: numbering.resolvedMarkerRpr,
    });

  const markerText = numbering.markerText ?? formatMarkerText(numbering);
  const glyphWidthPx =
    measurement?.measureText && markerText
      ? measurement.measureText(markerText, buildFontCss(markerRun), { letterSpacing: markerRun.letterSpacing })
      : undefined;

  let markerBoxWidthPx: number;
  let markerX: number;

  if (hasFirstLineIndent) {
    // FirstLine pattern: marker at (left + firstLine), text follows inline
    markerBoxWidthPx =
      glyphWidthPx != null && glyphWidthPx > 0 ? glyphWidthPx + LIST_MARKER_GAP : DEFAULT_LIST_HANGING_PX;
    markerX = indentLeftPx + (firstLinePx ?? 0);
    layout.textStartPx = markerX + markerBoxWidthPx;
    layout.hangingPx = 0;
    layout.firstLineIndentMode = true;
  } else {
    // Standard hanging pattern: marker hangs back from left indent
    markerBoxWidthPx = resolveMarkerBoxWidth(hangingPxRaw, glyphWidthPx);
    markerX = indentLeftPx - markerBoxWidthPx;
    layout.hangingPx = markerBoxWidthPx;
  }

  layout.marker = buildMarkerLayout({
    numbering,
    markerText,
    markerRun,
    glyphWidthPx,
    textStartPx: layout.textStartPx,
    markerBoxWidthPx,
    markerX,
  });

  return layout;
}

/**
 * Resolves the final run properties for a list marker by merging defaults, document defaults,
 * numbering level properties, and inline overrides.
 *
 * This function implements a layered property resolution system where each layer can override
 * properties from the previous layer. The resolution order is:
 * 1. Base defaults (Times New Roman, 12pt, black)
 * 2. Document defaults
 * 3. Numbering level resolved properties
 * 4. Inline marker properties
 *
 * @param input - The marker run properties input containing various property layers
 * @param input.inlineMarkerRpr - Inline marker run properties that take highest precedence
 * @param input.resolvedParagraphProps - The resolved paragraph properties
 * @param input.numbering - The numbering properties that may contain marker styling
 * @param input.docDefaults - Document-wide default run properties
 * @param input.cached - Cached resolved properties to avoid recalculation
 *
 * @returns The fully resolved run properties for the marker, including font, size, color, and styling
 *
 * @example
 * ```typescript
 * const markerProps = resolveMarkerRunProperties({
 *   inlineMarkerRpr: { fontFamily: 'Roboto', bold: true },
 *   resolvedParagraphProps: { indent: {} },
 *   numbering: null,
 *   docDefaults: { run: { fontSize: 14, color: '#333333' } }
 * });
 *
 * console.log(markerProps.fontFamily); // "Roboto"
 * console.log(markerProps.fontSize); // 14
 * console.log(markerProps.bold); // true
 * ```
 */
export function resolveMarkerRunProperties(input: ResolveMarkerRunPropsInput): ResolvedRunProperties {
  if (input.cached) {
    return input.cached;
  }

  const numberingResolved =
    input.numbering?.resolvedMarkerRpr || input.resolvedParagraphProps.numberingProperties?.resolvedMarkerRpr;

  const result = mergeRunProperties(
    DEFAULT_MARKER_RUN,
    input.docDefaults.run,
    numberingResolved,
    input.inlineMarkerRpr,
  );

  return result;
}

const DEFAULT_MARKER_RUN: ResolvedRunProperties = {
  fontFamily: 'Times New Roman',
  fontSize: 12,
  color: '#000000',
};

const mergeRunProperties = (
  ...layers: Array<Partial<ResolvedRunProperties> | null | undefined>
): ResolvedRunProperties => {
  const result: ResolvedRunProperties = { ...DEFAULT_MARKER_RUN };

  const applyLayer = (layer?: Partial<ResolvedRunProperties> | null) => {
    if (!layer) return;
    for (const [key, value] of Object.entries(layer)) {
      if (value == null) continue;

      // Validate key is a valid property
      if (!isValidRunPropertyKey(key)) continue;

      const typedKey = key as keyof ResolvedRunProperties;
      if (typeof value === 'object' && !Array.isArray(value)) {
        const current = result[typedKey];
        const next =
          typeof current === 'object' && current != null
            ? { ...(current as Record<string, unknown>), ...(value as Record<string, unknown>) }
            : { ...(value as Record<string, unknown>) };
        (result as Record<string, unknown>)[typedKey as string] = next;
      } else {
        (result as Record<string, unknown>)[typedKey as string] = value;
      }
    }
  };

  const isValidRunPropertyKey = (key: string): key is keyof ResolvedRunProperties => {
    const validKeys: Array<keyof ResolvedRunProperties> = [
      'fontFamily',
      'fontSize',
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'highlight',
      'smallCaps',
      'allCaps',
      'baselineShift',
      'letterSpacing',
      'scale',
      'lang',
    ];
    return validKeys.includes(key as keyof ResolvedRunProperties);
  };

  for (const layer of layers) {
    applyLayer(layer);
  }

  return result;
};

const mergeIndent = (docDefaults: DocDefaults, paragraphIndent?: ParagraphIndent | null): ParagraphIndent => {
  const base = docDefaults.paragraph?.indent ?? {};
  return {
    ...base,
    ...(paragraphIndent ?? {}),
  };
};

const resolveDefaultTabIntervalPx = (
  paragraphIntervalTwips: number | undefined,
  docDefaults: DocDefaults,
): number | undefined => {
  if (Number.isFinite(paragraphIntervalTwips)) {
    return twipsToPixels(paragraphIntervalTwips);
  }
  if (Number.isFinite(docDefaults.defaultTabIntervalTwips)) {
    return twipsToPixels(docDefaults.defaultTabIntervalTwips);
  }
  return undefined;
};

const resolveMarkerBoxWidth = (hangingPxRaw: number, glyphWidthPx?: number): number => {
  let markerBox = Math.max(hangingPxRaw || 0, 0);
  if (markerBox <= 0) {
    if (glyphWidthPx != null && glyphWidthPx > 0) {
      markerBox = glyphWidthPx + LIST_MARKER_GAP;
    } else {
      markerBox = DEFAULT_LIST_HANGING_PX;
    }
  } else if (glyphWidthPx != null && glyphWidthPx + LIST_MARKER_GAP > markerBox) {
    markerBox = glyphWidthPx + LIST_MARKER_GAP;
  }
  return markerBox;
};

const buildMarkerLayout = ({
  numbering,
  markerText,
  markerRun,
  glyphWidthPx,
  textStartPx,
  markerBoxWidthPx,
  markerX,
}: {
  numbering: ResolvedNumberingProperties;
  markerText: string;
  markerRun: ResolvedRunProperties;
  glyphWidthPx?: number;
  textStartPx: number;
  markerBoxWidthPx: number;
  markerX: number;
}): WordListMarkerLayout => ({
  markerText,
  glyphWidthPx,
  markerBoxWidthPx,
  markerX,
  textStartX: textStartPx,
  baselineOffsetPx: markerRun.baselineShift ?? 0,
  // Gutter is the small gap between marker and text, not the full marker box width
  gutterWidthPx: LIST_MARKER_GAP,
  justification: numbering.lvlJc ?? 'left',
  suffix: normalizeSuffix(numbering.suffix) ?? 'tab',
  run: markerRun,
  path: numbering.path,
});

const normalizeSuffix = (suffix?: string | null): WordListSuffix => {
  if (suffix === 'tab' || suffix === 'space' || suffix === 'nothing') {
    return suffix;
  }
  return undefined;
};
