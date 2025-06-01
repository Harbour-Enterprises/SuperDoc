import { Fragment } from 'prosemirror-model';
import { fieldAnnotationHelpers } from '@extensions/index.js';

/**
 * Get the field attributes based on the field type and value
 *
 * @param {Object} field The field node
 * @param {Object} value The value we want to annotate the field with
 * @returns
 */
export const getFieldAttrs = (field, value, input) => {
  const { type } = field.attrs;
  const annotatorHandlers = {
    html: annotateHtml,
    text: annotateText,
    checkbox: annotateCheckbox,
    image: annotateImage,
    link: annotateLink,
    yesno: annotateYesNo,
    date: annotateDate,
  };

  const handler = annotatorHandlers[type];
  if (!handler) return {};

  // Run the handler to get the annotated field attributes
  return handler(value, input);
};

const annotateHtml = (value) => ({ rawHtml: value });
const annotateText = (value) => ({ displayLabel: value });
const annotateImage = (value) => ({ imageSrc: value });
const annotateCheckbox = (value) => ({ displayLabel: value });

const annotateDate = (value, input) => {
  const formatted = getFormattedDate(value, input.input_format);
  return { displayLabel: formatted };
};

const annotateLink = (value) => {
  if (!value.startsWith('http')) value = `http://${value}`;
  return { linkUrl: value };
};

const annotateYesNo = (value) => {
  const yesNoValues = {
    YES: 'Yes',
    NO: 'No',
  };
  const parsedValue = yesNoValues[value[0].toUpperCase()];
  return { displayLabel: parsedValue };
};

/**
 * Pre-process tables in the document to generate rows from annotations if necessary
 *
 * @param {Object} param0 The editor instance and annotation values
 * @param {Object} param0.editor The editor instance
 * @param {Array} param0.annotationValues The annotation values to process
 */
export const processTables = ({ editor, tr, annotationValues }) => {
  const { state } = editor;
  const { doc } = state;

  // Get all tables in the document
  const tables = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'table') tables.push({ node, pos });
  });

  tables.reverse().forEach((table) => {
    generateTableIfNecessary({ tableNode: table, annotationValues, tr, editor });
  });

  return tr;
};

const generateTableIfNecessary = ({ tableNode, annotationValues, tr, editor }) => {
  let rowNodeToGenerate = null;
  let currentRow = null;

  const {
    tableRow: RowType,
    tableCell: CellType,
    fieldAnnotation: FieldType,
    paragraph: ParaType,
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
          inlineNode.marks,
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

export const annotateDocument = ({ annotationValues = [], hiddenFieldIds = [], schema, tr }) => {
  const annotations = [];
  const FieldType = schema.nodes.fieldAnnotation;
  tr.doc.descendants((node, pos) => {
    if (node.type === FieldType) {
      annotations.push({ node, pos, size: node.nodeSize });
    }
  });

  const toDelete = new Set();

  if (hiddenFieldIds.length) {
    for (const { node, pos } of annotations) {
      if (hiddenFieldIds.includes(node.attrs.fieldId)) {
        toDelete.add(pos);
      }
    }
  }

  // For each annotation, either queue it for deletion or queue an update
  for (const { node, pos } of annotations) {
    const { type, fieldType, fieldId } = node.attrs;
    if (toDelete.has(pos)) continue;

    let newValue = null;
    const input = annotationValues.find((i) => i.input_id === fieldId);

    if (!input) {
      const checkboxInputs = annotationValues.filter((i) => i.input_field_type === 'CHECKBOXINPUT');
      inputsLoop: for (const cb of checkboxInputs) {
        for (const opt of cb.input_options) {
          if (opt.itemid === fieldId) {
            newValue = cb.input_link_value[opt.itemid] || ' ';
            break inputsLoop;
          }
        }
      }
    }
    newValue = newValue || input?.input_value || null;

    // skip table-generator placeholders
    if (Array.isArray(newValue) && node.attrs.generatorIndex != null) {
      continue;
    }

    if (type === 'checkbox' || fieldType === 'CHECKBOXINPUT') {
      const isEmptyOrSquare = !newValue || (typeof newValue === 'string' && newValue.codePointAt(0) === 0x2610);
      if (isEmptyOrSquare) newValue = ' ';
    }

    // queue delete or update
    if (!newValue) {
      toDelete.add(pos);
    } else {
      const attrs = getFieldAttrs(node, newValue, input);
      tr = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs,
      });
    }
  }

  // perform deletes all in one go (descending positions)
  Array.from(toDelete)
    .sort((a, b) => b - a)
    .forEach((pos) => {
      const ann = annotations.find((a) => a.pos === pos);
      if (!ann) return;
      tr = tr.delete(pos, pos + ann.node.nodeSize);
    });

  return tr;
};

/**
 * Format the date to the given format
 *
 * @param {String} input The date value
 * @param {String} format The date format
 */
const getFormattedDate = (input = null, format = '') => {
  // 1. Parse: if input is falsy, use "now"; otherwise let Date handle it.
  const date = input ? new Date(input) : new Date();

  // 2. If invalid, just return what you got.
  if (isNaN(date.getTime())) {
    return input;
  }

  // 3. If a custom format was requested, use the dateFormat lib:
  if (format) return dateFormat(date, format);

  // 4. Otherwise, do a single toLocaleDateString call:
  return date.toLocaleDateString('en-US', {
    month: 'short', // e.g. “May”
    day: '2-digit', // e.g. “05”
    year: 'numeric', // e.g. “2025”
  });
};

export const AnnotatorServices = {
  getFieldAttrs,
  processTables,
  annotateDocument,
};
