import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { registeredHandlers } from '../../v3/handlers/index.js';

const INLINE_PARENT_NAMES = new Set([
  'w:r',
  'w:hyperlink',
  'w:smartTag',
  'w:fldSimple',
  'w:proofErr',
  'w:del',
  'w:ins',
]);

const isInlineContext = (path = []) => {
  if (!Array.isArray(path) || path.length === 0) return false;

  for (let i = path.length - 1; i >= 0; i--) {
    const ancestorName = path[i]?.name;
    if (!ancestorName) continue;
    if (INLINE_PARENT_NAMES.has(ancestorName)) return true;

    // Stop searching when we hit clear block-level boundaries
    if (['w:p', 'w:body', 'w:tbl', 'w:tc', 'w:tr'].includes(ancestorName)) {
      return false;
    }
  }

  return false;
};

/**
 * @type {import('docxImporter').NodeHandler}
 */
export const handlePassthroughNode = (params) => {
  const { nodes = [] } = params;
  const node = nodes[0];
  if (!node) return { nodes: [], consumed: 0 };

  // If we already have a v3 translator, this isn't a passthrough candidate
  if (registeredHandlers[node.name]) {
    return { nodes: [], consumed: 0 };
  }

  const originalXml = carbonCopy(node) || {};
  const originalElementsSource = originalXml.elements;
  const originalElements = originalElementsSource ? carbonCopy(originalElementsSource) : [];

  const childElements = Array.isArray(node.elements) ? node.elements : [];
  let childContent = [];
  if (childElements.length && params.nodeListHandler?.handler) {
    const childParams = {
      ...params,
      nodes: childElements,
      path: [...(params.path || []), node],
    };
    childContent = params.nodeListHandler.handler(childParams) || [];
  }

  if (originalElements?.length) {
    originalXml.elements = originalElements;
  }

  const passthroughNode = {
    type: isInlineContext(params.path) ? 'passthroughInline' : 'passthroughBlock',
    attrs: {
      originalName: node.name,
      originalXml,
    },
    marks: [],
    content: childContent,
  };

  return {
    nodes: [passthroughNode],
    consumed: 1,
  };
};

/**
 * @type {import('docxImporter').NodeHandlerEntry}
 */
export const passthroughNodeHandlerEntity = {
  handlerName: 'passthroughNodeHandler',
  handler: handlePassthroughNode,
};
