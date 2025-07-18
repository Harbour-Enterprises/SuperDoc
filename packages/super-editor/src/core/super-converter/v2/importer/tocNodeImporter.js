/**
 * @type {import("docxImporter").NodeHandler}
 */
import { carbonCopy } from '../../../utilities/carbonCopy.js';

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

// const extractBookmarkFromInstr = (instr) => {
//   if (!instr) return null;
//   const match = instr.match(/PAGEREF\s+([^\s\\]+)/i);
//   return match ? match[1] : null;
// };

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
        // This is the wrapper closing paragraph (no PAGEREF), finish processing
        consumed += 1;
        break;
      }

      if (isEntry) {
        // Copies but do we need to do this?
        const entryContent = nodeListHandler.handler({
          nodes: [carbonCopy(current)],
          nodeListHandler,
          docx,
          insideTrackChange,
          converter,
          editor,
          filename,
          parentStyleId,
          lists,
        });
        const instruction = getInstrText(current);
        tocEntries.push({ type: 'toc-entry', content: entryContent, attrs: { instruction } });

      }

      consumed += 1;
      continue;
    }

    // We are still in the wrapper start paragraph, just count it and move on
    consumed += 1;
  }

  // If we consumed nothing useful, bail out so other handlers can try
  if (!tocEntries.length) return { nodes: [], consumed: 0 };

  const wrapperInstruction = getInstrText(firstNode);

  const wrapperNode = {
    type: 'toc-wrapper',
    content: tocEntries,
    attrs: { instruction: wrapperInstruction },
  };

  console.log('wrapperNode', wrapperNode);
  return { nodes: [wrapperNode], consumed };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const tocNodeHandlerEntity = {
  handlerName: 'tocNodeHandler',
  handler: handleTocNode,
};
