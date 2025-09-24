import { LinkedStylesPluginKey } from '../../linked-styles/index.js';
import { getMarkType } from '@core/helpers/index.js';
import { parseSizeUnit } from '@core/utilities/index.js';

/**
 * Collect textStyle marks within a list item node.
 * @param {Node} listItem
 * @param {MarkType} markType
 * @returns {{ marks: Array, attrs: { lineHeight?: string } }}
 */
export function collectTextStyleMarks(listItem, markType) {
  const textStyleMarks = [];
  const seenMarks = new Set();
  const attrs = {};

  if (!markType) {
    return {
      marks: textStyleMarks,
      attrs,
    };
  }

  const collectMarks = (node) => {
    if (!node) return;

    const candidateMarks = Array.isArray(node.marks) ? node.marks : [];
    if (candidateMarks.length && typeof markType.isInSet === 'function' && markType.isInSet(candidateMarks)) {
      candidateMarks.forEach((mark) => {
        if (mark.type === markType && !seenMarks.has(mark)) {
          seenMarks.add(mark);
          textStyleMarks.push(mark);
        }
      });
    }

    if (!node.isText && node.childCount) {
      node.forEach((child) => collectMarks(child));
    }
  };

  listItem.forEach((childNode) => {
    if (childNode.type?.name !== 'paragraph') return;
    if (childNode.attrs?.lineHeight !== undefined) {
      attrs.lineHeight = childNode.attrs.lineHeight;
    }
    collectMarks(childNode);
  });

  return {
    marks: textStyleMarks,
    attrs,
  };
}

export function parseSizeFromRunProperties(listRunProperties) {
  const val = listRunProperties?.['w:val'] || listRunProperties?.['w:sz'];
  if (val == null) return null;
  const numeric = Number(val);
  if (Number.isNaN(numeric) || numeric <= 0) return null;
  const sizeInPoints = numeric / 2;
  return `${sizeInPoints}pt`;
}

export function parseFontFamilyFromRunProperties(listRunProperties) {
  const ascii = listRunProperties?.['w:ascii'];
  const hAnsi = listRunProperties?.['w:hAnsi'];
  const eastAsia = listRunProperties?.['w:eastAsia'];
  return ascii || hAnsi || eastAsia || null;
}

export function readNodeViewStyles(view) {
  const fallback = { fontSize: null, fontFamily: null, lineHeight: null };
  if (!view?.dom) return fallback;

  const inline = {
    fontSize: view.dom.style?.fontSize || null,
    fontFamily: view.dom.style?.fontFamily || null,
    lineHeight: view.dom.style?.lineHeight || null,
  };

  if (inline.fontSize && inline.fontFamily && inline.lineHeight) return inline;

  const globalWindow = typeof window !== 'undefined' ? window : undefined;
  if (globalWindow?.getComputedStyle) {
    const computed = globalWindow.getComputedStyle(view.dom);
    return {
      fontSize: inline.fontSize || computed.fontSize,
      fontFamily: inline.fontFamily || computed.fontFamily,
      lineHeight: inline.lineHeight || computed.lineHeight,
    };
  }

  return inline;
}

export function getAdjacentListItemNodeView({ nodeView, pos, direction, activeNodeViews }) {
  if (!activeNodeViews) return null;
  let candidate = null;
  activeNodeViews.forEach((view) => {
    if (view === nodeView) return;
    let viewPos;
    try {
      viewPos = view.getPos();
    } catch {
      return;
    }
    if (typeof viewPos !== 'number') return;

    if (direction < 0 && viewPos < pos) {
      if (!candidate || viewPos > candidate.pos) candidate = { view, pos: viewPos };
    } else if (direction > 0 && viewPos > pos) {
      if (!candidate || viewPos < candidate.pos) candidate = { view, pos: viewPos };
    }
  });

  return candidate?.view ?? null;
}

export function findSiblingListItem({ editor, pos, direction }) {
  if (typeof pos !== 'number' || !editor?.view) return null;

  const { state } = editor.view;
  const $pos = state.doc.resolve(pos);
  const parentDepth = $pos.depth - 1;
  if (parentDepth < 0) return null;

  const parent = $pos.node(parentDepth);
  if (!parent) return null;

  const indexInsideParent = $pos.index(parentDepth);
  const siblingIndex = indexInsideParent + direction;
  if (siblingIndex < 0 || siblingIndex >= parent.childCount) return null;

  const sibling = parent.child(siblingIndex);
  return sibling?.type?.name === 'listItem' ? sibling : null;
}

export function deriveFontStylesFromNode({ node, textStyleType, defaultFont, defaultSize, listRunProperties }) {
  const { marks: allMarks, attrs } = collectTextStyleMarks(node, textStyleType);
  const styleMarks = textStyleType ? allMarks.filter((m) => m.type === textStyleType) : [];
  const sizeMark = styleMarks.find((m) => m.attrs?.fontSize);
  const familyMark = styleMarks.find((m) => m.attrs?.fontFamily);

  let fontSize = defaultSize;
  if (sizeMark) {
    const [value, unit = 'pt'] = parseSizeUnit(sizeMark.attrs.fontSize);
    if (!Number.isNaN(value)) {
      fontSize = `${value}${unit}`;
    }
  }
  let hasSize = Boolean(sizeMark);

  if (!hasSize && listRunProperties) {
    const sizeFromList = parseSizeFromRunProperties(listRunProperties);
    if (sizeFromList) {
      fontSize = sizeFromList;
      hasSize = true;
    }
  }

  let fontFamily = familyMark?.attrs?.fontFamily ?? defaultFont;
  let hasFamily = Boolean(familyMark);

  if (!hasFamily && listRunProperties) {
    const fontFromList = parseFontFamilyFromRunProperties(listRunProperties);
    if (fontFromList) {
      fontFamily = fontFromList;
      hasFamily = true;
    }
  }

  let lineHeight = attrs.lineHeight;

  const firstChild = node.firstChild;
  const hasOnlyOnePar = node.childCount === 1 && firstChild?.type?.name === 'paragraph';
  if (hasOnlyOnePar) {
    const par = firstChild;
    const parFirstChild = par?.firstChild;
    if (par?.childCount === 1 && parFirstChild?.type?.name === 'fieldAnnotation') {
      const aFontSize = parFirstChild.attrs?.fontSize;
      const aFontFamily = parFirstChild.attrs?.fontFamily;
      if (!sizeMark && aFontSize) fontSize = aFontSize;
      if (!familyMark && aFontFamily) fontFamily = aFontFamily;
    }
  }

  return {
    fontSize,
    fontFamily,
    lineHeight,
    hasSize,
    hasFamily,
  };
}

export function getStylesFromLinkedStyles({ node, pos, editor }) {
  const { state } = editor.view;
  const linkedStyles = LinkedStylesPluginKey.getState(state)?.decorations;
  const decorationsInPlace = linkedStyles?.find(pos, pos + node.nodeSize);

  const predicates = [
    (style) => style.includes('font-size') && style.includes('font-family'),
    (style) => style.includes('font-size'),
    (style) => style.includes('font-family'),
  ];

  let styleDeco;
  for (const predicateFn of predicates) {
    styleDeco = decorationsInPlace?.find((dec) => {
      const style = dec.type?.attrs?.style || '';
      return style && predicateFn(style);
    });
    if (styleDeco) break;
  }

  const style = styleDeco?.type?.attrs?.style;
  const stylesArray = style?.split(';') || [];

  const fontSizeFromStyles = stylesArray
    .find((s) => s.includes('font-size'))
    ?.split(':')[1]
    ?.trim();
  const fontFamilyFromStyles = stylesArray
    .find((s) => s.includes('font-family'))
    ?.split(':')[1]
    ?.trim();

  return {
    font: fontFamilyFromStyles,
    size: fontSizeFromStyles,
  };
}

export function resolveListItemTypography({ node, pos, editor, nodeView, activeNodeViews }) {
  const defaults = getStylesFromLinkedStyles({ node, pos, editor });
  const textStyleType = getMarkType('textStyle', editor.schema);

  const currentStyles = deriveFontStylesFromNode({
    node,
    textStyleType,
    defaultFont: defaults.font,
    defaultSize: defaults.size,
    listRunProperties: node.attrs?.listRunProperties,
  });

  if ((!currentStyles.hasSize || !currentStyles.hasFamily || !currentStyles.lineHeight) && editor?.view) {
    const previousListItem = findSiblingListItem({ editor, pos, direction: -1 });
    if (previousListItem) {
      const previousStyles = deriveFontStylesFromNode({
        node: previousListItem,
        textStyleType,
        defaultFont: defaults.font,
        defaultSize: defaults.size,
        listRunProperties: previousListItem.attrs?.listRunProperties,
      });

      if (!currentStyles.hasSize && previousStyles.fontSize) currentStyles.fontSize = previousStyles.fontSize;
      if (!currentStyles.hasFamily && previousStyles.fontFamily) currentStyles.fontFamily = previousStyles.fontFamily;
      if (!currentStyles.lineHeight && previousStyles.lineHeight) currentStyles.lineHeight = previousStyles.lineHeight;
    }
  }

  if ((!currentStyles.fontSize || !currentStyles.fontFamily || !currentStyles.lineHeight) && nodeView) {
    const previousView = getAdjacentListItemNodeView({
      nodeView,
      pos,
      direction: -1,
      activeNodeViews,
    });
    if (previousView) {
      const {
        fontSize: prevSize,
        fontFamily: prevFamily,
        lineHeight: prevLineHeight,
      } = readNodeViewStyles(previousView);
      if (!currentStyles.fontSize && prevSize) currentStyles.fontSize = prevSize;
      if (!currentStyles.fontFamily && prevFamily) currentStyles.fontFamily = prevFamily;
      if (!currentStyles.lineHeight && prevLineHeight) currentStyles.lineHeight = prevLineHeight;
    }
  }

  return {
    fontSize: currentStyles.fontSize,
    fontFamily: currentStyles.fontFamily,
    lineHeight: currentStyles.lineHeight,
  };
}
