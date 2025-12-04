import { Decoration } from 'prosemirror-view';
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
  extractParagraphContext,
} from './tabDecorations.js';
import { getParagraphContext } from './paragraphContextCache.js';

const leaderStyles = {
  dot: 'border-bottom: 1px dotted black;',
  heavy: 'border-bottom: 2px solid black;',
  hyphen: 'border-bottom: 1px solid black;',
  middleDot: 'border-bottom: 1px dotted black; margin-bottom: 2px;',
  underscore: 'border-bottom: 1px solid black;',
};

// Create a stable paragraph ID from its start position.
const paragraphIdFromPos = (startPos) => `para-${startPos}`;
const tabIdForIndex = (paragraphId, index) => `${paragraphId}-tab-${index}`;

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
export function createLayoutRequest(doc, paragraphPos, view, helpers, revision, paragraphWidthOverride) {
  const $pos = doc.resolve(paragraphPos);
  const paragraphCache = new Map();
  const paragraphContext = findParagraphContext($pos, paragraphCache, helpers);
  if (!paragraphContext) return null;

  const paragraphId = paragraphIdFromPos(paragraphContext.startPos);

  const paragraphNode = paragraphContext.paragraph;
  const cachedContext = getParagraphContext(paragraphNode, paragraphContext.startPos, helpers, revision, () =>
    extractParagraphContext(paragraphNode, paragraphContext.startPos, helpers, paragraphContext.paragraphDepth),
  );
  const effectiveContext = cachedContext || paragraphContext;
  const { entries } = flattenParagraph(paragraphNode, paragraphContext.startPos);

  const spans = [];
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
  const tabStops = Array.isArray(effectiveContext.tabStops) ? [...effectiveContext.tabStops] : [];

  const hangingPx = twipsToPixels(Number(effectiveContext.indent?.hanging) || 0);
  const leftIndentPx = twipsToPixels(Number(effectiveContext.indent?.left) || 0);

  // Word behavior: paragraphs with hanging indent get an implicit tab stop at the left indent position.
  // This allows the first tab press to align text at the left indent (where subsequent lines start).
  if (hangingPx > 0) {
    tabStops.unshift({ val: 'start', pos: leftIndentPx, leader: 'none' });
  }

  const paragraphWidth =
    paragraphWidthOverride ?? getBlockNodeWidth(view, effectiveContext.startPos) ?? defaultLineLength;

  const indentWidth =
    effectiveContext.indentWidth ?? getIndentWidth(view, effectiveContext.startPos, effectiveContext.indent);

  return {
    paragraphId,
    revision,
    paragraphWidth,
    defaultTabDistance,
    defaultLineLength,
    indents: {
      left: twipsToPixels(Number(effectiveContext.indent?.left) || 0),
      right: twipsToPixels(Number(effectiveContext.indent?.right) || 0),
      firstLine: twipsToPixels(Number(effectiveContext.indent?.firstLine) || 0),
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
export function calculateTabLayout(request, measurement, view) {
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

  const tabs = {};
  let currentX = indentWidth;

  const measureText = (span) => {
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
      let measureTextCallback;
      if (measurement?.measureText) {
        measureTextCallback = (text) => measurement.measureText(span.spanId, text);
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
        tabStops,
        paragraphWidth,
        defaultTabDistance,
        defaultLineLength,
        followingText,
        measureText: measureTextCallback,
      });

      tabs[span.tabId] = {
        width: result.width,
        height: tabHeight,
        leader: result.leader,
        alignment: result.alignment,
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
export function applyLayoutResult(result, paragraph, paragraphPos) {
  const decorations = [];
  let tabIndex = 0;
  paragraph.forEach((node, offset) => {
    if (node.type.name !== 'tab') return;
    const pos = paragraphPos + offset + 1;
    const tabId = tabIdForIndex(result.paragraphId, tabIndex++);
    const layout = result.tabs[tabId];
    if (!layout) return;
    let style = `width: ${layout.width}px;`;
    if (layout.height) style += ` height: ${layout.height};`;
    if (layout.leader && leaderStyles[layout.leader]) {
      style += ` ${leaderStyles[layout.leader]}`;
    }

    decorations.push(Decoration.node(pos, pos + node.nodeSize, { style }));
  });
  return decorations;
}

function collectFollowingText(spans, startIndex) {
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
function getFollowingTextRange(spans, startIndex) {
  let from = null;
  let to = null;
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
