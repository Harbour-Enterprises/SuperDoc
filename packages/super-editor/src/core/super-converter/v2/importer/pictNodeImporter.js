// @ts-check
import { translator as pictTranslator } from '../../v3/handlers/w/pict/pict-translator';

export const handlePictNode = (params) => {
  const { nodes } = params;

  if (!nodes.length || nodes[0].name !== 'w:p') {
    return { nodes: [], consumed: 0 };
  }

  const pNode = nodes[0];
  const runs = pNode.elements?.filter((el) => el.name === 'w:r') || [];

  let pict = null;
  for (const run of runs) {
    const foundPict = run.elements?.find((el) => el.name === 'w:pict');
    if (foundPict) {
      pict = foundPict;
      break;
    }
  }

  // if there is no pict, then process as a paragraph or list.
  if (!pict) {
    return { nodes: [], consumed: 0 };
  }

  const node = pict;
  const result = pictTranslator.encode({ ...params, extraParams: { node, pNode } });

  if (!result) {
    return { nodes: [], consumed: 0 };
  }

  return {
    nodes: [result],
    consumed: 1,
  };
};

export const pictNodeHandlerEntity = {
  handlerName: 'handlePictNode',
  handler: handlePictNode,
};
