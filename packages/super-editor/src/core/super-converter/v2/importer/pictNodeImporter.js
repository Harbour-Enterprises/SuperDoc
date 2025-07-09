import { handleParagraphNode } from './paragraphNodeImporter.js';
import { defaultNodeListHandler } from './docxImporter.js';

export const handlePictNode = (params) => {
  const { nodes } = params;

  if (!nodes.length || nodes[0].name !== 'w:p') {
    return { nodes: [], consumed: 0 };
  }

  const [pNode] = nodes;
  const run = pNode.elements?.find((el) => el.name === 'w:r');
  const pict = run?.elements?.find((el) => el.name === 'w:pict');

  // if there is no pict, then process as a paragraph or list.
  if (!pict) {
    return { nodes: [], consumed: 0 };
  }

  const node = pict;
  const shape = node.elements?.find((el) => el.name === 'v:shape');
  const shapetype = node.elements?.find((el) => el.name === 'v:shapetype');
  const group = node.elements?.find((el) => el.name === 'v:group');

  // such a case probably shouldn't exist.
  if (!shape && !group) {
    return { nodes: [], consumed: 0 };
  }

  let result = null;

  const isGroup = group && !shape;

  if (isGroup) {
    // there should be a group of shapes being processed here (skip for now).
    result = null;
  } else {
    const textbox = shape.elements?.find((el) => el.name === 'v:textbox');

    // process shapes with textbox.
    if (textbox) {
      result = handleShapTextboxImport({
        pict,
        pNode,
        shape,
        params,
      });
    }
  }

  return { nodes: result ? [result] : [], consumed: 1 };
};

export function handleShapTextboxImport({ pict, pNode, shape, params }) {
  const schemaAttrs = {};
  const schemaTextboxAttrs = {};

  const shapeAttrs = shape.attributes || {};

  schemaAttrs.attributes = shapeAttrs;

  if (shapeAttrs.fillcolor) {
    schemaAttrs.fillcolor = shapeAttrs.fillcolor;
  }

  const parsedStyle = parseInlineStyles(shapeAttrs.style);
  const shapeStyle = buildStyles(parsedStyle);

  if (shapeStyle) {
    schemaAttrs.style = shapeStyle;
  }

  const textbox = shape.elements?.find((el) => el.name === 'v:textbox');
  const wrap = shape.elements?.find((el) => el.name === 'w10:wrap');

  if (wrap?.attributes) {
    schemaAttrs.wrapAttributes = wrap.attributes;
  }

  if (textbox?.attributes) {
    schemaTextboxAttrs.attributes = textbox.attributes;
  }

  const textboxContent = textbox?.elements?.find((el) => el.name === 'w:txbxContent');
  const textboxContentElems = textboxContent?.elements || [];

  const content = textboxContentElems.map((elem) =>
    handleParagraphNode({
      nodes: [elem],
      docx: params.docx,
      nodeListHandler: defaultNodeListHandler(),
    }),
  );
  const contentNodes = content.reduce((acc, current) => [...acc, ...current.nodes], []);

  const shapeTextbox = {
    type: 'shapeTextbox',
    attrs: schemaTextboxAttrs,
    content: contentNodes,
  };

  const shapeContainer = {
    type: 'shapeContainer',
    attrs: schemaAttrs,
    content: [shapeTextbox],
  };

  return shapeContainer;
}

function parseInlineStyles(styleString) {
  if (!styleString) return {};
  return styleString
    .split(';')
    .filter((style) => !!style.trim())
    .reduce((acc, style) => {
      const [prop, value] = style.split(':').map((str) => str.trim());
      if (prop && value) acc[prop] = value;
      return acc;
    }, {});
}

function buildStyles(styleObject) {
  const allowed = [
    'width',
    'height',

    // these styles should probably work relative to the page,
    // since in the doc it is positioned absolutely.
    // 'margin-left',
    // 'margin-right',

    // causes pagination issues.
    // 'margin-top',
    // 'margin-bottom',

    // styleObject - also contains other word styles (mso-).
  ];

  let style = '';
  for (const [prop, value] of Object.entries(styleObject)) {
    if (allowed.includes(prop)) {
      style += `${prop}: ${value};`;
    }
  }

  return style;
}

export const pictNodeHandlerEntity = {
  handlerName: 'handlePictNode',
  handler: handlePictNode,
};
