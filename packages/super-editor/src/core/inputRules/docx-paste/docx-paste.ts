import type { EditorView } from 'prosemirror-view';
import { DOMParser, Fragment } from 'prosemirror-model';
import type { Node as PmNode } from 'prosemirror-model';
import type { Editor } from '../../Editor.js';
import { cleanHtmlUnnecessaryTags, convertEmToPt, handleHtmlPaste } from '../../InputRule.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import {
  extractListLevelStyles,
  extractParagraphStyles,
  numDefByTypeMap,
  numDefMap,
  startHelperMap,
  resolveStyles,
} from '@helpers/pasteListHelpers.js';
import { normalizeLvlTextChar } from '@superdoc/common/list-numbering';
import { pointsToTwips } from '@converter/helpers';
import { decodeRPrFromMarks } from '@converter/styles.js';

interface StartMap {
  [key: string]: string | number;
}

/**
 * Main handler for pasted DOCX content.
 *
 * @param html The string being pasted
 * @param editor The SuperEditor instance
 * @param view The ProseMirror view
 * @returns
 */
export const handleDocxPaste = (html: string, editor: Editor, view: EditorView): boolean => {
  const { converter } = editor;
  if (!converter || !converter.convertedXml) return handleHtmlPaste(html, editor);

  let cleanedHtml = convertEmToPt(html);
  cleanedHtml = cleanHtmlUnnecessaryTags(cleanedHtml);

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanedHtml;

  const data = tempDiv.querySelectorAll('p, li, ' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `h${n}`).join(', '));

  const startMap: StartMap = {};

  data.forEach((item) => {
    const element = item as HTMLElement;
    let type: 'listItem' | 'p';
    if (element.localName === 'li') {
      type = 'listItem';
    } else {
      type = 'p';
    }

    const styleAttr = element.getAttribute('style') || '';
    const msoListMatch = styleAttr.match(/mso-list:\s*l(\d+)\s+level(\d+)\s+lfo(\d+)/);
    const styleElement = tempDiv.querySelector('style');
    const css = styleElement?.innerHTML || '';
    const normalStyles = extractParagraphStyles(css, '.MsoNormal');
    let styleId: string | null = element.getAttribute('class');
    let charStyles: Record<string, string> | null = {};
    if (element.localName.startsWith('h') && !styleId) {
      styleId = element.localName;
      const level = styleId.substring(1);
      charStyles = extractParagraphStyles(css, `.Heading${level}Char`);
    } else if (styleId) {
      styleId = `.${styleId}`;
    }
    const paragraphStyles = extractParagraphStyles(css, styleId);
    let styleChain = { ...normalStyles, ...paragraphStyles, ...charStyles };
    const numberingDefinedInline = !paragraphStyles || !paragraphStyles['mso-list'];

    if (msoListMatch) {
      const [, abstractId, level, numId] = msoListMatch;
      const numberingStyles = extractListLevelStyles(css, abstractId, level, numId) || {};
      const markerFontFamily = numberingStyles?.['font-family'] ?? normalStyles?.['font-family'];
      delete numberingStyles['font-family'];
      if (numberingDefinedInline) {
        styleChain = { ...normalStyles, ...paragraphStyles, ...numberingStyles };
      } else {
        styleChain = { ...normalStyles, ...numberingStyles, ...paragraphStyles };
      }
      let start: string | number | undefined;
      let numFmt: string | undefined;
      let lvlText: string;

      if (type === 'listItem') {
        const parentElement = element.parentNode as HTMLElement | null;
        const listType = parentElement?.getAttribute('type');
        const startAttr = parentElement?.getAttribute('start');
        if (!startMap[numId]) startMap[numId] = startAttr || '1';
        start = startMap[numId];
        numFmt = numDefByTypeMap.get(listType || '');
        lvlText = `%${level}.`;
      } else {
        // Get numbering format from Word styles
        const msoNumFormat = numberingStyles['mso-level-number-format'] || 'decimal';
        numFmt = numDefMap.get(msoNumFormat);
        const punc = element.innerText?.match(/^\s*[a-zA-Z0-9]+([.()])/i)?.[1] || '.';
        lvlText =
          numFmt === 'bullet' ? normalizeLvlTextChar(numberingStyles['mso-level-text']) || '' : `%${level}${punc}`;

        const startGetter = startHelperMap.get(numFmt || '');
        if (!startMap[numId]) {
          const result = startGetter?.(element.children[0]?.innerHTML || '1');
          startMap[numId] = typeof result === 'string' || typeof result === 'number' ? result : '1';
        }
        start = startMap[numId];
      }

      element.setAttribute('data-marker-font-family', markerFontFamily || '');
      element.setAttribute('data-num-id', numId);
      element.setAttribute('data-list-level', String(parseInt(level, 10) - 1));
      element.setAttribute('data-start', String(start));
      element.setAttribute('data-lvl-text', lvlText);
      element.setAttribute('data-num-fmt', numFmt || '');
    }

    // Handle paragraph properties
    const resolvedStyle = resolveStyles(styleChain, element.getAttribute('style'));

    //   Indentation
    const left = pointsToTwips(parseInt(resolvedStyle['margin-left'] ?? '0', 10));
    const hangingFirstLine = pointsToTwips(parseInt(resolvedStyle['text-indent'] ?? '0', 10));
    let hanging: number | undefined;
    let firstLine: number | undefined;
    if (hangingFirstLine < 0) {
      hanging = Math.abs(hangingFirstLine);
    } else {
      firstLine = hangingFirstLine;
    }

    if (left || hanging || firstLine) {
      const indent: Record<string, number> = {};
      if (left != null) indent.left = left;
      if (hanging != null) indent.hanging = hanging;
      if (firstLine != null) indent.firstLine = firstLine;
      element.setAttribute('data-indent', JSON.stringify(indent));
    }

    //  Spacing
    const after = pointsToTwips(parseInt(resolvedStyle['margin-bottom'] ?? '0', 10));
    const before = pointsToTwips(parseInt(resolvedStyle['margin-top'] ?? '0', 10));
    if (after || before) {
      const spacing: Record<string, number> = {};
      if (after != null) spacing.after = after;
      if (before != null) spacing.before = before;
      element.setAttribute('data-spacing', JSON.stringify(spacing));
    }

    //   Text styles
    const textStyles: Record<string, string> = {};

    if (resolvedStyle['font-size']) {
      textStyles['font-size'] = resolvedStyle['font-size'];
    }
    if (resolvedStyle['font-family']) {
      textStyles['font-family'] = resolvedStyle['font-family'];
    }
    if (resolvedStyle['text-transform']) {
      textStyles['text-transform'] = resolvedStyle['text-transform'];
    }
    if (Object.keys(textStyles).length) {
      Object.keys(textStyles).forEach((key) => {
        const styleValue = textStyles[key];
        if (styleValue) {
          (element.style as unknown as Record<string, string>)[key] = styleValue;
        }
      });
      element.setAttribute('data-text-styles', JSON.stringify(textStyles));

      for (const child of Array.from(element.children)) {
        if ((child as HTMLElement).style) {
          Object.keys(textStyles).forEach((key) => {
            const styleValue = textStyles[key];
            if (styleValue) {
              ((child as HTMLElement).style as unknown as Record<string, string>)[key] = styleValue;
            }
          });
        }
      }
    }

    // Marks
    if (resolvedStyle['font-weight'] === 'bold') {
      element.style.fontWeight = 'bold';
      for (const child of Array.from(element.children)) {
        if ((child as HTMLElement).style) {
          (child as HTMLElement).style.fontWeight = 'bold';
        }
      }
    }

    // Strip literal prefix inside conditional span
    extractAndRemoveConditionalPrefix(element);
  });

  transformWordLists(tempDiv, editor);
  let doc = DOMParser.fromSchema(editor.schema).parse(tempDiv);
  doc = wrapTextsInRuns(doc);

  tempDiv.remove();

  const { dispatch } = editor.view;
  if (!dispatch) return false;

  dispatch(view.state.tr.replaceSelectionWith(doc, true));
  return true;
};

export const wrapTextsInRuns = (doc: PmNode): PmNode => {
  const runType = doc.type?.schema?.nodes?.run;
  if (!runType) return doc;

  const wrapNode = (node: PmNode, parent: PmNode | null): PmNode => {
    if (node.isText) {
      if (parent?.type?.name === 'run') return node;
      const runProperties = decodeRPrFromMarks(node.marks);
      return runType.create({ runProperties }, [node]);
    }

    if (!node.childCount) return node;

    let changed = false;
    const wrappedChildren: PmNode[] = [];
    node.forEach((child) => {
      const wrappedChild = wrapNode(child, node);
      if (wrappedChild !== child) changed = true;
      wrappedChildren.push(wrappedChild);
    });

    if (!changed) return node;

    return node.copy(Fragment.fromArray(wrappedChildren));
  };

  return wrapNode(doc, null);
};

interface ListLevels {
  [key: number]: number;
}

interface ListInfo {
  levels: ListLevels;
}

interface ListsMap {
  [key: string]: ListInfo;
}

interface MappedLists {
  [key: string]: string;
}

const transformWordLists = (container: HTMLElement, editor: Editor): void => {
  const listItems = Array.from(container.querySelectorAll('[data-num-id]'));

  const lists: ListsMap = {};
  const mappedLists: MappedLists = {};

  for (const item of listItems) {
    const element = item as HTMLElement;
    const level = parseInt(element.getAttribute('data-list-level') || '0', 10);
    const numFmt = element.getAttribute('data-num-fmt');
    const start = element.getAttribute('data-start');
    const lvlText = element.getAttribute('data-lvl-text');
    const markerFontFamily = element.getAttribute('data-marker-font-family') || undefined;

    // MS Word copy-pasted lists always start with num Id 1 and increment from there.
    // Which way not match the target documents numbering.xml lists
    // We will generate new definitions for all pasted lists
    // But keep track of a map of original ID to new ID so that we can keep lists together
    const importedId = element.getAttribute('data-num-id');
    if (!importedId) continue;
    if (!mappedLists[importedId]) mappedLists[importedId] = String(ListHelpers.getNewListId(editor));
    const id = mappedLists[importedId];
    const listType = numFmt === 'bullet' ? 'bulletList' : 'orderedList';
    ListHelpers.generateNewListDefinition({
      numId: parseInt(id, 10),
      listType,
      level: level,
      start: parseInt(start || '1', 10),
      fmt: numFmt || '',
      text: lvlText || '',
      editor,
      markerFontFamily,
    });

    if (!lists[id]) lists[id] = { levels: {} };
    const currentListByNumId = lists[id];

    if (!currentListByNumId.levels[level]) currentListByNumId.levels[level] = Number(start) || 1;
    else currentListByNumId.levels[level]++;

    // Reset deeper levels when this level is updated
    Object.keys(currentListByNumId.levels).forEach((key) => {
      const level1 = Number(key);
      if (level1 > level) {
        delete currentListByNumId.levels[level1];
      }
    });

    const path = generateListPath(level, currentListByNumId.levels, start || '1');
    if (!path.length) path.push(currentListByNumId.levels[level]);

    const pElement = document.createElement('p');
    pElement.innerHTML = element.innerHTML;
    pElement.setAttribute('data-num-id', id);
    pElement.setAttribute('data-list-level', JSON.stringify(path));
    pElement.setAttribute('data-level', String(level));
    pElement.setAttribute('data-lvl-text', lvlText || '');
    pElement.setAttribute('data-num-fmt', numFmt || '');

    if (element.hasAttribute('data-indent')) {
      pElement.setAttribute('data-indent', element.getAttribute('data-indent') || '');
    }
    if (element.hasAttribute('data-spacing')) {
      pElement.setAttribute('data-spacing', element.getAttribute('data-spacing') || '');
    }
    if (element.hasAttribute('data-text-styles')) {
      const textStyles = JSON.parse(element.getAttribute('data-text-styles') || '{}');
      Object.keys(textStyles).forEach((key) => {
        const styleValue = textStyles[key];
        if (styleValue) {
          (pElement.style as unknown as Record<string, string>)[key] = styleValue;
          for (const child of Array.from(pElement.children)) {
            if ((child as HTMLElement).style) {
              ((child as HTMLElement).style as unknown as Record<string, string>)[key] = styleValue;
            }
          }
        }
      });
    }
    const parentNode = element.parentNode;
    parentNode?.appendChild(pElement);

    const newList = numFmt === 'bullet' ? document.createElement('ul') : document.createElement('ol');
    newList.setAttribute('data-list-id', id);
    (newList as unknown as { level: number }).level = level;

    parentNode?.insertBefore(newList, element);
    const listForLevel = newList;

    listForLevel.appendChild(pElement);
    element.remove();
  }
};

export const generateListPath = (level: number | string, levels: ListLevels, start: string | number): number[] => {
  const iLvl = Number(level);
  const path: number[] = [];
  if (iLvl > 0) {
    for (let i = iLvl; i >= 0; i--) {
      if (!levels[i]) levels[i] = Number(start);
      path.unshift(levels[i]);
    }
  }
  return path;
};

function extractAndRemoveConditionalPrefix(item: HTMLElement): void {
  const nodes = Array.from(item.childNodes);
  let fontFamily: string | null = null;
  let fontSize: string | null = null;

  let start = -1;
  let end = -1;
  nodes.forEach((node, index) => {
    if (node.nodeType === Node.COMMENT_NODE && node.nodeValue?.includes('[if !supportLists]')) {
      start = index;
    }
    if (start !== -1 && node.nodeType === Node.COMMENT_NODE && node.nodeValue?.includes('[endif]')) {
      end = index;
    }
  });

  if (start !== -1 && end !== -1) {
    for (let i = start + 1; i < end; i++) {
      const node = nodes[i];
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).style) {
        const elemNode = node as HTMLElement;
        fontFamily = fontFamily || elemNode.style.fontFamily;
        fontSize = fontSize || elemNode.style.fontSize;
      }
    }

    // Remove all nodes in that range
    for (let i = end; i >= start; i--) {
      item.removeChild(item.childNodes[i]);
    }

    // Store on <p> as attributes
    if (fontFamily) item.setAttribute('data-font-family', fontFamily);
    if (fontSize) item.setAttribute('data-font-size', fontSize);
  }
}
