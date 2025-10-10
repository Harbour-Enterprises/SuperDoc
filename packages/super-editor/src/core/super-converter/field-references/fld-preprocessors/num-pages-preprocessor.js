/**
 * Processes a NUMPAGES instruction and creates a `sd:totalPageNumber` node.
 * @param {import('../../v2/types/index.js').OpenXmlNode[]} nodesToCombine The nodes to combine.
 * @returns {import('../../v2/types/index.js').OpenXmlNode[]}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 1233
 */
export function preProcessNumPagesInstruction(nodesToCombine) {
  const totalPageNumNode = {
    name: 'sd:totalPageNumber',
    type: 'element',
  };

  nodesToCombine.forEach((n) => {
    const rPrNode = n.elements?.find((el) => el.name === 'w:rPr');
    if (rPrNode) totalPageNumNode.elements = [rPrNode];
  });
  return [totalPageNumNode];
}
