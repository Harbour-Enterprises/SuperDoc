import { parseMarks } from './markImporter.js';
import { generateV2HandlerEntity } from '@core/super-converter/v3/handlers/utils';
import { translator as autoPageNumberTranslator } from '../../v3/handlers/sd/autoPageNumber/index.js';

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const autoPageHandlerEntity = generateV2HandlerEntity('autoPageNumberHandler', autoPageNumberTranslator);

/**
 * @type {import("docxImporter").NodeHandler}
 */
const handleAutoTotalPageNumber = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'sd:totalPageNumber') {
    return { nodes: [], consumed: 0 };
  }

  const rPr = nodes[0].elements?.find((el) => el.name === 'w:rPr');
  const marks = parseMarks(rPr || { elements: [] });
  const processedNode = {
    type: 'total-page-number',
    attrs: {
      marksAsAttrs: marks,
    },
  };
  return { nodes: [processedNode], consumed: 1 };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const autoTotalPageCountEntity = {
  handlerName: 'autoTotalPageCountEntity',
  handler: handleAutoTotalPageNumber,
};
