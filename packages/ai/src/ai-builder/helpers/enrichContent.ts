/**
 * Default paragraph spacing attributes matching super-editor defaults
 *
 * These values match getDefaultSpacing() from:
 * packages/super-editor/src/extensions/paragraph/helpers/getDefaultSpacing.js
 */
const DEFAULT_SPACING = {
  after: null,
  before: null,
  line: null,
  lineRule: 'auto',
};

/**
 * Add default spacing attributes to paragraph nodes if not already present
 *
 * This ensures all AI-generated content has consistent paragraph formatting
 * matching the defaults used in the paragraph extension. Without spacing
 * attributes, paragraphs render with zero margins and no visual line breaks.
 *
 * @param nodes - Array of content nodes (typically from AI)
 * @returns Array of nodes with spacing attributes enriched
 *
 * @example
 * ```typescript
 * const enriched = enrichParagraphNodes([
 *   { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }
 * ]);
 * // Returns nodes with default spacing added to attrs
 * ```
 */
export function enrichParagraphNodes(nodes: any[]): any[] {
  if (!Array.isArray(nodes)) {
    return nodes;
  }

  return nodes.map(node => {
    // Only process paragraph nodes
    if (node?.type !== 'paragraph') {
      return node;
    }

    // Create a copy to avoid mutating the original
    const enrichedNode = { ...node };

    // Initialize attrs if not present
    if (!enrichedNode.attrs) {
      enrichedNode.attrs = {};
    }

    // Add default spacing if not already set
    if (!enrichedNode.attrs.spacing) {
      enrichedNode.attrs.spacing = { ...DEFAULT_SPACING };
    }

    return enrichedNode;
  });
}
