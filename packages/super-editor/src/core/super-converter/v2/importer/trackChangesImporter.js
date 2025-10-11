import { translator as wDelTranslator } from '@converter/v3/handlers/w/del';
import { translator as wInsTranslator } from '@converter/v3/handlers/w/ins';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleTrackChangeNode = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || !(nodes[0].name === 'w:del' || nodes[0].name === 'w:ins')) {
    return { nodes: [], consumed: 0 };
  }

  const mainNode = nodes[0];
  let result;

  switch (mainNode.name) {
    case 'w:del':
      result = wDelTranslator.encode({
        extraParams: {
          node: mainNode,
        },
        ...params,
      });
      break;
    case 'w:ins':
      result = wInsTranslator.encode({
        extraParams: {
          node: mainNode,
        },
        ...params,
      });
      break;
  }

  return { nodes: result, consumed: 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const trackChangeNodeHandlerEntity = {
  handlerName: 'trackChangeNodeHandler',
  handler: handleTrackChangeNode,
};
