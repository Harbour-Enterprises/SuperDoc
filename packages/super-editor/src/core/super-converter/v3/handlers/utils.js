/**
 * Generates a handler entity for a given node translator.
 * @param {string} handlerName - The name of the handler.
 * @param {import('../node-translator/').NodeTranslator} translator - The node translator object.
 * @returns { import("../../v2/importer/docxImporter").NodeHandlerEntry } The handler entity with the specified name.
 */
export const generateV2HandlerEntity = (handlerName, translator) => ({
  handlerName,
  handler: (params) => {
    const { nodes } = params;
    if (nodes.length === 0 || nodes[0].name !== translator.xmlName) {
      return { nodes: [], consumed: 0 };
    }
    const result = translator.encode(params);
    if (!result) return { nodes: [], consumed: 0 };
    return {
      nodes: Array.isArray(result) ? result : [result],
      consumed: 1,
    };
  },
});
