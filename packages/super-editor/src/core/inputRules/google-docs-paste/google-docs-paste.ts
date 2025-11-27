import type { EditorView } from 'prosemirror-view';
import { DOMParser } from 'prosemirror-model';
import type { Editor } from '../../Editor.js';
import { convertEmToPt, sanitizeHtml } from '../../InputRule.js';
import { ListHelpers } from '../../helpers/list-numbering-helpers.js';
import { createSingleItemList } from '../html/html-helpers.js';
import { getLvlTextForGoogleList, googleNumDefMap } from '../../helpers/pasteListHelpers.js';

interface LevelCounters {
  [key: number]: number;
}

interface LevelStarts {
  [key: number]: number;
}

interface GetInitialStartValueParams {
  li: HTMLLIElement;
  listElem: HTMLElement;
  level: number;
  baseLevel: number;
}

/**
 * Main handler for pasted Google Docs content.
 *
 * @param html The string being pasted
 * @param editor The SuperEditor instance
 * @param view The ProseMirror view
 * @returns
 */
export const handleGoogleDocsHtml = (html: string, editor: Editor, view: EditorView): boolean => {
  // convert lists
  const htmlWithPtSizing = convertEmToPt(html);
  const sanitized = sanitizeHtml(htmlWithPtSizing) as unknown as HTMLElement;
  const cleanedHtml = sanitized.innerHTML;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanedHtml;

  const htmlWithMergedLists = mergeSeparateLists(tempDiv);
  const flattenHtml = flattenListsInHtml(htmlWithMergedLists, editor);

  const doc = DOMParser.fromSchema(editor.schema).parse(flattenHtml);
  tempDiv.remove();

  const { dispatch } = editor.view;
  if (!dispatch) return false;

  dispatch(view.state.tr.replaceSelectionWith(doc, true));
  return true;
};

/**
 * Flattens lists to ensure each list contains exactly ONE list item.
 */
function flattenListsInHtml(container: HTMLElement, editor: Editor): HTMLElement {
  // Keep processing until all lists are flattened
  let foundList: HTMLElement | null;
  while ((foundList = findListToFlatten(container))) {
    flattenFoundList(foundList, editor);
  }

  return container;
}

/**
 * Finds lists to be flattened
 */
function findListToFlatten(container: HTMLElement): HTMLElement | null {
  // First priority: unprocessed lists
  const list = container.querySelector('ol:not([data-list-id]), ul:not([data-list-id])');
  if (list) return list as HTMLElement;

  return null;
}

/**
 * Flattens a single list by:
 * 1. Ensuring it has proper data-list-id
 * 2. Splitting multi-item lists into single-item lists
 * 3. Extracting nested lists and processing them recursively
 */
function flattenFoundList(listElem: HTMLElement, editor: Editor): void {
  const tag = listElem.tagName.toLowerCase();
  const baseLevel = getBaseLevel(listElem);
  const items = Array.from(listElem.children).filter(
    (c) => (c as HTMLElement).tagName?.toLowerCase() === 'li',
  ) as HTMLLIElement[];
  if (!items.length) return;

  const counters: LevelCounters = {};
  const levelStarts: LevelStarts = {};

  const rootNumId = ListHelpers.getNewListId(editor);
  const newNodes: HTMLElement[] = [];

  items.forEach((li) => {
    const level = getEffectiveLevel(li, baseLevel);
    const styleType = getListStyleType(li, tag);
    const numFmt = googleNumDefMap.get(styleType) || (tag === 'ol' ? 'decimal' : 'bullet');
    const lvlText = getLvlTextForGoogleList(styleType, level + 1, editor);

    if (levelStarts[level] == null) {
      levelStarts[level] = getInitialStartValue({ li, listElem, level, baseLevel });
    }

    const currentValue = incrementLevelCounter(counters, level, levelStarts[level]);
    const path = buildListPath(level, counters);

    const paragraph = createSingleItemList({
      li: (li.childNodes.length && (li.childNodes[0] as HTMLElement).tagName === 'P'
        ? li.childNodes[0]
        : li) as HTMLLIElement,
      rootNumId: String(rootNumId),
      level,
      listNumberingType: numFmt,
    });

    paragraph.setAttribute('data-num-fmt', numFmt);
    paragraph.setAttribute('data-lvl-text', lvlText);
    paragraph.setAttribute('data-list-level', JSON.stringify(path.length ? path : [currentValue]));

    ListHelpers.generateNewListDefinition({
      numId: rootNumId,
      listType: numFmt === 'bullet' ? 'bulletList' : 'orderedList',
      editor,
      fmt: numFmt,
      level: level,
      start: levelStarts[level],
      text: lvlText,
    });

    newNodes.push(paragraph);

    const nestedLists = getNestedLists([li.nextSibling]);
    const nestedList = nestedLists[0];
    if (nestedList) {
      const cloned = nestedList.cloneNode(true) as HTMLElement;
      cloned.setAttribute('data-level', String(level + 1));
      newNodes.push(cloned);
      if (li.nextSibling && ['OL', 'UL'].includes((li.nextSibling as HTMLElement).tagName)) {
        li.nextSibling.remove();
      }
    }
  });

  const parent = listElem.parentNode;
  const nextSibling = listElem.nextSibling;
  parent?.removeChild(listElem);

  newNodes.forEach((node) => {
    parent?.insertBefore(node, nextSibling);
  });
}

/**
 * Recursive helper to find all nested lists for the list item
 */
function getNestedLists(nodes: (Node | null)[]): HTMLElement[] {
  const result: HTMLElement[] = [];

  const nodesArray = Array.from(nodes).filter((n) => n !== null);

  for (const item of nodesArray) {
    const element = item as HTMLElement;
    if (element.tagName === 'OL' || element.tagName === 'UL') {
      result.push(element);
    }
  }

  return result;
}

/**
 * Method that combines separate lists with sequential start attribute into one list
 * Google Docs list items could be presented as separate lists with sequential start attribute
 */
function mergeSeparateLists(container: HTMLElement): HTMLElement {
  const tempCont = container.cloneNode(true) as HTMLElement;

  const rootLevelLists = Array.from(tempCont.querySelectorAll('ol:not(ol ol):not(ul ol)') || []) as HTMLElement[];
  const mainList = rootLevelLists.find((list) => !list.getAttribute('start')) || rootLevelLists[0];
  const hasStartAttr = rootLevelLists.some((list) => list.getAttribute('start') !== null);

  if (hasStartAttr && mainList) {
    const listsWithStartAttr = rootLevelLists.filter(
      (list) => list !== mainList && list.getAttribute('start') !== null,
    );
    listsWithStartAttr
      .sort((a, b) => Number(a.getAttribute('start')) - Number(b.getAttribute('start')))
      .forEach((item) => {
        mainList.append(...Array.from(item.childNodes));
        item.remove();
      });
  }

  return tempCont;
}

function getBaseLevel(listElem: HTMLElement): number {
  const explicitLevel = Number(listElem.getAttribute('data-level'));
  if (!Number.isNaN(explicitLevel)) return explicitLevel;

  let level = 0;
  let ancestor = listElem.parentElement;
  while (ancestor && ancestor.tagName) {
    if (ancestor.tagName.toLowerCase() === 'li') level++;
    ancestor = ancestor.parentElement;
  }

  return level;
}

function getEffectiveLevel(li: HTMLLIElement, baseLevel: number): number {
  const ariaLevel = Number(li.getAttribute('aria-level'));
  if (Number.isNaN(ariaLevel)) {
    return baseLevel;
  }
  return Math.max(ariaLevel - 1, baseLevel);
}

function getListStyleType(li: HTMLLIElement, fallbackTag: string): string {
  return (
    (li.style as unknown as { 'list-style-type'?: string })?.['list-style-type'] ||
    (fallbackTag === 'ol' ? 'decimal' : 'bullet')
  );
}

function getInitialStartValue({ li, listElem, level, baseLevel }: GetInitialStartValueParams): number {
  const valueAttr = Number(li.getAttribute('value'));
  if (!Number.isNaN(valueAttr)) {
    return valueAttr;
  }

  if (level === baseLevel) {
    const listStart = Number(listElem.getAttribute('start'));
    if (!Number.isNaN(listStart)) {
      return listStart;
    }
  }

  return 1;
}

function incrementLevelCounter(map: LevelCounters, level: number, start: number): number {
  const numericLevel = Number(level);
  Object.keys(map).forEach((key) => {
    if (Number(key) > numericLevel) {
      delete map[Number(key)];
    }
  });

  if (map[numericLevel] == null) {
    map[numericLevel] = Number(start) || 1;
  } else {
    map[numericLevel] += 1;
  }

  return map[numericLevel];
}

function buildListPath(level: number, map: LevelCounters): number[] {
  const numericLevel = Number(level);
  if (Number.isNaN(numericLevel)) {
    return [];
  }

  const path: number[] = [];
  for (let i = 0; i <= numericLevel; i++) {
    if (map[i] != null) {
      path.push(map[i]);
    }
  }
  return path;
}
