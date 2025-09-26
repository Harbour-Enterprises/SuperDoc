/**
 * Processes a PAGEREF instruction and creates a `sd:pageReference` node.
 * @param {import('../../v2/types/index.js').OpenXmlNode[]} nodesToCombine The nodes to combine.
 * @param {string} instrText The instruction text.
 * @param {import('../v2/docxHelper').ParsedDocx} [__] - The docx object.
 * @returns {import('../../v2/types/index.js').OpenXmlNode[]}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 1234
 */
export function preProcessPageRefInstruction(nodesToCombine, instrText, _) {
  const textStart = nodesToCombine.findIndex((n) =>
    n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'separate'),
  );
  const textEnd = nodesToCombine.findIndex((n) =>
    n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'end'),
  );

  if (textStart === -1 || textEnd === -1 || textEnd <= textStart) {
    // Invalid structure; return nodes as-is
    return nodesToCombine;
  }

  const textNodes = nodesToCombine.slice(textStart + 1, textEnd);
  const pageRefNode = {
    name: 'sd:pageReference',
    type: 'element',
    attributes: {
      instruction: instrText,
    },
    elements: [...(textNodes[0]?.elements || [])],
  };
  return [pageRefNode];
}
