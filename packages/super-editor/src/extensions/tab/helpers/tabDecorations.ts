import { Decoration } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';
import type { Node as PmNode, ResolvedPos } from 'prosemirror-model';
import { twipsToPixels } from '@superdoc/word-layout';
import { getResolvedParagraphProperties } from '@extensions/paragraph/resolvedPropertiesCache.js';
import type { TabStopInput, TabStopAlignment, TabLeader } from '../types.js';

interface IndentAttrs {
  left?: number | string;
  firstLine?: number | string;
  hanging?: number | string;
}

type ParagraphEntry = { node: PmNode; pos: number };
export interface ParagraphContext {
  paragraph: PmNode;
  paragraphDepth: number;
  startPos: number;
  indent: Record<string, unknown>;
  tabStops: TabStopInput[];
  flattened: ParagraphEntry[];
  positionMap: Map<number, number>;
  accumulatedTabWidth: number;
  indentWidth?: number;
  tabHeight?: string;
  paragraphWidth?: number;
}

type ParagraphCache = Map<number, ParagraphContext>;
type CoordCache = Map<number, number | null>;
type DomPosCache = Map<number, { node: Node; offset: number }>;

export const defaultTabDistance = 48;
export const defaultLineLength = 816;

export const getTabDecorations = (
  doc: PmNode,
  view: EditorView,
  helpers: unknown,
  from = 0,
  to: number | null = null,
) => {
  const decorations: Decoration[] = [];
  const paragraphCache: ParagraphCache = new Map();
  const coordCache: CoordCache = new Map();
  const domPosCache: DomPosCache = new Map();

  const end = to ?? doc.content.size;

  doc.nodesBetween(from, end, (node: PmNode, pos: number) => {
    if (node.type.name !== 'tab') return;

    const $pos = doc.resolve(pos);
    const paragraphContext = findParagraphContext($pos, paragraphCache, helpers);
    if (!paragraphContext) return;

    const blockParent = $pos.node(paragraphContext.paragraphDepth);
    const style = calculateTabStyle(node.nodeSize, view, pos, blockParent, paragraphContext, coordCache, domPosCache);

    if (style) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          style,
        }),
      );
    }
  });

  return decorations;
};

export function calculateTabStyle(
  nodeSize: number,
  view: EditorView,
  pos: number,
  blockParent: PmNode,
  paragraphContext: ParagraphContext,
  coordCache: CoordCache | null = null,
  domPosCache: DomPosCache | null = null,
): string | null {
  let extraStyles = '';
  try {
    const { tabStops, flattened, positionMap, startPos } = paragraphContext;
    // Cache paragraph-level computed values (computed once per paragraph, not per tab)
    if (paragraphContext.indentWidth === undefined) {
      paragraphContext.indentWidth = getIndentWidth(view, startPos, paragraphContext.indent, coordCache, domPosCache);
    }
    if (paragraphContext.tabHeight === undefined) {
      paragraphContext.tabHeight = calcTabHeight(blockParent);
    }
    if (paragraphContext.paragraphWidth === undefined) {
      paragraphContext.paragraphWidth = getBlockNodeWidth(view, startPos);
    }

    const indentWidth = paragraphContext.indentWidth;
    const hanging = twipsToPixels(Number(paragraphContext.indent.hanging) || 0);
    if (hanging > 0) {
      // Word places an implicit tab stop at the hanging indent position
      tabStops.unshift({ val: 'start', pos: indentWidth + hanging });
    }
    const accumulatedTabWidth = paragraphContext.accumulatedTabWidth || 0;
    const currentWidth =
      indentWidth + measureRangeWidth(view, startPos + 1, pos, coordCache, domPosCache) + accumulatedTabWidth;

    let tabWidth;
    if (tabStops.length) {
      const tabStop = tabStops.find((stop) => stop.pos > currentWidth && stop.val !== 'clear');
      if (tabStop) {
        tabWidth = Math.min(tabStop.pos, paragraphContext.paragraphWidth) - currentWidth;
        let val: TabStopAlignment = tabStop.val;
        const aliases: Partial<Record<TabStopAlignment, TabStopAlignment>> = { left: 'start', right: 'end' };
        const mappedVal = aliases[val];
        if (mappedVal) val = mappedVal;

        if (val === 'center' || val === 'end' || val === 'right') {
          // Use O(1) map lookup instead of O(n) findIndex
          const entryIndex = positionMap.get(pos);
          if (entryIndex === undefined) return null;

          const nextTabIndex = findNextTabIndex(flattened, entryIndex + 1);
          const segmentStartPos = pos + nodeSize;
          const segmentEndPos =
            nextTabIndex === -1 ? startPos + paragraphContext.paragraph.nodeSize - 1 : flattened[nextTabIndex].pos;
          const segmentWidth = measureRangeWidth(view, segmentStartPos, segmentEndPos, coordCache, domPosCache);
          tabWidth -= val === 'center' ? segmentWidth / 2 : segmentWidth;
        } else if (val === 'decimal' || val === 'num') {
          // Use O(1) map lookup instead of O(n) findIndex
          const entryIndex = positionMap.get(pos);
          if (entryIndex === undefined) return null;

          const breakChar = tabStop.decimalChar || '.';
          const decimalPos = findDecimalBreakPos(flattened, entryIndex + 1, breakChar);
          const integralWidth = decimalPos
            ? measureRangeWidth(view, pos + nodeSize, decimalPos, coordCache, domPosCache)
            : measureRangeWidth(
                view,
                pos + nodeSize,
                startPos + paragraphContext.paragraph.nodeSize - 1,
                coordCache,
                domPosCache,
              );
          tabWidth -= integralWidth;
        }

        if (tabStop.leader) {
          const leaderStyles: Record<TabLeader, string> = {
            none: '',
            dot: 'border-bottom: 1px dotted black;',
            heavy: 'border-bottom: 2px solid black;',
            hyphen: 'border-bottom: 1px solid black;',
            middleDot: 'border-bottom: 1px dotted black; margin-bottom: 2px;',
            underscore: 'border-bottom: 1px solid black;',
          };
          extraStyles += leaderStyles[tabStop.leader] || '';
        }
      }
    }

    if (!tabWidth || tabWidth < 1) {
      tabWidth = defaultTabDistance - ((currentWidth % defaultLineLength) % defaultTabDistance);
      if (tabWidth === 0) tabWidth = defaultTabDistance;
    }

    // Use cached tabHeight (computed once per paragraph)
    const tabHeight = paragraphContext.tabHeight ?? 'auto';

    paragraphContext.accumulatedTabWidth = accumulatedTabWidth + tabWidth;
    return `width: ${tabWidth}px; height: ${tabHeight}; ${extraStyles}`;
  } catch {
    return null;
  }
}

export function findParagraphContext(
  $pos: ResolvedPos,
  cache: ParagraphCache,
  helpers: unknown,
): ParagraphContext | null {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node?.type?.name === 'paragraph') {
      const startPos = $pos.start(depth);
      if (!cache.has(startPos)) {
        const paragraphContext = extractParagraphContext(node, startPos, helpers, depth);
        cache.set(startPos, paragraphContext);
      }
      return cache.get(startPos) ?? null;
    }
  }
  return null;
}

export function extractParagraphContext(node: PmNode, startPos: number, helpers: unknown, depth = 0): ParagraphContext {
  const paragraphProperties = getResolvedParagraphProperties(node) || {};
  // Map OOXML alignment values to internal values (for RTL support)
  const alignmentAliases: Partial<Record<TabStopAlignment, TabStopAlignment>> = { left: 'start', right: 'end' };
  let tabStops: TabStopInput[] = [];

  if (Array.isArray((paragraphProperties as Record<string, unknown>).tabStops)) {
    tabStops = (paragraphProperties as { tabStops: TabStopInput[] }).tabStops
      .map((stop) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ref = (stop as any)?.tab;
        if (!ref) return stop || null;
        const rawType = (ref.tabType as TabStopAlignment) || 'start';
        const mappedVal = (alignmentAliases[rawType] || rawType) as TabStopAlignment;
        return {
          val: mappedVal,
          pos: twipsToPixels(Number(ref.pos) || 0),
          leader: ref.leader as TabLeader | undefined,
          decimalChar: ref.decimalChar as string | undefined,
        };
      })
      .filter((stop): stop is TabStopInput => Boolean(stop));
  }

  const { entries, positionMap } = flattenParagraph(node, startPos);
  return {
    paragraph: node,
    paragraphDepth: depth,
    startPos,
    indent: (paragraphProperties as { indent?: Record<string, unknown> }).indent || {},
    tabStops: tabStops,
    flattened: entries,
    positionMap: positionMap, // Store position map for O(1) lookups
    accumulatedTabWidth: 0,
  };
}

export function flattenParagraph(paragraph: PmNode, paragraphStartPos: number) {
  const entries: ParagraphEntry[] = [];
  const positionMap: Map<number, number> = new Map(); // Map from position to index for O(1) lookup

  const walk = (node: PmNode | null, basePos: number) => {
    if (!node) return;
    if (node.type?.name === 'run') {
      node.forEach((child, offset) => {
        const childPos = basePos + offset + 1;
        walk(child as PmNode, childPos);
      });
      return;
    }
    const pos = basePos - 1;
    const index = entries.length;
    entries.push({ node, pos });
    positionMap.set(pos, index); // Store position -> index mapping
  };

  paragraph.forEach((child, offset) => {
    const childPos = paragraphStartPos + offset + 1;
    walk(child as PmNode, childPos);
  });

  return { entries, positionMap };
}

export function findNextTabIndex(flattened: ParagraphEntry[], fromIndex: number) {
  for (let i = fromIndex; i < flattened.length; i++) {
    if (flattened[i]?.node?.type?.name === 'tab') {
      return i;
    }
  }
  return -1;
}

export function findDecimalBreakPos(flattened: ParagraphEntry[], startIndex: number, breakChar: string | null) {
  if (!breakChar) return null;
  for (let i = startIndex; i < flattened.length; i++) {
    const entry = flattened[i];
    if (!entry) break;
    if (entry.node.type?.name === 'tab') break;
    if (entry.node.type?.name === 'text') {
      const index = entry.node.text?.indexOf(breakChar);
      if (index !== undefined && index !== -1) {
        return entry.pos + index + 1;
      }
    }
  }
  return null;
}

export function measureRangeWidth(
  view: EditorView,
  from: number,
  to: number,
  coordCache: CoordCache | null = null,
  domPosCache: DomPosCache | null = null,
): number {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  try {
    const range = document.createRange();
    const fromRef = getCachedDomAtPos(view, from, domPosCache);
    const toRef = getCachedDomAtPos(view, to, domPosCache);
    range.setStart(fromRef.node, fromRef.offset);
    range.setEnd(toRef.node, toRef.offset);
    const rect = range.getBoundingClientRect();
    range.detach?.();
    return rect.width || 0;
  } catch {
    const startLeft = getLeftCoord(view, from, coordCache, domPosCache);
    const endLeft = getLeftCoord(view, to, coordCache, domPosCache);
    if (startLeft == null || endLeft == null) return 0;
    return Math.max(0, endLeft - startLeft);
  }
}

export function getIndentWidth(
  view: EditorView,
  paragraphStartPos: number,
  indentAttrs: IndentAttrs = {},
  coordCache: CoordCache | null = null,
  domPosCache: DomPosCache | null = null,
): number {
  const marginLeft = getLeftCoord(view, paragraphStartPos, coordCache, domPosCache);
  const lineLeft = getLeftCoord(view, paragraphStartPos + 1, coordCache, domPosCache);
  if (marginLeft != null && lineLeft != null) {
    const diff = lineLeft - marginLeft;
    if (!Number.isNaN(diff) && Math.abs(diff) > 0.5) {
      return diff;
    }
  }
  return calculateIndentFallback(indentAttrs);
}

export function getBlockNodeWidth(view: EditorView, blockStartPos: number) {
  const blockDom = view.nodeDOM(blockStartPos - 1);
  // Calculate full width including margins, paddings, borders
  if (blockDom instanceof HTMLElement) {
    const styles = window.getComputedStyle(blockDom);
    const width =
      blockDom.clientWidth +
      parseFloat(styles.marginLeft || '0') +
      parseFloat(styles.marginRight || '0') +
      parseFloat(styles.borderLeftWidth || '0') +
      parseFloat(styles.borderRightWidth || '0') +
      parseFloat(styles.paddingLeft || '0') +
      parseFloat(styles.paddingRight || '0');
    return width;
  }
  return defaultLineLength;
}

export function calculateIndentFallback(indentAttrs: IndentAttrs = {}) {
  if (!indentAttrs) return 0;

  const left = twipsToPixels(Number(indentAttrs.left) || 0);
  const firstLine = twipsToPixels(Number(indentAttrs.firstLine) || 0);
  const hanging = twipsToPixels(Number(indentAttrs.hanging) || 0);

  let textIndent = 0;
  if (firstLine && hanging) {
    textIndent = firstLine - hanging;
  } else if (firstLine) {
    textIndent = firstLine;
  } else if (hanging) {
    textIndent = -hanging;
  }

  if (textIndent) return left + textIndent;
  if (left) return left;
  return 0;
}

export function getLeftCoord(
  view: EditorView,
  pos: number,
  coordCache: CoordCache | null = null,
  domPosCache: DomPosCache | null = null,
): number | null {
  if (!Number.isFinite(pos)) return null;

  // Check cache first
  if (coordCache && coordCache.has(pos)) {
    return coordCache.get(pos) ?? null;
  }

  let result: number | null = null;
  try {
    result = view.coordsAtPos(pos).left;
  } catch {
    try {
      const ref = getCachedDomAtPos(view, pos, domPosCache);
      const range = document.createRange();
      range.setStart(ref.node, ref.offset);
      range.setEnd(ref.node, ref.offset);
      const rect = range.getBoundingClientRect();
      range.detach?.();
      result = rect.left;
    } catch {
      result = null;
    }
  }

  // Store in cache if available
  if (coordCache) {
    coordCache.set(pos, result);
  }

  return result;
}

export function getCachedDomAtPos(
  view: EditorView,
  pos: number,
  domPosCache: DomPosCache | null = null,
): { node: Node; offset: number } {
  if (domPosCache && domPosCache.has(pos)) {
    return domPosCache.get(pos)!;
  }

  const result = view.domAtPos(pos);

  if (domPosCache) {
    domPosCache.set(pos, result);
  }

  return result;
}

export function calcTabHeight(blockParent: PmNode) {
  const ptToPxRatio = 1.333;
  const defaultFontSize = 16;
  const defaultLineHeight = 1.1;

  const parentTextStyleMark = blockParent.firstChild?.marks?.find((mark) => mark.type.name === 'textStyle');

  const fontSize = parseInt(parentTextStyleMark?.attrs.fontSize) * ptToPxRatio || defaultFontSize;

  return `${fontSize * defaultLineHeight}px`;
}
