import { translateChildNodes } from '@converter/v2/exporter/helpers/index';

export function translateStructuredContent(params) {
  const { node } = params;
  const { attrs = {} } = node;

  const childContent = translateChildNodes({ ...params, nodes: node.content });

  // We build the sdt node elements here, and re-add passthrough sdtPr node
  const nodeElements = [
    {
      name: 'w:sdtContent',
      elements: childContent,
    },
  ];
  nodeElements.unshift(attrs.sdtPr);

  return {
    name: 'w:sdt',
    elements: nodeElements,
  };
}
