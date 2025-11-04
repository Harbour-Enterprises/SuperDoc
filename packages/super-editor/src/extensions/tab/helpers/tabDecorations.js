import { Decoration } from 'prosemirror-view';
import { twipsToPixels } from '@converter/helpers.js';

export const defaultTabDistance = 48;
export const defaultLineLength = 816;

export const getTabDecorations = (doc, view, helpers, from = 0, to = null) => {
  const decorations = [];
  const paragraphCache = new Map();
  const coordCache = new Map();
  const domPosCache = new Map();

  const end = to ?? doc.content.size;

  doc.nodesBetween(from, end, (node, pos) => {
    if (node.type.name !== 'tab') return;

    let extraStyles = '';
    const $pos = doc.resolve(pos);
    const paragraphContext = getParagraphContext($pos, paragraphCache, helpers);
    if (!paragraphContext) return;

    try {
      const { tabStops, flattened, positionMap, startPos } = paragraphContext;
      // Use O(1) map lookup instead of O(n) findIndex
      const entryIndex = positionMap.get(pos);
      if (entryIndex === undefined) return;

      // Cache paragraph-level computed values (computed once per paragraph, not per tab)
      if (paragraphContext.indentWidth === undefined) {
        paragraphContext.indentWidth = getIndentWidth(view, startPos, paragraphContext.indent, coordCache, domPosCache);
      }
      if (paragraphContext.tabHeight === undefined) {
        paragraphContext.tabHeight = calcTabHeight($pos);
      }

      const indentWidth = paragraphContext.indentWidth;
      const accumulatedTabWidth = paragraphContext.accumulatedTabWidth || 0;
      const currentWidth =
        indentWidth + measureRangeWidth(view, startPos + 1, pos, coordCache, domPosCache) + accumulatedTabWidth;

      let tabWidth;
      if (tabStops.length) {
        const tabStop = tabStops.find((stop) => stop.pos > currentWidth && stop.val !== 'clear');
        if (tabStop) {
          tabWidth = tabStop.pos - currentWidth;
          let val = tabStop.val;
          const aliases = { left: 'start', right: 'end' };
          if (aliases[val]) val = aliases[val];

          if (val === 'center' || val === 'end' || val === 'right') {
            const nextTabIndex = findNextTabIndex(flattened, entryIndex + 1);
            const segmentStartPos = pos + node.nodeSize;
            const segmentEndPos =
              nextTabIndex === -1 ? startPos + paragraphContext.paragraph.nodeSize - 1 : flattened[nextTabIndex].pos;
            const segmentWidth = measureRangeWidth(view, segmentStartPos, segmentEndPos, coordCache, domPosCache);
            tabWidth -= val === 'center' ? segmentWidth / 2 : segmentWidth;
          } else if (val === 'decimal' || val === 'num') {
            const breakChar = tabStop.decimalChar || '.';
            const decimalPos = findDecimalBreakPos(flattened, entryIndex + 1, breakChar);
            const integralWidth = decimalPos
              ? measureRangeWidth(view, pos + node.nodeSize, decimalPos, coordCache, domPosCache)
              : measureRangeWidth(
                  view,
                  pos + node.nodeSize,
                  startPos + paragraphContext.paragraph.nodeSize - 1,
                  coordCache,
                  domPosCache,
                );
            tabWidth -= integralWidth;
          }

          if (tabStop.leader) {
            const leaderStyles = {
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
      const tabHeight = paragraphContext.tabHeight;

      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          style: `width: ${tabWidth}px; height: ${tabHeight};${extraStyles}`,
        }),
      );

      paragraphContext.accumulatedTabWidth = accumulatedTabWidth + tabWidth;
    } catch (error) {
      console.error('tab decoration error', error);
    }
  });

  return decorations;
};

export function getParagraphContext($pos, cache, helpers) {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node?.type?.name === 'paragraph') {
      const startPos = $pos.start(depth);
      if (!cache.has(startPos)) {
        let tabStops = [];
        if (Array.isArray(node.attrs?.tabStops)) {
          tabStops = node.attrs.tabStops
            .map((stop) => {
              const ref = stop?.tab;
              if (!ref) return stop || null;
              return {
                val: ref.tabType || 'start',
                pos: twipsToPixels(Number(ref.pos) || 0),
                leader: ref.leader,
              };
            })
            .filter(Boolean);
        } else {
          const style = helpers.linkedStyles.getStyleById(node.attrs?.styleId);
          if (Array.isArray(style?.definition?.styles?.tabStops)) {
            tabStops = style.definition.styles.tabStops;
          }
        }
        const { entries, positionMap } = flattenParagraph(node, startPos);
        cache.set(startPos, {
          paragraph: node,
          paragraphDepth: depth,
          startPos,
          indent: node.attrs?.indent || {},
          tabStops: tabStops,
          flattened: entries,
          positionMap: positionMap, // Store position map for O(1) lookups
          accumulatedTabWidth: 0,
        });
      }
      return cache.get(startPos);
    }
  }
  return null;
}

export function flattenParagraph(paragraph, paragraphStartPos) {
  const entries = [];
  const positionMap = new Map(); // Map from position to index for O(1) lookup

  const walk = (node, basePos) => {
    if (!node) return;
    if (node.type?.name === 'run') {
      node.forEach((child, offset) => {
        const childPos = basePos + offset + 1;
        walk(child, childPos);
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
    walk(child, childPos);
  });

  return { entries, positionMap };
}

export function findNextTabIndex(flattened, fromIndex) {
  for (let i = fromIndex; i < flattened.length; i++) {
    if (flattened[i]?.node?.type?.name === 'tab') {
      return i;
    }
  }
  return -1;
}

export function findDecimalBreakPos(flattened, startIndex, breakChar) {
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

export function measureRangeWidth(view, from, to, coordCache = null, domPosCache = null) {
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

export function getIndentWidth(view, paragraphStartPos, indentAttrs = {}, coordCache = null, domPosCache = null) {
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

export function calculateIndentFallback(indentAttrs = {}) {
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

export function getLeftCoord(view, pos, coordCache = null, domPosCache = null) {
  if (!Number.isFinite(pos)) return null;

  // Check cache first
  if (coordCache && coordCache.has(pos)) {
    return coordCache.get(pos);
  }

  let result = null;
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

export function getCachedDomAtPos(view, pos, domPosCache = null) {
  if (domPosCache && domPosCache.has(pos)) {
    return domPosCache.get(pos);
  }

  const result = view.domAtPos(pos);

  if (domPosCache) {
    domPosCache.set(pos, result);
  }

  return result;
}

export function calcTabHeight(pos) {
  const ptToPxRatio = 1.333;
  const defaultFontSize = 16;
  const defaultLineHeight = 1.1;

  const blockParent = pos.node(1);
  const parentTextStyleMark = blockParent.firstChild.marks.find((mark) => mark.type.name === 'textStyle');

  const fontSize = parseInt(parentTextStyleMark?.attrs.fontSize) * ptToPxRatio || defaultFontSize;

  return `${fontSize * defaultLineHeight}px`;
}
