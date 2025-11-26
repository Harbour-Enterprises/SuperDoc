/**
 * DOM-based text measurer for layout engine
 *
 * Uses HTML5 Canvas API to measure text runs and calculate line breaks.
 *
 * Responsibilities:
 * - Measure text width using actual font rendering
 * - Perform greedy line breaking based on maxWidth constraint
 * - Calculate typography metrics (ascent, descent, lineHeight)
 * - Return Measure with positioned line boundaries
 *
 * Typography Approximations (v0.1.0):
 * - ascent ≈ fontSize * 0.8 (baseline to top)
 * - descent ≈ fontSize * 0.2 (baseline to bottom)
 * - lineHeight = fontSize * 1.2 (standard leading)
 *
 * These are documented heuristics; we can swap in precise font metrics later
 * if needed via libraries like opentype.js.
 *
 * Line Breaking Strategy:
 * - Greedy algorithm: accumulate words until exceeding maxWidth
 * - Breaks on word boundaries (spaces)
 * - Single words wider than maxWidth are kept on their own line
 *
 * Future improvements:
 * - Hyphenation support
 * - Justification and word spacing
 * - Precise font metrics from font files
 * - Kerning and ligature support
 */

import type {
  FlowBlock,
  ParagraphBlock,
  ParagraphSpacing,
  ParagraphIndent,
  ImageBlock,
  ListBlock,
  Measure,
  Line,
  ParagraphMeasure,
  ImageMeasure,
  TableBlock,
  TableMeasure,
  TableRowMeasure,
  TableCellMeasure,
  ListMeasure,
  Run,
  TextRun,
  TabRun,
  TabStop,
  DrawingBlock,
  DrawingMeasure,
  DrawingGeometry,
} from '@superdoc/contracts';
import type { WordParagraphLayoutOutput } from '@superdoc/word-layout';
import { Engines } from '@superdoc/contracts';
import {
  LIST_MARKER_GAP,
  MIN_MARKER_GUTTER,
  DEFAULT_LIST_INDENT_BASE_PX as DEFAULT_LIST_INDENT_BASE,
  DEFAULT_LIST_INDENT_STEP_PX as DEFAULT_LIST_INDENT_STEP,
  DEFAULT_LIST_HANGING_PX as DEFAULT_LIST_HANGING,
} from '@superdoc/common/layout-constants';
import { calculateRotatedBounds, normalizeRotation } from '@superdoc/geometry-utils';
export { installNodeCanvasPolyfill } from './setup.js';
import { clearMeasurementCache, getMeasuredTextWidth, setCacheSize } from './measurementCache.js';

const { computeTabStops } = Engines;

type MeasurementMode = 'browser' | 'deterministic';

type MeasurementConfig = {
  mode: MeasurementMode;
  fonts: {
    deterministicFamily: string;
    fallbackStack: string[];
  };
  cacheSize: number;
};

const measurementConfig: MeasurementConfig = {
  mode: 'browser',
  fonts: {
    deterministicFamily: 'Noto Sans',
    fallbackStack: ['Noto Sans', 'Arial', 'sans-serif'],
  },
  cacheSize: 5000,
};

export function configureMeasurement(options: Partial<MeasurementConfig>): void {
  if (options.mode) {
    measurementConfig.mode = options.mode;
  }
  if (options.fonts) {
    measurementConfig.fonts = {
      ...measurementConfig.fonts,
      ...options.fonts,
    };
  }
  if (typeof options.cacheSize === 'number' && Number.isFinite(options.cacheSize) && options.cacheSize > 0) {
    measurementConfig.cacheSize = options.cacheSize;
    setCacheSize(options.cacheSize);
  }
}

export { clearMeasurementCache };

/**
 * Future: Font-specific calibration factors could be added here if Canvas measurements
 * consistently diverge from MS Word after all precision fixes (bounding box, fractional pt→px, etc.)
 * are applied. Currently not needed.
 */

/**
 * Global canvas context cache for text measurement
 * Reused across calls to avoid repeated canvas creation
 */
let canvasContext: CanvasRenderingContext2D | null = null;

type MeasureConstraints = {
  maxWidth: number;
  maxHeight?: number;
};

// List constants centralized in @superdoc/common/layout-constants

// Tab constants (OOXML alignment: twips → pixels)
const DEFAULT_TAB_INTERVAL_TWIPS = 720; // 0.5 inch in twips
const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96; // Standard CSS/DOM DPI
const TWIPS_PER_PX = TWIPS_PER_INCH / PX_PER_INCH; // 15 twips per pixel
const _PX_PER_PT = 96 / 72; // Reserved for future pt↔px conversions
const twipsToPx = (twips: number): number => twips / TWIPS_PER_PX;
const pxToTwips = (px: number): number => Math.round(px * TWIPS_PER_PX);

const DEFAULT_TAB_INTERVAL_PX = twipsToPx(DEFAULT_TAB_INTERVAL_TWIPS);
const TAB_EPSILON = 0.1;
const DEFAULT_DECIMAL_SEPARATOR = '.';
const ALLOWED_TAB_VALS = new Set<TabStop['val']>(['start', 'center', 'end', 'decimal', 'bar', 'clear']);

/**
 * Tab stop in pixel coordinates for measurement.
 * Converted from OOXML twips at measurement boundary.
 */
type TabStopPx = {
  pos: number; // px
  val: TabStop['val'];
  leader?: TabStop['leader'];
};

// Unused type - may be needed for future decimal tab implementation
// type _PendingDecimalStop = {
//   target: number;
//   consumed: number;
// };

const roundValue = (value: number): number =>
  measurementConfig.mode === 'deterministic' ? Math.round(value * 10) / 10 : value;

// Utility functions for future unit conversion needs
// function _ptToPx(pt: number): number {
//   return pt * PX_PER_PT;
// }

// function _pxToPt(px: number): number {
//   return px / PX_PER_PT;
// }

/**
 * Get or create a canvas 2D context for text measurement
 */
function getCanvasContext(): CanvasRenderingContext2D {
  if (!canvasContext) {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

    if (!canvas) {
      throw new Error('Canvas not available. Ensure this runs in a DOM environment (browser or jsdom).');
    }

    canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      throw new Error('Failed to get 2D context from canvas');
    }
  }

  return canvasContext;
}

/**
 * Build a CSS font string from Run styling properties
 *
 * @example
 * ```
 * buildFontString({ fontFamily: "Arial", fontSize: 16, bold: true, italic: true })
 * // Returns: { font: "italic bold 16px Arial", fontFamily: "Arial" }
 * ```
 */
function buildFontString(run: { fontFamily: string; fontSize: number; bold?: boolean; italic?: boolean }): {
  font: string;
  fontFamily: string;
} {
  const parts: string[] = [];

  if (run.italic) parts.push('italic');
  if (run.bold) parts.push('bold');
  parts.push(`${run.fontSize}px`);

  if (measurementConfig.mode === 'deterministic') {
    parts.push(
      measurementConfig.fonts.fallbackStack.length > 0
        ? measurementConfig.fonts.fallbackStack.join(', ')
        : measurementConfig.fonts.deterministicFamily,
    );
  } else {
    parts.push(run.fontFamily);
  }

  return {
    font: parts.join(' '),
    fontFamily: run.fontFamily,
  };
}

/**
 * Measure the width of a text string with specific styling, including letter spacing
 *
 * @param text - The text to measure
 * @param font - CSS font string (e.g., "16px Arial")
 * @param ctx - Canvas 2D context
 * @param fontFamily - Font family name for calibration
 * @param letterSpacing - Optional letter spacing in pixels
 * @returns Total width including letter spacing, calibration, and glyph overhang
 */
function measureText(
  text: string,
  font: string,
  ctx: CanvasRenderingContext2D,
  _fontFamily?: string,
  _letterSpacing?: number,
): number {
  // Deprecated direct measurement; kept for backward compatibility in case of direct calls.
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const advanceWidth = metrics.width;
  const paintedWidth = (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0);
  return Math.max(advanceWidth, paintedWidth);
}

/**
 * Calculate typography metrics for a given font size
 *
 * Uses approximations documented in the file header.
 */
const MIN_SINGLE_LINE_PX = (12 * 96) / 72; // 240 twips = 12pt

function calculateTypographyMetrics(
  fontSize: number,
  spacing?: ParagraphSpacing,
): {
  ascent: number;
  descent: number;
  lineHeight: number;
} {
  const ascent = roundValue(fontSize * 0.8);
  const descent = roundValue(fontSize * 0.2);
  const baseLineHeight = Math.max(fontSize, MIN_SINGLE_LINE_PX);
  const lineHeight = roundValue(resolveLineHeight(spacing, baseLineHeight));
  return {
    ascent,
    descent,
    lineHeight,
  };
}

/**
 * Type guard to check if a run is a tab run
 */
function isTabRun(run: Run): run is TabRun {
  return run.kind === 'tab';
}

/**
 * Calculate tab width and update the tab run with resolved width
 *
 * @param tabRun - The tab run to resolve
 * @param currentX - Current horizontal position before the tab
 * @param block - The paragraph block (for context like indent)
 * @returns The calculated tab width
 */
/**
 * Measure a single FlowBlock and calculate line breaks.
 *
 * Performs greedy line breaking: accumulates text width until exceeding maxWidth,
 * then starts a new line. Breaks on word boundaries when possible.
 *
 * @param block - The FlowBlock to measure (contains runs with text and styling)
 * @param maxWidth - Maximum width for each line in pixels
 * @returns Measure with lines array and total height
 *
 * @example
 * ```typescript
 * const block: FlowBlock = {
 *   id: "0-paragraph",
 *   runs: [
 *     { text: "Hello world", fontFamily: "Arial", fontSize: 16 }
 *   ],
 *   attrs: {}
 * };
 *
 * const measure = await measureBlock(block, 200);
 * // Result: { lines: [...], totalHeight: 19.2 }
 * ```
 */
export async function measureBlock(block: FlowBlock, constraints: number | MeasureConstraints): Promise<Measure> {
  const normalized = normalizeConstraints(constraints);

  if (block.kind === 'drawing') {
    return measureDrawingBlock(block as DrawingBlock, normalized);
  }

  if (block.kind === 'image') {
    return measureImageBlock(block, normalized);
  }

  if (block.kind === 'list') {
    return measureListBlock(block, normalized);
  }

  if (block.kind === 'table') {
    return measureTableBlock(block, normalized);
  }

  // Break blocks (sectionBreak, pageBreak, columnBreak) are pass-through measures
  // with no dimensions - they only signal layout control flow
  if (block.kind === 'sectionBreak') {
    return { kind: 'sectionBreak' };
  }
  if (block.kind === 'pageBreak') {
    return { kind: 'pageBreak' };
  }
  if (block.kind === 'columnBreak') {
    return { kind: 'columnBreak' };
  }

  // Paragraph/default
  return measureParagraphBlock(block as ParagraphBlock, normalized.maxWidth);
}

async function measureParagraphBlock(block: ParagraphBlock, maxWidth: number): Promise<ParagraphMeasure> {
  const ctx = getCanvasContext();
  const wordLayout: WordParagraphLayoutOutput | undefined = block.attrs?.wordLayout as
    | WordParagraphLayoutOutput
    | undefined;
  const lines: Line[] = [];
  const indent = block.attrs?.indent;
  const spacing = block.attrs?.spacing;
  const indentLeft = sanitizePositive(indent?.left);
  const indentRight = sanitizePositive(indent?.right);
  const firstLine = indent?.firstLine ?? 0;
  const hanging = indent?.hanging ?? 0;
  const firstLineOffset = firstLine - hanging;
  const contentWidth = Math.max(1, maxWidth - indentLeft - indentRight);
  let availableWidth = Math.max(1, contentWidth - firstLineOffset);
  const tabStops = buildTabStopsPx(
    indent,
    block.attrs?.tabs as TabStop[],
    block.attrs?.tabIntervalTwips as number | undefined,
  );
  const decimalSeparator = sanitizeDecimalSeparator(block.attrs?.decimalSeparator);

  // Extract bar tab stops for paragraph-level rendering (OOXML: bars on all lines)
  const barTabStops = tabStops.filter((stop) => stop.val === 'bar');

  // Helper to add bar tabs to a line (paragraph-level decoration)
  const addBarTabsToLine = (line: Line): void => {
    if (barTabStops.length > 0) {
      line.bars = barTabStops.map((stop) => ({ x: stop.pos }));
    }
  };

  if (block.runs.length === 0) {
    const metrics = calculateTypographyMetrics(12, spacing);
    const emptyLine: Line = {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: 0,
      width: 0,
      ...metrics,
    };
    addBarTabsToLine(emptyLine);
    lines.push(emptyLine);

    return {
      kind: 'paragraph',
      lines,
      totalHeight: metrics.lineHeight,
    };
  }

  let currentLine: {
    fromRun: number;
    fromChar: number;
    toRun: number;
    toChar: number;
    width: number;
    maxFontSize: number;
    maxWidth: number;
    segments: Line['segments'];
    leaders?: Line['leaders'];
  } | null = null;

  let tabStopCursor = 0;
  let pendingTabAlignment: { target: number; val: TabStop['val'] } | null = null;
  // Remember the last applied tab alignment so we can clamp end-aligned
  // segments to the exact target after measuring to avoid 1px drift.
  let lastAppliedTabAlign: { target: number; val: TabStop['val'] } | null = null;
  const warnedTabVals = new Set<string>();

  /**
   * Validate and track tab stop val to ensure it's normalized.
   * Returns true if validation passed, false if val is invalid (treated as 'start').
   */
  const validateTabStopVal = (stop: TabStopPx): boolean => {
    if (!ALLOWED_TAB_VALS.has(stop.val) && !warnedTabVals.has(stop.val)) {
      warnedTabVals.add(stop.val);
      return false;
    }
    return true;
  };

  const alignSegmentAtTab = (segmentText: string, font: string, runContext: Run): void => {
    if (!pendingTabAlignment || !currentLine) return;
    const { target, val } = pendingTabAlignment;
    let startX = currentLine.width;

    if (val === 'decimal') {
      const idx = segmentText.indexOf(decimalSeparator);
      if (idx >= 0) {
        const beforeText = segmentText.slice(0, idx);
        const beforeWidth = beforeText.length > 0 ? measureRunWidth(beforeText, font, ctx, runContext) : 0;
        startX = Math.max(0, target - beforeWidth);
      } else {
        startX = Math.max(0, target);
      }
    } else if (val === 'end' || val === 'center') {
      const segWidth = segmentText.length > 0 ? measureRunWidth(segmentText, font, ctx, runContext) : 0;
      startX = val === 'end' ? Math.max(0, target - segWidth) : Math.max(0, target - segWidth / 2);
    } else if (val === 'start' || val === 'bar') {
      startX = Math.max(0, target);
    }

    currentLine.width = roundValue(startX);
    // Track alignment used for post-segment clamping
    lastAppliedTabAlign = { target, val };
    pendingTabAlignment = null;
  };

  // Process each run
  for (let runIndex = 0; runIndex < block.runs.length; runIndex++) {
    const run = block.runs[runIndex];

    // Handle tab runs specially
    if (isTabRun(run)) {
      // Initialize line if needed
      if (!currentLine) {
        currentLine = {
          fromRun: runIndex,
          fromChar: 0,
          toRun: runIndex,
          toChar: 1,
          width: 0,
          maxFontSize: 12, // Default font size for tabs
          maxWidth: availableWidth,
          segments: [],
        };
      }

      // Advance to next tab stop using the same logic as inline "\t" handling
      const originX = currentLine.width;
      const { target, nextIndex, stop } = getNextTabStopPx(currentLine.width, tabStops, tabStopCursor);
      tabStopCursor = nextIndex;
      const tabAdvance = Math.max(0, target - currentLine.width);
      currentLine.width = roundValue(currentLine.width + tabAdvance);
      // Persist measured tab width on the TabRun for downstream consumers/tests
      (run as TabRun & { width?: number }).width = tabAdvance;
      currentLine.maxFontSize = Math.max(currentLine.maxFontSize, 12);
      currentLine.toRun = runIndex;
      currentLine.toChar = 1; // tab is a single character
      if (stop) {
        validateTabStopVal(stop);
        pendingTabAlignment = { target, val: stop.val };
      } else {
        pendingTabAlignment = null;
      }

      // Emit leader decoration if requested
      if (stop && stop.leader && stop.leader !== 'none') {
        const leaderStyle: 'heavy' | 'dot' | 'hyphen' | 'underscore' | 'middleDot' = stop.leader;
        const from = Math.min(originX, target);
        const to = Math.max(originX, target);
        if (!currentLine.leaders) currentLine.leaders = [];
        currentLine.leaders.push({ from, to, style: leaderStyle });
      }

      continue;
    }

    // Handle text runs
    const { font } = buildFontString(run);
    const tabSegments = run.text.split('\t');

    let charPosInRun = 0;

    for (let segmentIndex = 0; segmentIndex < tabSegments.length; segmentIndex++) {
      const segment = tabSegments[segmentIndex];
      const isLastSegment = segmentIndex === tabSegments.length - 1;
      const words = segment.split(' ');

      // Align this segment if a tab alignment is pending
      let segmentStartX: number | undefined;
      if (currentLine && pendingTabAlignment) {
        alignSegmentAtTab(segment, font, run);
        // After alignment, currentLine.width is the X position where this segment starts
        segmentStartX = currentLine.width;
      }

      for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        const word = words[wordIndex];
        if (word === '') {
          charPosInRun += 1;
          continue;
        }
        const isLastWordInSegment = wordIndex === words.length - 1;
        const isLastWord = isLastWordInSegment && isLastSegment;
        const wordOnlyWidth = measureRunWidth(word, font, ctx, run);
        const spaceWidth = isLastWord ? 0 : measureRunWidth(' ', font, ctx, run);
        const wordCommitWidth = isLastWord ? wordOnlyWidth : wordOnlyWidth + spaceWidth;
        const wordStartChar = charPosInRun;
        const wordEndNoSpace = charPosInRun + word.length;
        const wordEndWithSpace = charPosInRun + (isLastWord ? word.length : word.length + 1);

        if (!currentLine) {
          currentLine = {
            fromRun: runIndex,
            fromChar: wordStartChar,
            toRun: runIndex,
            toChar: wordEndNoSpace,
            width: wordOnlyWidth,
            maxFontSize: run.fontSize,
            maxWidth: availableWidth,
            segments: [{ runIndex, fromChar: wordStartChar, toChar: wordEndNoSpace, width: wordOnlyWidth }],
          };
          // If a trailing space exists and fits safely, include it on this line
          const ls = (run as TextRun).letterSpacing ?? 0;
          if (!isLastWord && currentLine.width + spaceWidth <= currentLine.maxWidth) {
            currentLine.toChar = wordEndWithSpace;
            currentLine.width = roundValue(currentLine.width + spaceWidth + ls);
            charPosInRun = wordEndWithSpace;
          } else {
            // Do not count trailing space at line end
            charPosInRun = wordEndNoSpace;
          }
          availableWidth = contentWidth;
          continue;
        }

        // For TOC entries, never break lines - allow them to extend beyond maxWidth
        const isTocEntry = block.attrs?.isTocEntry;
        // Fit check uses word-only width and includes boundary letterSpacing when line is non-empty
        const boundarySpacing = currentLine.width > 0 ? ((run as TextRun).letterSpacing ?? 0) : 0;
        if (
          currentLine.width + boundarySpacing + wordOnlyWidth > currentLine.maxWidth &&
          currentLine.width > 0 &&
          !isTocEntry
        ) {
          const metrics = calculateTypographyMetrics(currentLine.maxFontSize, spacing);
          const completedLine: Line = {
            ...currentLine,
            ...metrics,
          };
          addBarTabsToLine(completedLine);
          lines.push(completedLine);
          tabStopCursor = 0;
          pendingTabAlignment = null;

          currentLine = {
            fromRun: runIndex,
            fromChar: wordStartChar,
            toRun: runIndex,
            toChar: wordEndNoSpace,
            width: wordOnlyWidth,
            maxFontSize: run.fontSize,
            maxWidth: contentWidth,
            segments: [{ runIndex, fromChar: wordStartChar, toChar: wordEndNoSpace, width: wordOnlyWidth }],
          };
          // If trailing space would fit on the new line, consume it here; otherwise skip it
          if (!isLastWord && currentLine.width + spaceWidth <= currentLine.maxWidth) {
            currentLine.toChar = wordEndWithSpace;
            currentLine.width = roundValue(currentLine.width + spaceWidth + ((run as TextRun).letterSpacing ?? 0));
            charPosInRun = wordEndWithSpace;
          } else {
            charPosInRun = wordEndNoSpace;
          }
        } else {
          currentLine.toRun = runIndex;
          // If adding the trailing space would exceed, commit only the word and finalize line
          if (!isLastWord && currentLine.width + boundarySpacing + wordOnlyWidth + spaceWidth > currentLine.maxWidth) {
            currentLine.toChar = wordEndNoSpace;
            currentLine.width = roundValue(currentLine.width + boundarySpacing + wordOnlyWidth);
            currentLine.maxFontSize = Math.max(currentLine.maxFontSize, run.fontSize);
            appendSegment(currentLine.segments, runIndex, wordStartChar, wordEndNoSpace, wordOnlyWidth, segmentStartX);
            // finish current line and start a new one on next iteration
            const metrics = calculateTypographyMetrics(currentLine.maxFontSize, spacing);
            const completedLine: Line = { ...currentLine, ...metrics };
            addBarTabsToLine(completedLine);
            lines.push(completedLine);
            tabStopCursor = 0;
            pendingTabAlignment = null;
            currentLine = null;
            // advance past space
            charPosInRun = wordEndNoSpace + 1;
            continue;
          }
          const newToChar = isLastWord ? wordEndNoSpace : wordEndWithSpace;
          currentLine.toChar = newToChar;
          // For the first word in a tab-aligned segment, pass the explicit X position
          const useExplicitX = wordIndex === 0 && segmentStartX !== undefined;
          const explicitX = useExplicitX ? segmentStartX : undefined;
          currentLine.width = roundValue(
            currentLine.width +
              boundarySpacing +
              wordCommitWidth +
              (isLastWord ? 0 : ((run as TextRun).letterSpacing ?? 0)),
          );
          currentLine.maxFontSize = Math.max(currentLine.maxFontSize, run.fontSize);
          appendSegment(currentLine.segments, runIndex, wordStartChar, newToChar, wordCommitWidth, explicitX);
        }

        charPosInRun = isLastWord ? wordEndNoSpace : wordEndWithSpace;
      }

      // If this segment was positioned by a right-aligned tab, clamp the
      // final width to the tab target to avoid rounding drift.
      if (lastAppliedTabAlign && currentLine) {
        const appliedTab = lastAppliedTabAlign as { target: number; val: TabStop['val'] };
        if (appliedTab.val === 'end') {
          currentLine.width = roundValue(appliedTab.target);
        }
      }
      lastAppliedTabAlign = null;

      if (!isLastSegment) {
        pendingTabAlignment = null;
        if (!currentLine) {
          currentLine = {
            fromRun: runIndex,
            fromChar: charPosInRun,
            toRun: runIndex,
            toChar: charPosInRun,
            width: 0,
            maxFontSize: run.fontSize,
            maxWidth: availableWidth,
            segments: [],
          };
          availableWidth = contentWidth;
        }
        const originX = currentLine.width;
        const { target, nextIndex, stop } = getNextTabStopPx(currentLine.width, tabStops, tabStopCursor);
        tabStopCursor = nextIndex;
        const tabAdvance = Math.max(0, target - currentLine.width);
        currentLine.width = roundValue(currentLine.width + tabAdvance);
        currentLine.maxFontSize = Math.max(currentLine.maxFontSize, run.fontSize);
        currentLine.toRun = runIndex;
        currentLine.toChar = charPosInRun;
        charPosInRun += 1;
        if (stop) {
          validateTabStopVal(stop);
          pendingTabAlignment = { target, val: stop.val };
        } else {
          pendingTabAlignment = null;
        }

        // Emit leader decoration if requested
        if (stop && stop.leader && stop.leader !== 'none' && stop.leader !== 'middleDot') {
          const leaderStyle: 'heavy' | 'dot' | 'hyphen' | 'underscore' = stop.leader;
          const from = Math.min(originX, target);
          const to = Math.max(originX, target);
          if (!currentLine.leaders) currentLine.leaders = [];
          currentLine.leaders.push({ from, to, style: leaderStyle });
        }

        // Note: Bar tabs are now added at paragraph-level via addBarTabsToLine()
        // (OOXML spec: bars appear on all lines, not just where tab chars occur)

        /* Build hyphen-aware segments: keep '-' with the left part to allow a wrap like "two-" | "column"
      const parts = word.split('-');
      const segments: string[] = [];
      for (let i = 0; i < parts.length; i += 1) {
        const last = i === parts.length - 1;
        segments.push(last ? parts[i] : parts[i] + '-');
      }

      for (let segIndex = 0; segIndex < segments.length; segIndex++) {
        const segText = segments[segIndex];
        const isLastSegmentOfWord = segIndex === segments.length - 1;

        // Width for fit check (no trailing space)
        const segOnlyWidth = measureText(segText, font, ctx, fontFamily, letterSpacing);
        // Width for commit: include trailing space only for last segment of a word that is not the last word
        const fullSegmentText = isLastSegmentOfWord && !isLastWord ? segText + ' ' : segText;
        const fullSegmentWidth = measureText(fullSegmentText, font, ctx, fontFamily, letterSpacing);

        const segStartChar = charPosInRun;
        const segEndChar = charPosInRun + fullSegmentText.length;

        // Initialize line if needed
        if (!currentLine) {
          currentLine = {
            fromRun: runIndex,
            fromChar: segStartChar,
            toRun: runIndex,
            toChar: segEndChar,
            width: fullSegmentWidth,
            maxFontSize: run.fontSize,
          };
          charPosInRun = segEndChar;
          continue;
        }

        const boundarySpacing = currentLine.width > 0 ? letterSpacing : 0;
        // Small safety margin for floating-point precision and minor measurement variations
        const SAFETY_MARGIN_PX = 0.25;
        const wouldFit =
          currentLine.width + boundarySpacing + segOnlyWidth + SAFETY_MARGIN_PX <= maxWidth ||
          currentLine.width === 0;

        if (!wouldFit) {
          // Finish current line before adding this segment
          trimTrailingSpace(currentLine);
          const metrics = calculateTypographyMetrics(currentLine.maxFontSize);
          lines.push({
            ...currentLine,
            ...metrics,
          });

          // Start new line with this segment
          currentLine = {
            fromRun: runIndex,
            fromChar: segStartChar,
            toRun: runIndex,
            toChar: segEndChar,
            width: fullSegmentWidth,
            maxFontSize: run.fontSize,
          };
        } else {
          // Append segment to current line
          const prevToRun = currentLine.toRun;
          const prevToChar = currentLine.toChar;
          const prevWidth = currentLine.width;

          currentLine.toRun = runIndex;
          currentLine.toChar = segEndChar;
          currentLine.width += boundarySpacing + fullSegmentWidth;
          currentLine.maxFontSize = Math.max(currentLine.maxFontSize, run.fontSize);

          // Safety: if we exceeded maxWidth after appending (e.g., trailing space pushed us over),
          // revert and wrap this segment to next line instead
          if (currentLine.width > maxWidth) {
            // Undo the append
            currentLine.toRun = prevToRun;
            currentLine.toChar = prevToChar;
            currentLine.width = prevWidth;

            // Finish current line
            trimTrailingSpace(currentLine);
            const metrics = calculateTypographyMetrics(currentLine.maxFontSize);
            lines.push({
              ...currentLine,
              ...metrics,
            });

            // Start new line with this segment
            currentLine = {
              fromRun: runIndex,
              fromChar: segStartChar,
              toRun: runIndex,
              toChar: segEndChar,
              width: fullSegmentWidth,
              maxFontSize: run.fontSize,
            };
          }
        }

        // Advance position within the run
        charPosInRun = segEndChar;
*/
      }
    }
  }

  if (!currentLine && lines.length === 0) {
    const fallbackFontSize = (block.runs[0]?.kind !== 'tab' ? block.runs[0]?.fontSize : undefined) ?? 12;
    const metrics = calculateTypographyMetrics(fallbackFontSize, spacing);
    const fallbackLine: Line = {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: 0,
      width: 0,
      segments: [],
      ...metrics,
    };
    addBarTabsToLine(fallbackLine);
    lines.push(fallbackLine);
  }

  if (currentLine) {
    const metrics = calculateTypographyMetrics(currentLine.maxFontSize, spacing);
    const finalLine: Line = {
      ...currentLine,
      ...metrics,
    };
    addBarTabsToLine(finalLine);
    lines.push(finalLine);
  }

  const totalHeight = lines.reduce((sum, line) => sum + line.lineHeight, 0);

  let markerInfo: ParagraphMeasure['marker'];
  if (wordLayout?.marker) {
    const markerRun = {
      fontFamily: wordLayout.marker.run.fontFamily,
      fontSize: wordLayout.marker.run.fontSize,
      bold: wordLayout.marker.run.bold,
      italic: wordLayout.marker.run.italic,
    };
    const { font: markerFont } = buildFontString(markerRun);
    const markerText = wordLayout.marker.markerText ?? '';
    const glyphWidth = markerText ? measureText(markerText, markerFont, ctx) : 0;
    markerInfo = {
      markerWidth: Math.max(wordLayout.marker.markerBoxWidthPx ?? 0, glyphWidth + LIST_MARKER_GAP),
      markerTextWidth: glyphWidth,
      indentLeft: wordLayout.indentLeftPx ?? 0,
    };
  }

  return {
    kind: 'paragraph',
    lines,
    totalHeight,
    ...(markerInfo ? { marker: markerInfo } : {}),
  };
}

async function measureTableBlock(block: TableBlock, constraints: MeasureConstraints): Promise<TableMeasure> {
  const maxWidth = typeof constraints === 'number' ? constraints : constraints.maxWidth;
  const columnCount = Math.max(1, Math.max(...block.rows.map((r) => r.cells.length)));

  let columnWidths: number[];

  // Use provided column widths from OOXML w:tblGrid if available
  if (block.columnWidths && block.columnWidths.length > 0) {
    columnWidths = [...block.columnWidths];

    // Handle column count mismatch: pad or truncate
    if (columnWidths.length < columnCount) {
      // Not enough widths - distribute remaining space equally
      const usedWidth = columnWidths.reduce((a, b) => a + b, 0);
      const remainingWidth = Math.max(0, maxWidth - usedWidth);
      const missingCount = columnCount - columnWidths.length;
      const defaultWidth = missingCount > 0 ? Math.max(1, Math.floor(remainingWidth / missingCount)) : 0;

      for (let i = columnWidths.length; i < columnCount; i++) {
        columnWidths.push(defaultWidth);
      }
    } else if (columnWidths.length > columnCount) {
      // Too many widths - truncate to actual column count
      columnWidths = columnWidths.slice(0, columnCount);
    }

    // Scale proportionally if total width exceeds available width
    // UNLESS the table has an explicit tableWidth (user-resized tables)
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    const hasExplicitWidth = block.attrs?.tableWidth != null;
    if (!hasExplicitWidth && totalWidth > maxWidth) {
      const scale = maxWidth / totalWidth;
      columnWidths = columnWidths.map((w) => Math.max(1, Math.floor(w * scale)));
    }
  } else {
    // Fallback: Equal distribution (existing behavior)
    const columnWidth = Math.max(1, Math.floor(maxWidth / columnCount));
    columnWidths = Array.from({ length: columnCount }, () => columnWidth);
  }

  // Measure each cell paragraph with appropriate column width
  const rows: TableRowMeasure[] = [];
  for (const row of block.rows) {
    const cellMeasures: TableCellMeasure[] = [];
    for (let col = 0; col < columnCount; col++) {
      const cell = row.cells[col];
      const cellWidth = columnWidths[col] || columnWidths[0] || Math.floor(maxWidth / columnCount);

      if (!cell) {
        cellMeasures.push({ paragraph: { kind: 'paragraph', lines: [], totalHeight: 0 }, width: cellWidth, height: 0 });
        continue;
      }
      const paraMeasure = await measureParagraphBlock(cell.paragraph, cellWidth);
      const height = paraMeasure.totalHeight;
      cellMeasures.push({ paragraph: paraMeasure, width: cellWidth, height });
    }
    const rowHeight = Math.max(0, ...cellMeasures.map((c) => c.height));
    rows.push({ cells: cellMeasures, height: rowHeight });
  }

  const totalHeight = rows.reduce((sum, r) => sum + r.height, 0);
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return {
    kind: 'table',
    rows,
    columnWidths,
    totalWidth,
    totalHeight,
  };
}

async function measureImageBlock(block: ImageBlock, constraints: MeasureConstraints): Promise<ImageMeasure> {
  const intrinsic = getIntrinsicImageSize(block, constraints.maxWidth);

  const maxWidth = constraints.maxWidth > 0 ? constraints.maxWidth : intrinsic.width;
  const maxHeight = constraints.maxHeight && constraints.maxHeight > 0 ? constraints.maxHeight : Infinity;

  const widthScale = maxWidth / intrinsic.width;
  const heightScale = maxHeight / intrinsic.height;
  const scale = Math.min(1, widthScale, heightScale);

  const width = Number.isFinite(scale) ? intrinsic.width * scale : intrinsic.width;
  const height = Number.isFinite(scale) ? intrinsic.height * scale : intrinsic.height;

  return {
    kind: 'image',
    width,
    height,
  };
}

async function measureDrawingBlock(block: DrawingBlock, constraints: MeasureConstraints): Promise<DrawingMeasure> {
  if (block.drawingKind === 'image') {
    const intrinsic = getIntrinsicSizeFromDims(block.width, block.height, constraints.maxWidth);

    const maxWidth = constraints.maxWidth > 0 ? constraints.maxWidth : intrinsic.width;
    const maxHeight = constraints.maxHeight && constraints.maxHeight > 0 ? constraints.maxHeight : Infinity;

    const widthScale = maxWidth / intrinsic.width;
    const heightScale = maxHeight / intrinsic.height;
    const scale = Math.min(1, widthScale, heightScale);

    const width = Number.isFinite(scale) ? intrinsic.width * scale : intrinsic.width;
    const height = Number.isFinite(scale) ? intrinsic.height * scale : intrinsic.height;

    return {
      kind: 'drawing',
      drawingKind: 'image',
      width,
      height,
      scale: Number.isFinite(scale) ? scale : 1,
      naturalWidth: intrinsic.width,
      naturalHeight: intrinsic.height,
      geometry: {
        width: intrinsic.width,
        height: intrinsic.height,
        rotation: 0,
        flipH: false,
        flipV: false,
      },
    };
  }

  const geometry = ensureDrawingGeometry(block.geometry);
  const rotatedBounds = calculateRotatedBounds(geometry);
  const naturalWidth = Math.max(1, rotatedBounds.width);
  const naturalHeight = Math.max(1, rotatedBounds.height);

  const maxWidth = constraints.maxWidth > 0 ? constraints.maxWidth : naturalWidth;
  const maxHeight = constraints.maxHeight && constraints.maxHeight > 0 ? constraints.maxHeight : Infinity;

  const widthScale = maxWidth / naturalWidth;
  const heightScale = maxHeight / naturalHeight;
  const normalizedScale = Math.min(1, widthScale, heightScale);
  const scale = Number.isFinite(normalizedScale) ? normalizedScale : 1;

  const width = naturalWidth * scale;
  const height = naturalHeight * scale;

  return {
    kind: 'drawing',
    drawingKind: block.drawingKind,
    width,
    height,
    scale,
    naturalWidth,
    naturalHeight,
    geometry: { ...geometry },
    ...(block.drawingKind === 'shapeGroup' && block.groupTransform
      ? { groupTransform: { ...block.groupTransform } }
      : {}),
  };
}

function getIntrinsicImageSize(block: ImageBlock, fallback: number): { width: number; height: number } {
  const safeFallback = fallback > 0 ? fallback : 1;
  const suggestedWidth = typeof block.width === 'number' && block.width > 0 ? block.width : safeFallback;
  const suggestedHeight = typeof block.height === 'number' && block.height > 0 ? block.height : safeFallback * 0.75;

  return {
    width: suggestedWidth,
    height: suggestedHeight,
  };
}

function getIntrinsicSizeFromDims(width?: number, height?: number, fallback = 1): { width: number; height: number } {
  const safeFallback = fallback > 0 ? fallback : 1;
  const intrinsicWidth = typeof width === 'number' && width > 0 ? width : safeFallback;
  const intrinsicHeight = typeof height === 'number' && height > 0 ? height : safeFallback * 0.75;
  return {
    width: intrinsicWidth,
    height: intrinsicHeight,
  };
}

function ensureDrawingGeometry(geometry?: DrawingGeometry): DrawingGeometry {
  if (geometry) {
    return {
      width: Math.max(1, geometry.width),
      height: Math.max(1, geometry.height),
      rotation: normalizeRotation(geometry.rotation ?? 0),
      flipH: Boolean(geometry.flipH),
      flipV: Boolean(geometry.flipV),
    };
  }
  return {
    width: 1,
    height: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
  };
}

function normalizeConstraints(constraints: number | MeasureConstraints): MeasureConstraints {
  if (typeof constraints === 'number') {
    return { maxWidth: constraints };
  }
  return constraints;
}

async function measureListBlock(block: ListBlock, constraints: MeasureConstraints): Promise<ListMeasure> {
  const ctx = getCanvasContext();
  const items = [];
  let totalHeight = 0;

  for (const item of block.items) {
    const wordLayout = item.paragraph.attrs?.wordLayout as
      | { marker?: WordParagraphLayoutOutput['marker']; indentLeftPx?: number }
      | undefined;
    let markerTextWidth: number;
    let markerWidth: number;
    let indentLeft: number;

    if ((wordLayout as WordParagraphLayoutOutput | undefined)?.marker) {
      // Track B: Use wordLayout from @superdoc/word-layout when available
      const marker = (wordLayout as WordParagraphLayoutOutput).marker!;
      const markerFontRun: TextRun = {
        text: marker.markerText,
        fontFamily: marker.run.fontFamily,
        fontSize: marker.run.fontSize,
        bold: marker.run.bold,
        italic: marker.run.italic,
        letterSpacing: marker.run.letterSpacing,
      };
      const { font: markerFont } = buildFontString(markerFontRun);
      markerTextWidth = marker.markerText ? measureText(marker.markerText, markerFont, ctx) : 0;
      markerWidth = marker.markerBoxWidthPx;
      indentLeft = (wordLayout as WordParagraphLayoutOutput).indentLeftPx ?? 0;
    } else {
      // Fallback: legacy behavior for backwards compatibility
      const markerFontRun = getPrimaryRun(item.paragraph);
      const { font: markerFont } = buildFontString(markerFontRun);
      const markerText = item.marker.text ?? '';
      markerTextWidth = markerText ? measureText(markerText, markerFont, ctx) : 0;
      indentLeft = resolveIndentLeft(item);
      const indentHanging = resolveIndentHanging(item);
      markerWidth = Math.max(MIN_MARKER_GUTTER, markerTextWidth + LIST_MARKER_GAP, indentHanging);
    }

    // Account for both indentLeft and marker width so paragraph text wraps correctly
    const paragraphWidth = Math.max(1, constraints.maxWidth - indentLeft - markerWidth);

    const paragraphMeasure = await measureParagraphBlock(item.paragraph, paragraphWidth);
    totalHeight += paragraphMeasure.totalHeight;

    items.push({
      itemId: item.id,
      markerWidth,
      markerTextWidth,
      indentLeft,
      paragraph: paragraphMeasure,
    });
  }

  return {
    kind: 'list',
    items,
    totalHeight,
  };
}

const getPrimaryRun = (paragraph: ParagraphBlock): TextRun => {
  return (
    paragraph.runs.find((run): run is TextRun => run.kind !== 'tab' && Boolean(run.fontFamily && run.fontSize)) || {
      text: '',
      fontFamily: 'Arial',
      fontSize: 16,
    }
  );
};

const measureRunWidth = (text: string, font: string, ctx: CanvasRenderingContext2D, run: Run): number => {
  const letterSpacing = run.kind !== 'tab' ? run.letterSpacing || 0 : 0;
  const width = getMeasuredTextWidth(text, font, letterSpacing, ctx);
  return roundValue(width);
};

const appendSegment = (
  segments: Line['segments'] | undefined,
  runIndex: number,
  fromChar: number,
  toChar: number,
  width: number,
  x?: number,
): void => {
  if (!segments) return;
  const last = segments[segments.length - 1];
  // Only merge segments if they are contiguous AND have no explicit X positioning
  // (explicit X means tab-aligned, shouldn't merge)
  if (last && last.runIndex === runIndex && last.toChar === fromChar && x === undefined) {
    last.toChar = toChar;
    last.width += width;
    return;
  }
  segments.push({ runIndex, fromChar, toChar, width, x });
};

const resolveLineHeight = (spacing: ParagraphSpacing | undefined, baseLineHeight: number): number => {
  if (!spacing || spacing.line == null || spacing.line <= 0) {
    return baseLineHeight;
  }

  const raw = spacing.line;
  const treatAsMultiplier = (spacing.lineRule === 'auto' || spacing.lineRule == null) && raw > 0 && raw <= 10;

  if (treatAsMultiplier) {
    return raw * baseLineHeight;
  }

  if (spacing.lineRule === 'exact') {
    return raw;
  }

  if (spacing.lineRule === 'atLeast') {
    return Math.max(baseLineHeight, raw);
  }

  return raw;
};

const sanitizePositive = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

const sanitizeDecimalSeparator = (value: unknown): string => {
  if (value === ',') return ',';
  return DEFAULT_DECIMAL_SEPARATOR;
};

const resolveIndentLeft = (item: ListBlock['items'][number]): number => {
  const indentLeft = sanitizePositive(item.paragraph.attrs?.indent?.left);
  if (indentLeft > 0) {
    return indentLeft;
  }
  return DEFAULT_LIST_INDENT_BASE + item.marker.level * DEFAULT_LIST_INDENT_STEP;
};

const resolveIndentHanging = (item: ListBlock['items'][number]): number => {
  const indentHanging = sanitizePositive(item.paragraph.attrs?.indent?.hanging);
  if (indentHanging > 0) {
    return indentHanging;
  }
  return DEFAULT_LIST_HANGING;
};

/**
 * Build tab stops in pixel coordinates for measurement.
 * Converts indent from px→twips, calls engine with twips, converts result twips→px.
 */
const buildTabStopsPx = (indent?: ParagraphIndent, tabs?: TabStop[], tabIntervalTwips?: number): TabStopPx[] => {
  // Convert indent from pixels to twips for the engine
  const paragraphIndentTwips = {
    left: pxToTwips(sanitizePositive(indent?.left)),
    right: pxToTwips(sanitizePositive(indent?.right)),
    firstLine: pxToTwips(sanitizePositive(indent?.firstLine)),
    hanging: pxToTwips(sanitizePositive(indent?.hanging)),
  };

  // Engine works in twips (tabs already in twips from PM adapter)
  const stops = computeTabStops({
    explicitStops: tabs ?? [],
    defaultTabInterval: tabIntervalTwips ?? DEFAULT_TAB_INTERVAL_TWIPS,
    paragraphIndent: paragraphIndentTwips,
  });

  // Convert resulting tab stops from twips to pixels for measurement
  return stops.map((stop) => ({
    pos: twipsToPx(stop.pos),
    val: stop.val,
    leader: stop.leader,
  }));
};

const getNextTabStopPx = (
  currentX: number,
  tabStops: TabStopPx[],
  startIndex: number,
): { target: number; nextIndex: number; stop?: TabStopPx } => {
  let index = startIndex;
  while (index < tabStops.length && tabStops[index].pos <= currentX + TAB_EPSILON) {
    index++;
  }
  if (index < tabStops.length) {
    return { target: tabStops[index].pos, nextIndex: index + 1, stop: tabStops[index] };
  }
  return { target: currentX + DEFAULT_TAB_INTERVAL_PX, nextIndex: index };
};
