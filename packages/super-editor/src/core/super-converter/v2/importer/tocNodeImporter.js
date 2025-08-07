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
  Get the instruction text and also any space value we need to store
*/
const getInstrText = (pNode, keyword = null) => {
  if (!pNode?.elements) return { text: null, space: null };

  // Always extract instruction texts fresh to capture all types
  const texts = [];
  let spaceValue = null;

  for (const r of pNode.elements) {
    if (!r?.elements) continue;
    for (const el of r.elements) {
      if (el.name === 'w:instrText') {
        let textVal;
        if (typeof el.text === 'string') textVal = el.text;
        else if (el.elements?.length) {
          const txt = el.elements.find((t) => typeof t.text === 'string');
          if (txt) textVal = txt.text;
        }
        if (textVal) {
          texts.push(textVal); // Don't trim - preserve original spacing
        }

        // Extract xml:space attribute if present
        if (el.attributes && el.attributes['xml:space']) {
          spaceValue = el.attributes['xml:space'];
        }
      }
    }
  }

  let resultText = null;
  if (keyword) {
    // Find the first text that contains the keyword
    resultText = texts.find((text) => text.includes(keyword)) || null;
  } else {
    // Return the first instruction text (most common case)
    resultText = texts.length > 0 ? texts[0] : null;
  }

  return { text: resultText, space: spaceValue };
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
 * Find field character indices in a single pass
 * This goes 3 levels deep - Should be enough to find the fldChar
 * We thought 2 would be enough but it was not working
 */
const findFieldCharIndices = (elements) => {
  const indices = { begin: -1, separate: -1, end: -1 };

  for (let i = 0; i < elements.length; i++) {
    const r = elements[i];
    if (!r?.elements) continue;

    for (const el of r.elements) {
      if (el.name === 'w:fldChar') {
        const type = el.attributes?.['w:fldCharType'];
        if (type && indices[type] === -1) {
          indices[type] = i;
        }
      } else if (el.elements) {
        for (const el2 of el.elements) {
          if (el2.name === 'w:fldChar') {
            const type = el2.attributes?.['w:fldCharType'];
            if (type && indices[type] === -1) {
              indices[type] = i;
            }
          }
        }
      }
    }
  }

  console.log('indices', indices);
  return indices;
};

const parseTocEntry = (pNode, params) => {
  console.log('parseTocEntry', pNode);
  const { docx, nodeListHandler } = params;
  const elements = pNode.elements || [];

  const styleId = getStyleId(pNode);

  // Collect every w:r in document order (handles nested hyperlink etc.)
  const runNodes = [];
  const collectRuns = (nodes) => {
    nodes.forEach((n) => {
      if (!n) return;
      if (n.name === 'w:r') runNodes.push(n);
      if (n.elements?.length) collectRuns(n.elements);
    });
  };
  collectRuns(elements);

  // Find field char indices in the flattened run list
  const { begin: beginIdx, separate: separateIdx, end: endIdx } = findFieldCharIndices(runNodes);

  // Runs before the first fldChar begin make up the visible section title
  const sectionRuns = beginIdx > 0 ? runNodes.slice(0, beginIdx) : [];

  console.log('sectionRuns', sectionRuns);

  // Runs containing cached page number are between separate and end
  const pageNumberRuns =
    separateIdx > -1 ? runNodes.slice(separateIdx + 1, endIdx > -1 ? endIdx : runNodes.length) : [];

  console.log('pageNumberRuns', pageNumberRuns);

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
    pageNumMarks = parseMarks(rPr || { elements: [] }, docx);
  }

  // Build hyperlink mark applied to all nodes
  const instrData = getInstrText(pNode);
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

  console.log('filteredContent', filteredContent);
  console.log('styleId', styleId);
  console.log('space', instrData.space);
  return { content: filteredContent, styleId, space: instrData.space };
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
  if (!isTocStartParagraph(firstNode)) return { nodes: [], consumed: 0 };

  const tocEntries = [];
  let consumed = 0;
  let wrapperSeparateReached = false;

  // Cache the wrapper instruction to avoid repeated calls
  const wrapperInstrData = getInstrText(firstNode);

  while (consumed < nodes.length) {
    const current = nodes[consumed];

    // Record wrapper break point
    if (!wrapperSeparateReached && hasFldCharWithInstr(current, 'separate')) {
      console.log('found first break point', current);
      wrapperSeparateReached = true;
      consumed += 1;
      continue;
    }

    // When separate reached, collect entries until we hit wrapper end
    if (wrapperSeparateReached) {
      console.log('wrapperSeparateReached', wrapperSeparateReached);
      const isEntry = isTocEntryParagraph(current);
      const hasEnd = hasFldCharWithInstr(current, 'end');

      console.log('hasEnd', hasEnd);
      console.log('isEntry', isEntry);
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
        console.log('wrapperNodes', wrapperNode);
        return { nodes: resultNodes, consumed };
      }

      if (isEntry) {
        const {
          content: entryContent,
          styleId,
          space,
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
        const instrData = getInstrText(current);
        const attrs = { instruction: instrData.text };
        if (styleId) attrs.styleId = styleId;
        if (space) attrs.space = space;
        tocEntries.push({ type: 'toc-entry', content: entryContent, attrs });
        console.log('tocEntries', tocEntries);
      }

      consumed += 1;
      continue;
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
