import { Decoration } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';
import type { Node as PmNode } from 'prosemirror-model';
import { calculateTabWidth } from '@superdoc/contracts';
import { twipsToPixels } from '@superdoc/word-layout';
import {
  defaultLineLength,
  defaultTabDistance,
  findParagraphContext,
  flattenParagraph,
  measureRangeWidth,
  calcTabHeight,
  getBlockNodeWidth,
  getIndentWidth,
} from './tabDecorations.js';
import type { ParagraphContext } from './tabDecorations.js';
import type { Editor } from '@core/Editor.js';
import type { LayoutRequest, LayoutResult, TabSpan, TextSpan } from '../types.js';

const leaderStyles = {
  none: '',
  dot: 'border-bottom: 1px dotted black;',
  heavy: 'border-bottom: 2px solid black;',
  hyphen: 'border-bottom: 1px solid black;',
  middleDot: 'border-bottom: 1px dotted black; margin-bottom: 2px;',
  underscore: 'border-bottom: 1px solid black;',
};

type Span = TextSpan | TabSpan;

// Create a stable paragraph ID from its start position.
const paragraphIdFromPos = (startPos: number) => `para-${startPos}`;
const tabIdForIndex = (paragraphId: string, index: number) => `${paragraphId}-tab-${index}`;

/**
 * Build a layout request for a given paragraph.
 * @param {import('prosemirror-model').Node} doc
 * @param {number} paragraphPos
 * @param {import('prosemirror-view').EditorView} view
 * @param {any} helpers
 * @param {number} revision
 * @param {number} [paragraphWidthOverride]
 * @returns {import('../types.js').LayoutRequest|null}
 */
export function createLayoutRequest(
  doc: PmNode,
  paragraphPos: number,
  view: EditorView,
  helpers: Editor['helpers'],
  revision: number,
  paragraphWidthOverride?: number,
): LayoutRequest | null {
  const $pos = doc.resolve(paragraphPos);
  const paragraphCache: Map<number, ParagraphContext> = new Map();
  const paragraphContext = findParagraphContext($pos, paragraphCache, helpers);
  if (!paragraphContext) return null;

  const paragraphId = paragraphIdFromPos(paragraphContext.startPos);

  const paragraphNode = paragraphContext.paragraph;
  const { entries } = flattenParagraph(paragraphNode, paragraphContext.startPos);

  const spans: Span[] = [];
  let tabIndex = 0;
  entries.forEach((entry, idx) => {
    const node = entry.node;
    const spanId = `${paragraphId}-span-${idx}`;
    const from = entry.pos;
    const to = entry.pos + node.nodeSize;

    if (node.type.name === 'tab') {
      spans.push({
        type: 'tab',
        spanId,
        tabId: tabIdForIndex(paragraphId, tabIndex++),
        pos: entry.pos,
        nodeSize: node.nodeSize,
      });
    } else if (node.type.name === 'text') {
      spans.push({
        type: 'text',
        spanId,
        text: node.text || '',
        style: node.marks?.find((mark) => mark.type.name === 'textStyle')?.attrs || {},
        from,
        to,
      });
    }
  });

  // Convert tab stops (twips → px) and add implicit hanging indent stop if needed
  const tabStops = Array.isArray(paragraphContext.tabStops) ? [...paragraphContext.tabStops] : [];

  const hangingPx = twipsToPixels(Number(paragraphContext.indent?.hanging) || 0);
  if (hangingPx > 0 && paragraphContext.indentWidth != null) {
    tabStops.unshift({ val: 'start', pos: paragraphContext.indentWidth + hangingPx, leader: 'none' });
  }

  const paragraphWidth =
    paragraphWidthOverride ?? getBlockNodeWidth(view, paragraphContext.startPos) ?? defaultLineLength;

  const indentWidth =
    paragraphContext.indentWidth ?? getIndentWidth(view, paragraphContext.startPos, paragraphContext.indent);

  return {
    paragraphId,
    revision,
    paragraphWidth,
    defaultTabDistance,
    defaultLineLength,
    indents: {
      left: twipsToPixels(Number(paragraphContext.indent?.left) || 0),
      right: twipsToPixels(Number(paragraphContext.indent?.right) || 0),
      firstLine: twipsToPixels(Number(paragraphContext.indent?.firstLine) || 0),
      hanging: hangingPx,
    },
    tabStops,
    spans,
    indentWidth,
    paragraphNode,
  };
}

/**
 * Compute tab layouts for a layout request using either provided measurement callbacks or ProseMirror view.
 * @param {import('../types.js').LayoutRequest} request
 * @param {{ measureText?: (spanId:string, text:string)=>number }} [measurement]
 * @param {import('prosemirror-view').EditorView} [view]
 * @returns {import('../types.js').LayoutResult}
 */
export function calculateTabLayout(
  request: LayoutRequest,
  measurement?: { measureText?: (spanId: string, text: string) => number },
  view?: EditorView,
): LayoutResult {
  const {
    spans,
    tabStops,
    paragraphWidth,
    defaultTabDistance,
    defaultLineLength,
    paragraphId,
    revision,
    indentWidth = 0,
    paragraphNode,
  } = request;

  const tabs: LayoutResult['tabs'] = {};
  let currentX = indentWidth;

  const measureText = (span: TextSpan) => {
    if (measurement?.measureText) return measurement.measureText(span.spanId, span.text || '');
    if (view && typeof span.from === 'number' && typeof span.to === 'number') {
      return measureRangeWidth(view, span.from, span.to);
    }
    return 0;
  };

  // Precompute tab heights once
  const tabHeight = paragraphNode ? calcTabHeight(paragraphNode) : undefined;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (span.type === 'text') {
      currentX += measureText(span);
    } else if (span.type === 'tab') {
      const followingText = collectFollowingText(spans, i + 1);

      // Create measureText callback that can measure the following text
      // For center/right/decimal alignment, we need to measure the text width
      let measureTextCallback: ((text: string) => number) | undefined;
      if (measurement?.measureText) {
        const measureFn = measurement.measureText;
        measureTextCallback = (text) => measureFn(span.spanId, text);
      } else if (view) {
        // Measure using view by finding the range of the following text spans
        const followingRange = getFollowingTextRange(spans, i + 1);
        if (followingRange) {
          // Cache the full following text width
          const fullWidth = measureRangeWidth(view, followingRange.from, followingRange.to);
          const fullText = followingText;
          measureTextCallback = (text) => {
            // If measuring the full text, return the measured width
            if (text === fullText) return fullWidth;
            // For partial text (decimal alignment), estimate proportionally
            if (fullText.length > 0) {
              return (text.length / fullText.length) * fullWidth;
            }
            return 0;
          };
        }
      }

      const result = calculateTabWidth({
        currentX,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabStops: tabStops as any,
        paragraphWidth,
        defaultTabDistance,
        defaultLineLength,
        followingText,
        measureText: measureTextCallback ?? (() => 0),
      });

      const alignment = result.alignment === 'clear' ? 'default' : (result.alignment ?? 'default');
      tabs[span.tabId] = {
        width: result.width,
        height: tabHeight,
        leader: result.leader,
        alignment,
        tabStopPosUsed: result.tabStopPosUsed,
      };
      currentX += result.width;
    }
  }

  return {
    paragraphId,
    revision,
    tabs,
  };
}

/**
 * Convert layout results to ProseMirror decorations (editor-surface consumer).
 * @param {import('../types.js').LayoutResult} result
 * @param {import('prosemirror-model').Node} paragraph
 * @param {number} paragraphPos // position before paragraph
 * @returns {Decoration[]}
 */
export function applyLayoutResult(result: LayoutResult, paragraph: PmNode, paragraphPos: number) {
  const decorations: Decoration[] = [];
  let tabIndex = 0;
  paragraph.forEach((node, offset) => {
    if (node.type.name !== 'tab') return;
    const pos = paragraphPos + offset + 1;
    const tabId = tabIdForIndex(result.paragraphId, tabIndex++);
    const layout = result.tabs[tabId];
    if (!layout) return;
    let style = `width: ${layout.width}px;`;
    if (layout.height) style += ` height: ${layout.height};`;
    if (layout.leader) {
      const leaderStyle = leaderStyles[layout.leader] ?? '';
      if (leaderStyle) {
        style += ` ${leaderStyle}`;
      }
    }

    decorations.push(Decoration.node(pos, pos + node.nodeSize, { style }));
  });
  return decorations;
}

function collectFollowingText(spans: Span[], startIndex: number) {
  let text = '';
  for (let i = startIndex; i < spans.length; i++) {
    const span = spans[i];
    if (span.type === 'tab') break;
    if (span.type === 'text') text += span.text || '';
  }
  return text;
}

/**
 * Get the document range (from/to positions) of text spans following a tab.
 * Used to measure text width for center/right/decimal alignment.
 */
function getFollowingTextRange(spans: Span[], startIndex: number) {
  let from: number | null = null;
  let to: number | null = null;
  for (let i = startIndex; i < spans.length; i++) {
    const span = spans[i];
    if (span.type === 'tab') break;
    if (span.type === 'text' && typeof span.from === 'number' && typeof span.to === 'number') {
      if (from === null) from = span.from;
      to = span.to;
    }
  }
  if (from !== null && to !== null) {
    return { from, to };
  }
  return null;
}
