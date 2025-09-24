import { carbonCopy } from '../../../utilities/carbonCopy.js';

const ALTERNATE_CONTENT_NODE = 'mc:AlternateContent';
const SUPPORTED_REQUIRES = new Set([
  'wps',
  'wp14',
  'w14',
  'w15',
  'w16',
  'w16cex',
  'w16cid',
  'w16du',
  'w16sdtdh',
  'w16sdtfl',
  'w16se',
]);

const skipHandlerResponse = { nodes: [], consumed: 0 };

const isAlternateContentNode = (node) => node?.name === ALTERNATE_CONTENT_NODE;

const isSupportedChoice = (choice) => {
  if (!choice?.attributes) return false;
  const requires = choice.attributes.Requires || choice.attributes.requires;
  if (!requires) return false;

  return requires
    .split(/\s+/)
    .filter(Boolean)
    .some((namespace) => SUPPORTED_REQUIRES.has(namespace));
};

const resolveAlternateContentElements = (alternateContent) => {
  if (!alternateContent?.elements?.length) return null;

  const choices = alternateContent.elements.filter((el) => el.name === 'mc:Choice');
  const fallback = alternateContent.elements.find((el) => el.name === 'mc:Fallback');

  const supportedChoice = choices.find(isSupportedChoice);
  const selectedElements = supportedChoice?.elements || fallback?.elements || choices[0]?.elements;

  if (!selectedElements) return null;

  return carbonCopy(selectedElements);
};

const buildNodeWithoutAlternateContent = (node) => {
  const { elements } = node || {};
  if (!elements?.length) return null;

  let replaced = false;
  const updatedElements = [];

  elements.forEach((element) => {
    if (isAlternateContentNode(element)) {
      const resolved = resolveAlternateContentElements(element);
      if (resolved) {
        updatedElements.push(...resolved);
        replaced = true;
        return;
      }

      updatedElements.push(carbonCopy(element));
      return;
    }

    updatedElements.push(carbonCopy(element));
  });

  if (!replaced) return null;

  const clone = carbonCopy(node);
  clone.elements = updatedElements;
  return clone;
};

/**
 * @type {import("docxImporter").NodeHandler}
 */
const handleAlternateChoice = (params) => {
  const { nodes, nodeListHandler } = params;
  if (!nodes?.length) {
    return skipHandlerResponse;
  }

  const [currentNode] = nodes;

  if (isAlternateContentNode(currentNode)) {
    const resolvedElements = resolveAlternateContentElements(currentNode);
    if (!resolvedElements) {
      return skipHandlerResponse;
    }

    const result = nodeListHandler.handler({
      ...params,
      nodes: resolvedElements,
      path: [...(params.path || []), currentNode],
    });

    return { nodes: result, consumed: 1 };
  }

  const sanitizedNode = buildNodeWithoutAlternateContent(currentNode);
  if (!sanitizedNode) {
    return skipHandlerResponse;
  }

  const result = nodeListHandler.handler({
    ...params,
    nodes: [sanitizedNode],
    path: [...(params.path || []), sanitizedNode],
  });

  return { nodes: result, consumed: 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const alternateChoiceHandler = {
  handlerName: 'alternateChoiceHandler',
  handler: handleAlternateChoice,
};
