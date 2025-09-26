import { Decoration } from 'prosemirror-view';

export const defaultTabDistance = 48;
export const defaultLineLength = 816;

export const getTabDecorations = (doc, view, helpers, from = 0, to = null) => {
  const decorations = [];
  const paragraphCache = new Map();

  const end = to ?? doc.content.size;

  doc.nodesBetween(from, end, (node, pos) => {
    if (node.type.name !== 'tab') return;

    let extraStyles = '';
    const $pos = doc.resolve(pos);
    const paragraphContext = getParagraphContext($pos, paragraphCache, helpers);
    if (!paragraphContext) return;

    try {
      const { tabStops, flattened, startPos } = paragraphContext;
      const entryIndex = flattened.findIndex((entry) => entry.pos === pos);
      if (entryIndex === -1) return;

      const indentWidth = getIndentWidth(view, startPos, paragraphContext.indent);
      const accumulatedTabWidth = paragraphContext.accumulatedTabWidth || 0;
      const currentWidth = indentWidth + measureRangeWidth(view, startPos + 1, pos) + accumulatedTabWidth;

      let tabWidth;
      if (tabStops.length) {
        const tabStop = tabStops.find((stop) => stop.pos > currentWidth && stop.val !== 'clear');
        if (tabStop) {
          tabWidth = tabStop.pos - currentWidth;

          if (tabStop.val === 'center' || tabStop.val === 'end' || tabStop.val === 'right') {
            const nextTabIndex = findNextTabIndex(flattened, entryIndex + 1);
            const segmentStartPos = pos + node.nodeSize;
            const segmentEndPos =
              nextTabIndex === -1 ? startPos + paragraphContext.paragraph.nodeSize - 1 : flattened[nextTabIndex].pos;
            const segmentWidth = measureRangeWidth(view, segmentStartPos, segmentEndPos);
            tabWidth -= tabStop.val === 'center' ? segmentWidth / 2 : segmentWidth;
          } else if (tabStop.val === 'decimal' || tabStop.val === 'num') {
            const breakChar = tabStop.decimalChar || '.';
            const decimalPos = findDecimalBreakPos(flattened, entryIndex + 1, breakChar);
            const integralWidth = decimalPos
              ? measureRangeWidth(view, pos + node.nodeSize, decimalPos)
              : measureRangeWidth(view, pos + node.nodeSize, startPos + paragraphContext.paragraph.nodeSize - 1);
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

      const tabHeight = calcTabHeight($pos);

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
          tabStops = node.attrs.tabStops;
        } else {
          const style = helpers.linkedStyles.getStyleById(node.attrs?.styleId);
          if (Array.isArray(style?.definition?.styles?.tabStops)) {
            tabStops = style.definition.styles.tabStops;
          }
        }
        cache.set(startPos, {
          paragraph: node,
          paragraphDepth: depth,
          startPos,
          indent: node.attrs?.indent || {},
          tabStops: tabStops,
          flattened: flattenParagraph(node, startPos),
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

  const walk = (node, basePos) => {
    if (!node) return;
    if (node.type?.name === 'run') {
      node.forEach((child, offset) => {
        const childPos = basePos + offset + 1;
        walk(child, childPos);
      });
      return;
    }
    entries.push({ node, pos: basePos - 1 });
  };

  paragraph.forEach((child, offset) => {
    const childPos = paragraphStartPos + offset + 1;
    walk(child, childPos);
  });

  return entries;
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

export function measureRangeWidth(view, from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  try {
    const range = document.createRange();
    const fromRef = view.domAtPos(from);
    const toRef = view.domAtPos(to);
    range.setStart(fromRef.node, fromRef.offset);
    range.setEnd(toRef.node, toRef.offset);
    const rect = range.getBoundingClientRect();
    range.detach?.();
    return rect.width || 0;
  } catch {
    const startLeft = getLeftCoord(view, from);
    const endLeft = getLeftCoord(view, to);
    if (startLeft == null || endLeft == null) return 0;
    return Math.max(0, endLeft - startLeft);
  }
}

export function getIndentWidth(view, paragraphStartPos, indentAttrs = {}) {
  const marginLeft = getLeftCoord(view, paragraphStartPos);
  const lineLeft = getLeftCoord(view, paragraphStartPos + 1);
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

  const left = Number(indentAttrs.left) || 0;
  const firstLine = Number(indentAttrs.firstLine) || 0;
  const hanging = Number(indentAttrs.hanging) || 0;

  let textIndent = 0;
  if (firstLine && hanging) {
    textIndent = firstLine - hanging;
  } else if (firstLine) {
    textIndent = firstLine;
  } else if (hanging) {
    textIndent = -hanging;
  } else if (typeof indentAttrs.textIndent === 'string') {
    const match = indentAttrs.textIndent.match(/(-?\d*\.?\d+)in$/);
    if (match) {
      textIndent = Number(match[1]) * 96;
    }
  }

  if (textIndent) return left + textIndent;
  if (left) return left;
  return 0;
}

export function getLeftCoord(view, pos) {
  if (!Number.isFinite(pos)) return null;
  try {
    return view.coordsAtPos(pos).left;
  } catch {
    try {
      const ref = view.domAtPos(pos);
      const range = document.createRange();
      range.setStart(ref.node, ref.offset);
      range.setEnd(ref.node, ref.offset);
      const rect = range.getBoundingClientRect();
      range.detach?.();
      return rect.left;
    } catch {
      return null;
    }
  }
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
