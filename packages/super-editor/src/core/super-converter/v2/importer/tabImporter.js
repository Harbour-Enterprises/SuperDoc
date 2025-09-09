import { translator as wTabNodeTranslator } from '../../v3/handlers/w/tab/tab-translator.js';

/**
 * @type {import('docxImporter').NodeHandler}
 */
const handleTabNode = (params) => {
  const { nodes } = params;
  if (!nodes.length || nodes[0].name !== 'w:tab') {
    return { nodes: [], consumed: 0 };
  }
  const node = wTabNodeTranslator.encode(params);
  return { nodes: [node], consumed: 1 };
};

/**
 * @type {import('docxImporter').NodeHandlerEntry}
 */
export const tabNodeEntityHandler = {
  handlerName: 'w:tabTranslator',
  handler: handleTabNode,
};
