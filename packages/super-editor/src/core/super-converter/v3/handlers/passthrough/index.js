// @ts-check

/**
 * Translator for unhandled OOXML nodes. It encodes nodes into ProseMirror
 * passthrough nodes that retain the original XML and decodes them back to the
 * stored XML when exporting.
 */
export const translator = {
  /**
   * Encode an unknown XML node as a passthrough node.
   * @param {import('../../node-translator').SCEncoderConfig} params
   * @returns {import('../../node-translator').SCEncoderResult | null}
   */
  encode(params) {
    const { nodes, isBlock } = params;
    if (!nodes || nodes.length === 0) return null;

    const originalNode = nodes[0];
    return {
      type: isBlock ? 'docxPassthroughBlock' : 'docxPassthroughInline',
      attrs: { originalXml: originalNode },
    };
  },

  /**
   * Decode a passthrough node back to its original XML.
   * @param {import('../../node-translator').SCDecoderConfig} params
   * @returns {import('../../node-translator').SCDecoderResult | null}
   */
  decode(params) {
    const { node } = params;
    return node?.attrs?.originalXml || null;
  },
};
