/**
 * Processes a PAGE instruction and creates a `sd:autoPageNumber` node.
 * @param {import('../../v2/types/index.js').OpenXmlNode[]} nodesToCombine The nodes to combine.
 * @param {string} _ The instruction text (unused).
 * @param {import('../v2/docxHelper').ParsedDocx} [__] - The docx object.
 * @returns {import('../../v2/types/index.js').OpenXmlNode[]}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 1234
 */
export function preProcessPageInstruction(nodesToCombine, _, __) {
  const pageNumNode = {
    name: 'sd:autoPageNumber',
    type: 'element',
  };

  nodesToCombine.forEach((n) => {
    const rPrNode = n.elements.find((el) => el.name === 'w:rPr');
    if (rPrNode) pageNumNode.elements = [rPrNode];
  });

  return [pageNumNode];
}
