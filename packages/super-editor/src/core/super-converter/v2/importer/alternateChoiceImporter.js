import { translator as alternateChoiceTranslator } from '@converter/v3/handlers/mc/altermateContent';
/**
 * @type {import("docxImporter").NodeHandler}
 */
const handleAlternateChoice = (params) => {
  const skipHandlerResponse = { nodes: [], consumed: 0 };
  const { nodes } = params;

  if (nodes.length === 0 || nodes[0].name !== 'w:p') {
    return skipHandlerResponse;
  }

  const mainNode = nodes[0];
  const node = mainNode?.elements?.find((el) => el.name === 'w:r');
  const hasAltChoice = node?.elements?.some((el) => el.name === 'mc:AlternateContent');

  if (!hasAltChoice) {
    return skipHandlerResponse;
  }

  const altChoiceNode = node.elements.find((el) => el.name === 'mc:AlternateContent');
  const result = alternateChoiceTranslator.encode({
    ...params,
    extraParams: {
      node: altChoiceNode,
    },
  });

  if (!result) {
    return skipHandlerResponse;
  }

  return { nodes: result, consumed: 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const alternateChoiceHandler = {
  handlerName: 'alternateChoiceHandler',
  handler: handleAlternateChoice,
};
