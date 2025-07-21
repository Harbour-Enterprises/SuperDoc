/**
 * @type {import("docxImporter").NodeHandler}
 */
import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { parseMarks } from './markImporter.js';

/**
 * Checks if a node contains a field character of a specific type
 * @param {Object} node - The node to check
 * @param {string} type - The field character type to look for
 * @returns {boolean} True if the node contains a field char of the specified type
 */
const hasFldChar = (node, type) => {
  if (!node?.elements) return false;
  return node.elements.some((r) => {
    if (!r?.elements) return false;
    return r.elements.some((el) => el.name === 'w:fldChar' && el.attributes?.['w:fldCharType'] === type);
  });
};

const getInstrText = (pNode, keyword = null) => {
  if (!pNode?.elements) return null;
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
          textVal = textVal.trim();
          if (keyword) {
            if (textVal.includes(keyword)) return textVal;
          } else {
            return textVal;
          }
        }
      }
    }
  }
  return null;
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

const parseTocEntry = (pNode, params) => {
  const { docx, nodeListHandler } = params;
  const elements = pNode.elements || [];

  const pPr = pNode.elements?.find((el) => el.name === 'w:pPr');
  const pStyleTag = pPr?.elements?.find((el) => el.name === 'w:pStyle');
  const styleId = pStyleTag?.attributes?.['w:val'];

  // Identify the positions of field char runs
  const beginIdx = elements.findIndex((r) =>
    r.elements?.some((el) => el.name === 'w:fldChar' && el.attributes?.['w:fldCharType'] === 'begin'),
  );
  const separateIdx = elements.findIndex((r) =>
    r.elements?.some((el) => el.name === 'w:fldChar' && el.attributes?.['w:fldCharType'] === 'separate'),
  );
  const endIdx = elements.findIndex((r) =>
    r.elements?.some((el) => el.name === 'w:fldChar' && el.attributes?.['w:fldCharType'] === 'end'),
  );

  const sectionRuns = beginIdx > 0 ? elements.slice(0, beginIdx) : [];

  // Runs containing cached page number are between separate and end
  const pageNumberRuns = separateIdx > -1 ? elements.slice(separateIdx + 1, endIdx > -1 ? endIdx : elements.length) : [];

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
    pageNumberRuns.forEach((r) => {
      pageNumText += getTextFromRun(r);
    });

    // Marks from first run's rPr
    const firstRun = pageNumberRuns.find((r) => r.elements?.some((el) => el.name === 'w:t'));
    const rPr = firstRun?.elements?.find((el) => el.name === 'w:rPr');
    pageNumMarks = parseMarks(rPr || { elements: [] }, docx);
  }

  // Build hyperlink mark applied to all nodes
  const instrText = getInstrText(pNode);
  const bookmark = extractBookmarkFromInstr(instrText);
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
  // Ensure a tab separator between title and page number
  content.push({ type: 'tab' });
  if (pageNumNode) content.push(pageNumNode);

  return { content, styleId };
};

const isTocStartParagraph = (node) => {
  if (node?.name !== 'w:p') return false;
  if (!hasFldChar(node, 'begin')) return false;
  return !!getInstrText(node, 'TOC');
};

const isTocEntryParagraph = (node) => {
  if (node?.name !== 'w:p') return false;
  return !!getInstrText(node, 'PAGEREF');
};

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleTocNode = (params) => {
  const {
    nodes,
    docx,
    nodeListHandler,
    insideTrackChange,
    converter,
    editor,
    filename,
    parentStyleId,
    lists,
  } = params;

  if (!nodes || !nodes.length) return { nodes: [], consumed: 0 };

  // Only proceed if the current position is the TOC wrapper start
  const firstNode = nodes[0];
  if (!isTocStartParagraph(firstNode)) return { nodes: [], consumed: 0 };

  const tocEntries = [];
  let consumed = 0;
  let wrapperSeparateReached = false;

  while (consumed < nodes.length) {
    const current = nodes[consumed];

    // Record wrapper break point
    if (!wrapperSeparateReached && hasFldChar(current, 'separate')) {
      wrapperSeparateReached = true;
      consumed += 1;
      continue;
    }

    // When separate reached, collect entries until we hit wrapper end
    if (wrapperSeparateReached) {
      const isEntry = isTocEntryParagraph(current);
      const hasEnd = hasFldChar(current, 'end');

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
        const wrapperInstruction = getInstrText(firstNode);
        const wrapperNode = {
          type: 'toc-wrapper',
          content: tocEntries,
          attrs: { instruction: wrapperInstruction },
        };

        const resultNodes = [wrapperNode, ...footerNodes];
        return { nodes: resultNodes, consumed };
      }

      if (isEntry) {
        const { content: entryContent, styleId } = parseTocEntry(current, {
          docx,
          nodeListHandler,
          insideTrackChange,
          converter,
          editor,
          filename,
          parentStyleId,
          lists,
        });
        const instruction = getInstrText(current);
        const attrs = { instruction };
        if (styleId) attrs.styleId = styleId;
        tocEntries.push({ type: 'toc-entry', content: entryContent, attrs });

      }

      consumed += 1;
      continue;
    }

    // We are still in the wrapper start paragraph, just count it and move on
    consumed += 1;
  }

  // If we exited loop without encountering wrapper closing paragraph
  const wrapperInstruction = getInstrText(firstNode);
  const wrapperNode = {
    type: 'toc-wrapper',
    content: tocEntries,
    attrs: { instruction: wrapperInstruction },
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
