import { parseProperties } from './importerHelpers.js';
import { createImportMarks } from './markImporter.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
const handleRunNode = (params) => {
  const { nodes, nodeListHandler, parentStyleId, docx } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:r') {
    return { nodes: [], consumed: 0 };
  }
  const node = nodes[0];

  const childParams = { ...params, nodes: node.elements };
  let processedRun = nodeListHandler.handler(childParams)?.filter((n) => n) || [];
  const hasRunProperties = node.elements?.some((el) => el.name === 'w:rPr');
  const defaultNodeStyles = getMarksFromStyles(docx, parentStyleId);

  if (hasRunProperties) {
    const { marks = [], attributes = {} } = parseProperties(node);

    // Apply fonts from related style definition if there is no marks
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    const hasFontStyle = textStyleMark && Object.keys(textStyleMark.attrs).length > 0;
    if (defaultNodeStyles.marks && !hasFontStyle) {
      const hasBoldDisabled = marks.find((m) => m.type === 'bold')?.attrs?.value === '0';
      for (let mark of defaultNodeStyles.marks) {
        if (['bold'].includes(mark.type) && hasBoldDisabled) continue;
        marks.push(mark);
      }
    }

    if (node.marks) marks.push(...node.marks);
    const newMarks = createImportMarks(marks);
    processedRun = processedRun.map((n) => {
      const existingMarks = n.marks || [];
      return { ...n, marks: [...newMarks, ...existingMarks], attributes };
    });
  } else if (defaultNodeStyles.marks) {
    processedRun = processedRun.map((n) => ({ ...n, marks: createImportMarks(defaultNodeStyles.marks) }));
  }
  return { nodes: processedRun, consumed: 1 };
};

const getMarksFromStyles = (docx, styleId) => {
  const styles = docx?.['word/styles.xml'];
  if (!styles) {
    return {};
  }

  const styleTags = styles.elements[0].elements.filter((style) => style.name === 'w:style');
  const style = styleTags.find((tag) => tag.attributes['w:styleId'] === styleId) || {};

  if (!style) return {};

  return parseProperties(style, docx);
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const runNodeHandlerEntity = {
  handlerName: 'runNodeHandler',
  handler: handleRunNode,
};
