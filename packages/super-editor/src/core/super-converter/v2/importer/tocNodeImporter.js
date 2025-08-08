/**
 * @type {import("docxImporter").NodeHandler}
 */
import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { parseMarks } from './markImporter.js';

/**
 * Checks if a node contains a field character of a specific type with optional instruction text matching.
 *
 * This function can be used in two ways:
 * 1. With keyword: Checks for field char AND matching instruction text (for TOC detection)
 * 2. Without keyword: Checks only for field char (for general field char detection)
 *
 * @param {Object} node - The node to check
 * @param {string} type - The field character type to look for ('begin', 'separate', 'end')
 * @param {string|null} [keyword=null] - The instruction text keyword to match (null for no keyword check)
 * @returns {boolean} True if the node contains a field char of the specified type with matching instruction
 *
 * @example
 * // TOC detection - check for field char AND instruction text
 * hasFldCharWithInstr(node, 'begin', 'TOC')     // TOC wrapper detection
 * hasFldCharWithInstr(node, 'begin', 'PAGEREF') // TOC entry detection
 *
 * @example
 * // General field char detection - check only for field char
 * hasFldCharWithInstr(node, 'separate') // Check for separate field char
 * hasFldCharWithInstr(node, 'end')      // Check for end field char
 * hasFldCharWithInstr(node, 'begin')    // Check for begin field char
 */
const hasFldCharWithInstr = (node, type, keyword = null) => {
  // Recursive base case
  if (!node) return false;

  // Track whether we've already found the pieces we need so we can exit early
  let hasFieldChar = false;
  let hasMatchingInstr = keyword === null; // If no keyword, instruction text match is not required

  /**
   * Recursively walk the element tree. WordML often nests the runs we care about
   * (e.g. inside a w:hyperlink). A two-level scan misses those, so we keep going
   * until we either satisfy both conditions or exhaust the descendants.
   *
   * @param {Object} n – current node in the walk
   */
  const walk = (n) => {
    if (!n?.elements || (hasFieldChar && hasMatchingInstr)) return;

    for (const child of n.elements) {
      if (hasFieldChar && hasMatchingInstr) return; // early exit once satisfied

      if (child.name === 'w:fldChar' && child.attributes?.['w:fldCharType'] === type) {
        hasFieldChar = true;
      } else if (keyword && child.name === 'w:instrText') {
        let textVal;
        if (typeof child.text === 'string') textVal = child.text;
        else if (child.elements?.length) {
          const txt = child.elements.find((t) => typeof t.text === 'string');
          if (txt) textVal = txt.text;
        }
        if (textVal && textVal.trim().includes(keyword)) {
          hasMatchingInstr = true;
        }
      }

      // Continue deeper as long as we still need information
      walk(child);
    }
  };

  walk(node);

  return hasFieldChar && hasMatchingInstr;
};

/*
  Get the instruction text (recursively) and also any space value we need to store.
  If a keyword is provided, return the first instrText that contains it; otherwise
  return the first instrText found in document order. The corresponding xml:space
  for the matched instrText is also returned.
*/
const getInstrText = (pNode, keyword = null) => {
  if (!pNode) return { text: null, space: null };

  /**
   * Collect all instrText nodes in document order with their text and xml:space
   */
  const collected = [];

  const walk = (n) => {
    if (!n || !n.elements) return;
    for (const el of n.elements) {
      if (el.name === 'w:instrText') {
        let textVal;
        if (typeof el.text === 'string') textVal = el.text;
        else if (el.elements?.length) {
          const txt = el.elements.find((t) => typeof t.text === 'string');
          if (txt) textVal = txt.text;
        }
        if (typeof textVal === 'string') {
          collected.push({
            text: textVal, // preserve original spacing
            space: el.attributes?.['xml:space'] || null,
          });
        }
      }
      if (el.elements?.length) walk(el);
    }
  };

  walk(pNode);

  if (collected.length === 0) return { text: null, space: null };

  if (keyword) {
    const match = collected.find((c) => c.text.includes(keyword));
    return match || { text: null, space: null };
  }

  // Default: first instrText encountered
  return collected[0];
};

const extractBookmarkFromInstr = (instr) => {
  if (!instr) return null;
  const match = instr.match(/PAGEREF\s+([^\s\\]+)/i);
  return match ? match[1] : null;
};

const getTextFromRun = (run) => {
  if (!run?.elements) return '';
  const tEl = run.elements.find((el) => el.name === 'w:t');
  if (!tEl) return '';
  if (typeof tEl.text === 'string') return tEl.text;
  if (tEl.elements?.length) {
    const inner = tEl.elements.find((e) => typeof e.text === 'string');
    return inner ? inner.text : '';
  }
  return '';
};

/**
 * Extract style ID from paragraph node with caching
 */
const getStyleId = (pNode) => {
  if (!pNode?.elements) return null;

  const pPr = pNode.elements.find((el) => el.name === 'w:pPr');
  const pStyleTag = pPr?.elements?.find((el) => el.name === 'w:pStyle');
  return pStyleTag?.attributes?.['w:val'] || null;
};

/**
 * Find the run indices for the fldChar begin/separate/end that belong to the field
 * whose instruction text contains the given keyword (e.g., 'PAGEREF').
 *
 * This function uses a stack to track nested fields in a Word document paragraph.
 * Each field in Word is marked by three special characters:
 * - begin: Marks the start of a field
 * - separate: Divides the field's instruction from its result
 * - end: Marks the end of a field
 *
 * The stack works by:
 * 1. Pushing a new field object when 'begin' is found
 * 2. Accumulating instruction text for the current field on top of stack
 * 3. Setting 'separate' index when found for current field
 * 4. Popping and completing field when 'end' is found
 *
 * This stack approach ensures we correctly match begin/separate/end markers
 * even when fields are nested (like TOC fields containing PAGEREF fields),
 * by tying each triple to its specific instruction text containing keywords
 * like 'PAGEREF' or 'TOC'.
 */
const findFieldCharIndicesForKeyword = (pNode, keyword) => {
  if (!pNode) return { begin: -1, separate: -1, end: -1, runNodes: [] };

  const runNodes = [];

  // Stack-based matcher for field triples with accumulated instruction text
  const openStack = [];
  const completed = [];

  const walk = (n) => {
    if (!n?.elements) return;
    for (const el of n.elements) {
      if (el.name === 'w:r') {
        const runIdx = runNodes.length;
        runNodes.push(el);

        if (el.elements?.length) {
          for (const child of el.elements) {
            if (child.name === 'w:fldChar') {
              const type = child.attributes?.['w:fldCharType'];
              if (type === 'begin') {
                openStack.push({ begin: runIdx, separate: -1, end: -1, instrText: '' });
              } else if (type === 'separate') {
                if (openStack.length) openStack[openStack.length - 1].separate = runIdx;
              } else if (type === 'end') {
                if (openStack.length) {
                  const f = openStack.pop();
                  f.end = runIdx;
                  completed.push(f);
                }
              }
            } else if (child.name === 'w:instrText') {
              let textVal;
              if (typeof child.text === 'string') textVal = child.text;
              else if (child.elements?.length) {
                const txt = child.elements.find((t) => typeof t.text === 'string');
                if (txt) textVal = txt.text;
              }
              if (typeof textVal === 'string' && openStack.length) {
                openStack[openStack.length - 1].instrText += textVal;
              }
            }
          }
        }
      }
      if (el.elements?.length) walk(el);
    }
  };

  walk(pNode);

  // Pick the first completed field whose instruction text contains the keyword
  const match = completed.find((f) => typeof f.instrText === 'string' && f.instrText.includes(keyword));
  if (!match) return { begin: -1, separate: -1, end: -1, runNodes };

  return { begin: match.begin, separate: match.separate, end: match.end, runNodes };
};

const parseTocEntry = (pNode, params) => {
  const { docx, nodeListHandler } = params;
  const styleId = getStyleId(pNode);

  // Identify fldChar indices tied to the PAGEREF field specifically
  const {
    begin: beginIdx,
    separate: separateIdx,
    end: endIdx,
    runNodes,
  } = findFieldCharIndicesForKeyword(pNode, 'PAGEREF');

  // If this paragraph is also the wrapper paragraph, exclude everything before
  // the wrapper's separate from the title runs so we don't accidentally include
  // wrapper field bits (TOC instrText, wrapper begin, etc.) in the title.
  const { separate: wrapperSeparateIdx } = findFieldCharIndicesForKeyword(pNode, 'TOC');

  // Runs before the entry's fldChar begin make up the visible section title,
  // but start after the wrapper's separate if present.
  let sectionRuns = [];
  if (beginIdx > 0) {
    const startIdx = wrapperSeparateIdx > -1 ? wrapperSeparateIdx + 1 : 0;
    sectionRuns = runNodes.slice(startIdx, beginIdx);
  }

  // Runs containing cached page number are between separate and end
  const pageNumberRuns =
    separateIdx > -1 ? runNodes.slice(separateIdx + 1, endIdx > -1 ? endIdx : runNodes.length) : [];

  // Process title runs through standard run handling to preserve styling
  let titleContent = [];
  if (sectionRuns.length) {
    titleContent = nodeListHandler.handler({
      ...params,
      nodes: sectionRuns,
    });

    // Attach styleId to each title node so it can be rendered with the correct paragraph style later
    if (styleId) {
      titleContent = titleContent.map((n) => ({
        ...n,
        attrs: { ...(n.attrs || {}), styleId },
      }));
    }
  }

  // Extract page number text and marks (use first run for marks)
  let pageNumText = '';
  let pageNumMarks = [];
  if (pageNumberRuns.length) {
    // Use array join instead of string concatenation for better performance
    const pageNumParts = [];
    pageNumberRuns.forEach((r) => {
      const text = getTextFromRun(r);
      if (text) pageNumParts.push(text);
    });
    pageNumText = pageNumParts.join('');

    // Marks from first run's rPr
    const firstRun = pageNumberRuns.find((r) => r.elements?.some((el) => el.name === 'w:t'));
    const rPr = firstRun?.elements?.find((el) => el.name === 'w:rPr');
    // parseMarks signature: parseMarks(property, unknownMarks = [], docx = null)
    pageNumMarks = parseMarks(rPr || { elements: [] }, [], docx);
  }

  // Build hyperlink mark applied to all nodes
  const instrData = getInstrText(pNode, 'PAGEREF');
  const bookmark = extractBookmarkFromInstr(instrData.text);
  const linkMark = bookmark ? { type: 'link', attrs: { href: `#${bookmark}` } } : null;

  if (linkMark) {
    // Apply to title nodes
    titleContent = titleContent.map((n) => ({
      ...n,
      marks: [...(n.marks || []), linkMark],
    }));
    pageNumMarks.push(linkMark);
  }

  let pageNumNode = null;
  if (pageNumText) {
    pageNumNode = {
      type: 'text',
      text: pageNumText,
      marks: pageNumMarks,
    };
  }

  const content = [...titleContent];
  // Filter out any existing tab nodes from titleContent to ensure we have only one tab
  const filteredContent = content.filter((node) => node.type !== 'tab');

  // Ensure a tab separator between title and page number
  filteredContent.push({ type: 'tab' });
  if (pageNumNode) filteredContent.push(pageNumNode);

  return {
    content: filteredContent,
    styleId,
    space: instrData.space,
    pageNumber: pageNumText,
    bookmark,
  };
};

const isTocStartParagraph = (node) => {
  if (node?.name !== 'w:p') return false;
  return hasFldCharWithInstr(node, 'begin', 'TOC');
};

const isTocEntryParagraph = (node) => {
  if (node?.name !== 'w:p') return false;
  return hasFldCharWithInstr(node, 'begin', 'PAGEREF');
};

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleTocNode = (params) => {
  const { nodes, docx, nodeListHandler, insideTrackChange, converter, editor, filename, parentStyleId, lists } = params;

  if (!nodes || !nodes.length) return { nodes: [], consumed: 0 };

  // Only proceed if the current position is the TOC wrapper start
  const firstNode = nodes[0];
  const firstIsWrapper = isTocStartParagraph(firstNode);
  if (!firstIsWrapper) {
    return { nodes: [], consumed: 0 };
  }

  const tocEntries = [];
  let consumed = 0;
  let wrapperSeparateReached = false;

  // Cache the wrapper instruction to avoid repeated calls
  const wrapperInstrData = getInstrText(firstNode, 'TOC');

  while (consumed < nodes.length) {
    const current = nodes[consumed];

    // Record wrapper break point
    if (!wrapperSeparateReached && hasFldCharWithInstr(current, 'separate')) {
      wrapperSeparateReached = true;
      // consumed += 1;
      // continue;
    }

    // When separate reached, collect entries until we hit wrapper end
    if (wrapperSeparateReached) {
      try {
        const isEntry = isTocEntryParagraph(current);
        const hasEnd = hasFldCharWithInstr(current, 'end');
        if (hasEnd && !isEntry) {
          // This is the wrapper closing paragraph (contains fldChar end and possibly page break)
          const footerNodes = nodeListHandler.handler({
            nodes: [carbonCopy(current)],
            docx,
            nodeListHandler,
            insideTrackChange,
            converter,
            editor,
            filename,
            parentStyleId,
            lists,
          });
          consumed += 1;

          // Build wrapper node first
          const wrapperNode = {
            type: 'toc-wrapper',
            content: tocEntries,
            attrs: {
              instruction: wrapperInstrData.text,
              space: wrapperInstrData.space,
            },
          };
          const resultNodes = [wrapperNode, ...footerNodes];
          return { nodes: resultNodes, consumed };
        }

        if (isEntry) {
          try {
            const {
              content: entryContent,
              styleId,
              space,
              pageNumber,
              bookmark,
            } = parseTocEntry(current, {
              docx,
              nodeListHandler,
              insideTrackChange,
              converter,
              editor,
              filename,
              parentStyleId,
              lists,
            });
            const instrData = getInstrText(current, 'PAGEREF');
            const attrs = { instruction: instrData.text };
            if (styleId) attrs.styleId = styleId;
            if (space) attrs.space = space;
            if (typeof pageNumber === 'string') attrs.pageNumber = pageNumber;
            if (typeof bookmark === 'string') attrs.bookmark = bookmark;
            const entry = { type: 'toc-entry', content: entryContent, attrs };
            tocEntries.push(entry);
          } catch {}
        }

        consumed += 1;
        continue;
      } catch {
        // Fail-safe: increment to avoid infinite loop
        consumed += 1;
        continue;
      }
    }

    // We are still in the wrapper start paragraph, just count it and move on
    consumed += 1;
  }

  // If we exited loop without encountering wrapper closing paragraph
  const wrapperNode = {
    type: 'toc-wrapper',
    content: tocEntries,
    attrs: {
      instruction: wrapperInstrData.text,
      space: wrapperInstrData.space,
    },
  };
  return { nodes: [wrapperNode], consumed };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const tocNodeHandlerEntity = {
  handlerName: 'tocNodeHandler',
  handler: handleTocNode,
};
