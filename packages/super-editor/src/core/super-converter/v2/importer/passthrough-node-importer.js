// @ts-check
import { translator } from '../../v3/handlers/passthrough-node/passthrough-translator.js';

/**
 * Pass-through node handler. This node maps to PassthroughNode which just stores the original data
 * and will export it oback out exactly as it was imported.
 * @param {import('./types').NodeHandlerParams} params
 */
export const handler = (params) => {
  const node = params.nodes[0];

  const shouldSkip = shouldSkipPassthrough(node.name);
  if (shouldSkip) {
    return { nodes: [], consumed: 1 };
  }

  // We handle any node that we don't have a handler for here
  const result = translator.encode(params);
  if (!result) return { nodes: [], consumed: 0 };

  return {
    nodes: [result],
    consumed: 1,
  };
};

export const passthroughNodeHandlerEntity = {
  handlerName: 'passthroughNodeHandler',
  handler,
};

/**
 * Get the local name from a qualified name.
 * @param {string} q
 * @returns {string} Local name
 */
function local(q) {
  return (q && q.split(':').pop()) || q || '';
}

/**
 * Check if this node should be skipped entirely as a passthrough node.
 * @param {string} qname
 * @returns {boolean}
 */
export function shouldSkipPassthrough(qname) {
  if (!qname) return true;
  const ln = local(qname);

  // All *Pr and *PrChange (pPr, rPr, tcPr, trPr, tblPr, sectPr…)
  if (/(^|:)\w+Pr(Change)?$/.test(qname)) return true;

  // Range endpoints / markers
  if (/(^|:)(bookmark|comment|move(From|To)|perm)Range(Start|End)$/.test(qname)) return true;

  // Inline markers
  if (
    [
      'bookmarkStart',
      'bookmarkEnd',
      'proofErr',
      'annotationRef',
      'commentReference',
      'footnoteReference',
      'endnoteReference',
      'lastRenderedPageBreak',
    ].includes(ln)
  )
    return true;

  // Field code pieces
  if (['fldChar', 'instrText', 'fldSimple'].includes(ln)) return true;

  // Table scaffolding
  if (['tblGrid', 'gridCol', 'tblPr', 'tblPrEx', 'tblLook', 'trPr', 'tcPr', 'tcPrEx'].includes(ln)) return true;

  // AlternateContent wrapper
  if (qname === 'mc:AlternateContent' || ['AlternateContent', 'Choice', 'Fallback'].includes(ln)) return true;

  // Section props, legacy VML wrapper
  if (ln === 'sectPr' || ln === 'pict') return true;

  if (ln === 'pgNum') return true;

  return false;
}
