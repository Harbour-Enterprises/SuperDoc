import { getElementName, parseProperties, isPropertiesElement } from './importerHelpers.js';

/**
 * Standard node handler
 * @param {import('../../v3/node-translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
export const handleStandardNode = (params) => {
  const { nodes, docx, nodeListHandler } = params;
  if (!nodes || nodes.length === 0) {
    return { nodes: [], consumed: 0 };
  }

  // Parse properties
  const node = nodes[0];
  const { name } = node;
  const { attributes, elements, marks = [] } = parseProperties(node, docx);

  if (name === 'w:sdt') {
    return { nodes: [], consumed: 0 };
  }

  // Formatting only nodes
  if (isPropertiesElement(node)) {
    return {
      nodes: [
        {
          type: getElementName(node),
          attrs: { ...attributes },
          marks: [],
        },
      ],
      consumed: 0,
    };
  }

  // Unhandled nodes
  if (!getElementName(node)) {
    return { nodes: [], consumed: 0 };
  }

  // Iterate through the children and build the schemaNode content
  // Skip run properties since they are formatting only elements
  const content = [];
  const parentStyleId = getParentStyleId(node);
  if (elements && elements.length) {
    const updatedElements = elements.map((el) => {
      if (!el.marks) el.marks = [];
      el.marks.push(...marks);
      return el;
    });

    const childParams = { ...params, nodes: updatedElements, parentStyleId };
    const childContent = nodeListHandler.handler(childParams);
    content.push(...childContent);
  }

  const resultNode = {
    type: getElementName(node),
    content,
    attrs: { ...attributes },
    marks: [],
  };

  return { nodes: [resultNode], consumed: 1 };
};

const getParentStyleId = (node) => {
  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  const styleTag = pPr?.elements?.find((el) => el.name === 'w:pStyle');
  return styleTag ? styleTag.attributes['w:val'] : null;
};

/**
 * Line break node handler entity
 * @type {Object} Handler entity
 */
export const standardNodeHandlerEntity = {
  handlerName: 'standardNodeHandler',
  handler: handleStandardNode,
};
