import type { Node as PmNode, Schema } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';
import { Fragment } from 'prosemirror-model';

/**
 * Annotation value from the backend
 */
interface AnnotationValue {
  input_id: string;
  input_value: string | string[] | null;
  input_field_type?: string;
  input_format?: string;
  input_options?: Array<{ itemid: string }>;
  input_link_value?: Record<string, string>;
}

/**
 * Field node attributes
 */
interface FieldNodeAttrs {
  type?: string;
  fieldType?: string;
  fieldId: string;
  generatorIndex?: number | null;
  displayLabel?: string;
  rawHtml?: string;
  linkUrl?: string;
  imageSrc?: string;
  [key: string]: unknown;
}

/**
 * Field annotation attributes returned by annotators
 */
type FieldAnnotationAttrs = {
  displayLabel?: string;
  rawHtml?: string;
  linkUrl?: string;
  imageSrc?: string;
};

/**
 * Handler function for annotating fields
 */
type AnnotatorHandler = (value: string | string[], input: AnnotationValue | null) => FieldAnnotationAttrs;

/**
 * Get the field attributes based on the field type and value
 */
export const getFieldAttrs = (
  field: PmNode,
  value: string | string[] | null,
  input: AnnotationValue | null,
): FieldAnnotationAttrs => {
  const attrs = field.attrs as FieldNodeAttrs;
  const { type } = attrs;

  const annotatorHandlers: Record<string, AnnotatorHandler> = {
    html: annotateHtml,
    text: annotateText,
    checkbox: annotateCheckbox,
    image: annotateImage,
    link: annotateLink,
    yesno: annotateYesNo,
    date: annotateDate,
  };

  const handler = type ? annotatorHandlers[type] : undefined;
  if (!handler) return {};

  // Run the handler to get the annotated field attributes
  return handler(value || '', input);
};

const annotateHtml = (value: string | string[]): FieldAnnotationAttrs => ({
  rawHtml: Array.isArray(value) ? value.join('') : value,
});

const annotateText = (value: string | string[]): FieldAnnotationAttrs => ({
  displayLabel: Array.isArray(value) ? value.join('') : value,
});

const annotateImage = (value: string | string[]): FieldAnnotationAttrs => ({
  imageSrc: Array.isArray(value) ? value[0] : value,
});

const annotateCheckbox = (value: string | string[]): FieldAnnotationAttrs => ({
  displayLabel: Array.isArray(value) ? value.join('') : value,
});

const annotateDate = (value: string | string[], input: AnnotationValue | null): FieldAnnotationAttrs => {
  const stringValue = Array.isArray(value) ? value[0] : value;
  const formatted = getFormattedDate(stringValue, input?.input_format);
  return { displayLabel: formatted };
};

const annotateLink = (value: string | string[]): FieldAnnotationAttrs => {
  let linkValue = Array.isArray(value) ? value[0] : value;
  if (linkValue && !linkValue.startsWith('http')) {
    linkValue = `http://${linkValue}`;
  }
  return { linkUrl: linkValue };
};

const annotateYesNo = (value: string | string[]): FieldAnnotationAttrs => {
  const yesNoValues: Record<string, string> = {
    YES: 'Yes',
    NO: 'No',
  };
  const stringValue = Array.isArray(value) ? value[0] : value;
  const normalized = typeof stringValue === 'string' ? stringValue.toUpperCase() : undefined;
  const parsedValue = normalized ? yesNoValues[normalized] : undefined;
  return { displayLabel: parsedValue };
};

/**
 * Pre-process tables in the document to generate rows from annotations if necessary
 */
export const processTables = ({
  state,
  tr,
  annotationValues,
}: {
  state: EditorState;
  tr: Transaction;
  annotationValues: AnnotationValue[];
}): Transaction => {
  const { doc } = state;

  // Get all tables in the document
  const tables: Array<{ node: PmNode; pos: number }> = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'table') tables.push({ node, pos });
  });

  // Process tables in reverse order to maintain position integrity
  tables.reverse().forEach(({ pos }) => {
    const currentTableNode = tr.doc.nodeAt(pos);
    if (!currentTableNode || currentTableNode.type.name !== 'table') return;

    try {
      generateTableIfNecessary({ tableNode: { node: currentTableNode, pos }, annotationValues, tr, state });
    } catch (error) {
      console.error('Error generating table at pos', pos, ':', error);
      // Continue processing other tables even if one fails
    }
  });

  return tr;
};

const generateTableIfNecessary = ({
  tableNode,
  annotationValues,
  tr,
  state,
}: {
  tableNode: { node: PmNode; pos: number };
  annotationValues: AnnotationValue[];
  tr: Transaction;
  state: EditorState;
}): void => {
  const {
    tableRow: RowType,
    tableCell: CellType,
    fieldAnnotation: FieldType,
    paragraph: ParaType,
  } = state.schema.nodes;

  // Find rows with field annotations that have array values
  const rows: Array<{ node: PmNode; pos: number }> = [];
  tableNode.node.descendants((node, pos) => {
    if (node.type === RowType) {
      rows.push({ node, pos });
    }
  });

  // Check each row for field annotations with array values
  let rowNodeToGenerate: { node: PmNode; pos: number } | null = null;
  for (const row of rows) {
    let hasArrayAnnotation = false;

    row.node.descendants((node) => {
      if (node.type === FieldType) {
        const attrs = node.attrs as FieldNodeAttrs;
        const annotationValue = getAnnotationValue(attrs.fieldId, annotationValues);
        if (Array.isArray(annotationValue) && attrs.generatorIndex === null) {
          hasArrayAnnotation = true;
        }
      }
    });

    if (hasArrayAnnotation) {
      rowNodeToGenerate = row;
      break;
    }
  }

  if (!rowNodeToGenerate) return;

  const { node: rowNode, pos: rowStartPos } = rowNodeToGenerate;

  // Calculate the absolute position of the row in the document
  const absoluteRowStart = tableNode.pos + 1 + rowStartPos; // +1 for table node itself

  // Count how many rows we need to generate based on array lengths
  let rowsToGenerate = 0;
  rowNode.descendants((childNode) => {
    if (childNode.type === FieldType) {
      const attrs = childNode.attrs as FieldNodeAttrs;
      const annotationValue = getAnnotationValue(attrs.fieldId, annotationValues);
      if (Array.isArray(annotationValue)) {
        rowsToGenerate = Math.max(rowsToGenerate, annotationValue.length);
      }
    }
  });

  if (rowsToGenerate <= 1) return;

  // Validate and clean attributes to ensure proper rendering
  const validateAttributes = (attrs: Record<string, unknown>): Record<string, unknown> => {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined && value !== null) {
        // Ensure displayLabel is always a string for proper rendering
        if (key === 'displayLabel') {
          cleaned[key] = String(value);
        }
        // Ensure other string fields are strings
        else if (key === 'rawHtml' || key === 'linkUrl' || key === 'imageSrc') {
          cleaned[key] = String(value);
        }
        // Keep other values as-is if they're valid
        else if (typeof value === 'string' && value.length > 0) {
          cleaned[key] = value;
        } else if (typeof value !== 'string') {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  };

  // Rebuild a cell with the correct annotation values for a specific row index
  const rebuildCell = (cellNode: PmNode, rowIndex: number): PmNode => {
    try {
      const updatedBlocks = cellNode.content.content.map((blockNode) => {
        if (blockNode.type !== ParaType) return blockNode;

        const updatedInlines = blockNode.content.content.map((inlineNode) => {
          if (inlineNode.type !== FieldType) return inlineNode;

          // Get the value for this row index
          const attrs = inlineNode.attrs as FieldNodeAttrs;
          let matchedAnnotationValues = getAnnotationValue(attrs.fieldId, annotationValues);
          if (!Array.isArray(matchedAnnotationValues)) {
            matchedAnnotationValues = matchedAnnotationValues ? [matchedAnnotationValues] : [];
          }
          const value = matchedAnnotationValues[rowIndex];

          // Get extra attributes from field handlers
          let extraAttrs: Record<string, unknown> = {};
          try {
            const rawExtraAttrs = getFieldAttrs(inlineNode, value, null);
            extraAttrs = validateAttributes(rawExtraAttrs || {});
          } catch (error) {
            console.error('Error getting field attrs:', error);
            extraAttrs = {};
          }

          // Build new attributes
          const baseAttrs = validateAttributes((inlineNode.attrs as Record<string, unknown>) || {});
          const newAttrs: Record<string, unknown> = {
            ...baseAttrs,
            ...extraAttrs,
            generatorIndex: rowIndex,
          };

          // Create new field node
          try {
            return FieldType.create(newAttrs, inlineNode.content || Fragment.empty, inlineNode.marks || []);
          } catch (error) {
            console.error('Error creating field node:', error);

            // Fallback: minimal attributes
            try {
              const fallbackAttrs = {
                ...baseAttrs,
                generatorIndex: rowIndex,
                displayLabel: String(value || ''),
              };
              return FieldType.create(
                validateAttributes(fallbackAttrs),
                inlineNode.content || Fragment.empty,
                inlineNode.marks || [],
              );
            } catch (fallbackError) {
              console.error('Fallback also failed:', fallbackError);
              return inlineNode; // Return original node as last resort
            }
          }
        });

        // Create new paragraph
        try {
          return ParaType.create(
            validateAttributes((blockNode.attrs as Record<string, unknown>) || {}),
            Fragment.from(updatedInlines),
            blockNode.marks || [],
          );
        } catch (error) {
          console.error('Error creating paragraph node:', error);
          return blockNode;
        }
      });

      // Create new cell
      return CellType.create(
        validateAttributes((cellNode.attrs as Record<string, unknown>) || {}),
        Fragment.from(updatedBlocks),
        cellNode.marks || [],
      );
    } catch (error) {
      console.error(`Failed to rebuild cell for row ${rowIndex}:`, error);
      throw error;
    }
  };

  try {
    // Create all the new rows
    const newRows: PmNode[] = [];
    for (let rowIndex = 0; rowIndex < rowsToGenerate; rowIndex++) {
      const newCells = rowNode.content.content.map((cellNode) => rebuildCell(cellNode, rowIndex));
      const newRow = RowType.create(
        validateAttributes((rowNode.attrs as Record<string, unknown>) || {}),
        Fragment.from(newCells),
        rowNode.marks || [],
      );
      newRows.push(newRow);
    }

    // Replace the original row with all new rows in a single atomic operation
    const mappedRowStart = tr.mapping.map(absoluteRowStart);
    const rowEnd = mappedRowStart + rowNode.nodeSize;

    tr.replaceWith(mappedRowStart, rowEnd, Fragment.from(newRows));
    tr.setMeta('tableGeneration', true);
  } catch (error) {
    console.error('Error during row generation:', error);
    throw error;
  }
};

const getAnnotationValue = (id: string, annotationValues: AnnotationValue[]): string | string[] | null => {
  return annotationValues.find((value) => value.input_id === id)?.input_value || null;
};

/**
 * Get all header and footer editors from the editor instance
 */
export const getAllHeaderFooterEditors = (): unknown[] => [];

/**
 * Annotate headers and footers in the document (legacy, currently a no-op)
 */
const annotateHeadersAndFooters = (): void => {
  /* noop */
};

export const annotateDocument = ({
  annotationValues = [],
  hiddenFieldIds = [],
  removeEmptyFields = false,
  schema,
  tr,
}: {
  annotationValues?: AnnotationValue[];
  hiddenFieldIds?: string[];
  removeEmptyFields?: boolean;
  schema: Schema;
  tr: Transaction;
}): Transaction => {
  // Header/footer annotation removed with pagination legacy

  const annotations: Array<{ node: PmNode; pos: number; size: number }> = [];
  const FieldType = schema.nodes.fieldAnnotation;
  tr.doc.descendants((node, pos) => {
    if (node.type === FieldType) {
      annotations.push({ node, pos, size: node.nodeSize });
    }
  });

  const toDelete = new Set<number>();

  if (hiddenFieldIds.length) {
    for (const { node, pos } of annotations) {
      const attrs = node.attrs as FieldNodeAttrs;
      if (hiddenFieldIds.includes(attrs.fieldId)) {
        toDelete.add(pos);
      }
    }
  }

  // For each annotation, either queue it for deletion or queue an update
  for (const { node, pos } of annotations) {
    const attrs = node.attrs as FieldNodeAttrs;
    const { type, fieldType, fieldId } = attrs;
    if (toDelete.has(pos)) continue;

    let newValue: string | string[] | null = null;
    const input = annotationValues.find((i) => i.input_id === fieldId);

    if (!input) {
      const checkboxInputs = annotationValues.filter((i) => i.input_field_type === 'CHECKBOXINPUT');
      inputsLoop: for (const cb of checkboxInputs) {
        const options = cb.input_options || [];
        for (const opt of options) {
          if (opt.itemid === fieldId) {
            newValue = cb.input_link_value?.[opt.itemid] || ' ';
            break inputsLoop;
          }
        }
      }
    }
    newValue = newValue || input?.input_value || null;

    // skip table-generator placeholders
    if (Array.isArray(newValue) && attrs.generatorIndex != null) {
      continue;
    }

    if (type === 'checkbox' || fieldType === 'CHECKBOXINPUT') {
      const codePoint = typeof newValue === 'string' ? newValue.codePointAt(0) : undefined;
      const isEmptyOrSquare = !newValue || (codePoint !== undefined && codePoint === 0x2610);
      if (isEmptyOrSquare) newValue = ' ';
    }

    // queue delete or update
    if (!newValue) {
      toDelete.add(pos);
    } else {
      const fieldAttrs = getFieldAttrs(node, newValue, input ?? null);
      tr = tr.setNodeMarkup(pos, undefined, {
        ...(node.attrs as Record<string, unknown>),
        ...fieldAttrs,
      });
    }
  }

  if (removeEmptyFields) {
    // perform deletes all in one go (descending positions)
    Array.from(toDelete)
      .sort((a, b) => b - a)
      .forEach((pos) => {
        const ann = annotations.find((a) => a.pos === pos);
        if (!ann) return;
        tr = tr.delete(pos, pos + ann.node.nodeSize);
      });
  }

  return tr;
};

/**
 * Format the date to the given format
 */
const getFormattedDate = (input: string | null = null, format = ''): string => {
  // 1. Parse: if input is falsy, use "now"; otherwise let Date handle it.
  const date = input ? new Date(input) : new Date();

  // 2. If invalid, just return what you got.
  if (isNaN(date.getTime())) {
    return input ?? '';
  }

  // 3. If a global dateFormat function is available (e.g., from dateformat library), use it
  const globalWithDateFormat = globalThis as typeof globalThis & {
    dateFormat?: (date: Date, format: string) => string;
  };
  if (typeof globalWithDateFormat.dateFormat === 'function') {
    return globalWithDateFormat.dateFormat(date, format || 'mmm dd, yyyy');
  }

  // 4. Fall back to toLocaleDateString:
  return date.toLocaleDateString('en-US', {
    month: 'short', // e.g. "May"
    day: '2-digit', // e.g. "05"
    year: 'numeric', // e.g. "2025"
  });
};

export const AnnotatorHelpers = {
  getFieldAttrs,
  processTables,
  annotateDocument,
  annotateHeadersAndFooters,
  getAllHeaderFooterEditors,
};
