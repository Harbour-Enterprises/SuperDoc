import { Fragment } from 'prosemirror-model';

/**
 * Get the field attributes based on the field type and value
 * 
 * @param {Object} field The field node
 * @param {Object} value The value we want to annotate the field with
 * @returns 
 */
export const getFieldAttrs = (field, value) => {
  const { type } = field.attrs;
  const annotatorHandlers = {
    html: annotateHtml,
    text: annotateText,
    checkbox: annotateCheckbox,
    image: annotateImage,
  }

  const handler = annotatorHandlers[type];
  if (!handler) return {};

  // Run the handler to get the annotated field attributes
  return handler(value);
};

const annotateHtml = (value) => ({ rawHtml: value });
const annotateText = (value) => ({ displayLabel: value });
const annotateImage = (value) => ({ imageSrc: value });
const annotateCheckbox = (value) => ({ displayLabel: value });

/**
 * Pre-process tables in the document to generate rows from annotations if necessary
 * 
 * @param {Object} param0 The editor instance and annotation values
 * @param {Object} param0.editor The editor instance
 * @param {Array} param0.annotationValues The annotation values to process
 */
export const processTables = ({ editor, annotationValues }) => {
  const { state } = editor;
  const { doc } = state;
  const { tr } = state;
  const { dispatch } = editor.view;

  // Get all tables in the document
  const tables = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'table') tables.push({ node, pos });
  });

  tables.reverse().forEach((table) => {
    generateTableIfNecessary({ tableNode: table, annotationValues, tr, editor });
  });
  dispatch(tr);
};
const generateTableIfNecessary = ({ tableNode, annotationValues, tr, editor }) => {
  let rowNodeToGenerate = null;
  let currentRow = null;

  const {
    tableRow: RowType,
    tableCell: CellType,
    fieldAnnotation: FieldType,
    paragraph: ParaType
  } = editor.schema.nodes;

  // Find the row with fieldAnnotations that are arrays
  tableNode.node.descendants((node, pos) => {
    if (rowNodeToGenerate) return true;
    if (node.type === RowType) currentRow = { node, pos };
    if (node.type === FieldType) {
      const annotationValue = getAnnotationValue(node.attrs.fieldId, annotationValues);
      if (Array.isArray(annotationValue)) rowNodeToGenerate = currentRow;
    }
  });

  if (!rowNodeToGenerate) return;

  const { node: rowNode, pos: rowStartPos } = rowNodeToGenerate;
  const absoluteRowStart = tr.mapping.map(tableNode.pos + rowStartPos);
  const absoluteRowEnd = absoluteRowStart + rowNode.nodeSize;

  const rowAnnotations = [];
  let rowsToGenerate = 0;
  rowNode.descendants((childNode, childPos) => {
    if (childNode.type === FieldType) {
      const annotationValue = getAnnotationValue(childNode.attrs.fieldId, annotationValues);
      rowAnnotations.push({ node: childNode, pos: childPos, values: annotationValue });
      if (Array.isArray(annotationValue)) {
        rowsToGenerate = Math.max(rowsToGenerate, annotationValue.length);
      }
    }
  });

  if (rowsToGenerate <= 1) return;

  const rebuildCell = (cellNode, rowIndex) => {
    const updatedBlocks = cellNode.content.content.map((blockNode) => {
      if (blockNode.type !== ParaType) return blockNode;

      const updatedInlines = blockNode.content.content.map((inlineNode) => {
        if (inlineNode.type !== FieldType) return inlineNode;

        let matchedAnnotationValues = getAnnotationValue(inlineNode.attrs.fieldId, annotationValues);
        if (!Array.isArray(matchedAnnotationValues)) matchedAnnotationValues = [matchedAnnotationValues];
        const value = matchedAnnotationValues?.[rowIndex];

        const extraAttrs = getFieldAttrs(inlineNode, value);
        return FieldType.create(
          { ...inlineNode.attrs, ...extraAttrs, generatorIndex: rowIndex },
          inlineNode.content,
          inlineNode.marks
        );
      });

      return ParaType.create(blockNode.attrs, Fragment.from(updatedInlines), blockNode.marks);
    });

    return CellType.create(cellNode.attrs, Fragment.from(updatedBlocks), cellNode.marks);
  };

  // Insert new rows in reverse *after* the current row
  for (let rowIndex = rowsToGenerate - 1; rowIndex >= 0; rowIndex--) {
    const mappedInsertPos = tr.mapping.map(absoluteRowEnd) + 1;
    const newCells = rowNode.content.content.map((cellNode) => rebuildCell(cellNode, rowIndex));
    const newRow = RowType.create(rowNode.attrs, Fragment.from(newCells), rowNode.marks);
    tr.insert(mappedInsertPos, Fragment.from(newRow));
  }

  // Now delete the original row
  const mappedDeleteStart = tr.mapping.map(absoluteRowStart);
  const mappedDeleteEnd = mappedDeleteStart + rowNode.nodeSize;
  tr.delete(mappedDeleteStart - 1, mappedDeleteEnd + 1);
};


const getAnnotationValue = (id, annotationValues) => {
  return annotationValues.find((value) => value.input_id === id)?.input_value || null;
};

export const AnnotatorServices = {
  getFieldAttrs,
  processTables,
};
