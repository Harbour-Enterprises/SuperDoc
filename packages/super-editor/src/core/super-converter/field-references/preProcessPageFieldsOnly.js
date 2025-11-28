/**
 * @typedef {import('../v2/types/index.js').OpenXmlNode} OpenXmlNode
 */
import { preProcessPageInstruction } from './fld-preprocessors/page-preprocessor.js';
import { preProcessNumPagesInstruction } from './fld-preprocessors/num-pages-preprocessor.js';

/**
 * Pre-processes nodes to convert ONLY PAGE and NUMPAGES field codes.
 * Unlike the full preProcessNodesForFldChar, this function:
 * - Converts PAGE fields to sd:autoPageNumber
 * - Converts NUMPAGES fields to sd:totalPageNumber
 * - Leaves ALL other field types completely untouched (including DOCPROPERTY, HYPERLINK, etc.)
 *
 * This is specifically designed for header/footer processing where we need page number
 * fields to work while preserving other field types for proper round-trip export.
 *
 * @param {OpenXmlNode[]} nodes - The nodes to process.
 * @returns {{ processedNodes: OpenXmlNode[] }} The processed nodes.
 */
export const preProcessPageFieldsOnly = (nodes = []) => {
  const processedNodes = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    // Check if this node starts a field (has fldChar with begin)
    const fldCharEl = node.elements?.find((el) => el.name === 'w:fldChar');
    const fldType = fldCharEl?.attributes?.['w:fldCharType'];

    if (fldType === 'begin') {
      // Scan ahead to find the field type and end marker
      const fieldInfo = scanFieldSequence(nodes, i);

      if (fieldInfo && (fieldInfo.fieldType === 'PAGE' || fieldInfo.fieldType === 'NUMPAGES')) {
        // Process PAGE or NUMPAGES fields
        const preprocessor = fieldInfo.fieldType === 'PAGE' ? preProcessPageInstruction : preProcessNumPagesInstruction;

        // Collect nodes between separate and end for the preprocessor
        const contentNodes = fieldInfo.contentNodes;
        const processedField = preprocessor(contentNodes, fieldInfo.instrText);
        processedNodes.push(...processedField);

        // Skip past the entire field sequence
        i = fieldInfo.endIndex + 1;
        continue;
      } else {
        // Unknown field type - pass through all original nodes unchanged
        if (fieldInfo) {
          for (let j = i; j <= fieldInfo.endIndex; j++) {
            const passNode = nodes[j];
            // Recursively process child elements
            if (Array.isArray(passNode.elements)) {
              const childResult = preProcessPageFieldsOnly(passNode.elements);
              passNode.elements = childResult.processedNodes;
            }
            processedNodes.push(passNode);
          }
          i = fieldInfo.endIndex + 1;
          continue;
        }
      }
    }

    // Not a field or incomplete field - recursively process children and add
    if (Array.isArray(node.elements)) {
      const childResult = preProcessPageFieldsOnly(node.elements);
      node.elements = childResult.processedNodes;
    }
    processedNodes.push(node);
    i++;
  }

  return { processedNodes };
};

/**
 * Scans forward from a 'begin' fldChar to find the complete field sequence.
 *
 * @param {OpenXmlNode[]} nodes - All nodes
 * @param {number} beginIndex - Index of the 'begin' fldChar node
 * @returns {{ fieldType: string, instrText: string, contentNodes: OpenXmlNode[], endIndex: number } | null}
 */
function scanFieldSequence(nodes, beginIndex) {
  let instrText = '';
  let separateIndex = -1;
  let endIndex = -1;
  const contentNodes = [];

  for (let i = beginIndex + 1; i < nodes.length; i++) {
    const node = nodes[i];
    const fldCharEl = node.elements?.find((el) => el.name === 'w:fldChar');
    const fldType = fldCharEl?.attributes?.['w:fldCharType'];
    const instrTextEl = node.elements?.find((el) => el.name === 'w:instrText');

    if (instrTextEl) {
      instrText += (instrTextEl.elements?.[0]?.text || '') + ' ';
    }

    if (fldType === 'separate') {
      separateIndex = i;
    } else if (fldType === 'end') {
      endIndex = i;
      break;
    } else if (separateIndex !== -1 && fldType !== 'begin') {
      // Content between separate and end
      contentNodes.push(node);
    }
  }

  if (endIndex === -1) {
    return null; // Incomplete field
  }

  const fieldType = instrText.trim().split(' ')[0];

  return {
    fieldType,
    instrText: instrText.trim(),
    contentNodes,
    endIndex,
  };
}
