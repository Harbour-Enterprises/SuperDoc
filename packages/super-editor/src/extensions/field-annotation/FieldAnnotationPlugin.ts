import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Slice, Node as PmNode } from 'prosemirror-model';
import { mergeRanges, clampRange } from '@core/helpers/rangeUtils.js';
import { trackFieldAnnotationsDeletion } from './fieldAnnotationHelpers/trackFieldAnnotationsDeletion.js';
import { getAllFieldAnnotations } from './fieldAnnotationHelpers/getAllFieldAnnotations.js';
import type { Editor } from '@core/index.js';

/**
 * Creates a ProseMirror plugin for managing field annotations.
 * Handles drag-and-drop, paste operations, and automatically removes marks from field annotations.
 * @param {Object} [options={}] - Plugin configuration options
 * @param {Object} options.editor - Editor instance
 * @param {string} options.annotationClass - CSS class name for annotation elements
 * @param {Function} [options.handleDropOutside] - Optional custom handler for drops outside the editor
 * @returns {Plugin} ProseMirror plugin for field annotations
 * @example
 * const plugin = FieldAnnotationPlugin({ editor, annotationClass: 'field-annotation' });
 */
interface FieldAnnotationPluginOptions {
  editor: Editor;
  annotationClass: string;
  handleDropOutside?: boolean;
}

interface DropOutsideParams {
  fieldAnnotation: string;
  editor: Editor;
  view: EditorView;
  event: DragEvent;
}

export const FieldAnnotationPlugin = (options: FieldAnnotationPluginOptions) => {
  const { editor, annotationClass } = options;

  return new Plugin({
    key: new PluginKey('fieldAnnotation'),

    state: {
      init() {
        return null;
      },

      apply(tr, prevState) {
        trackFieldAnnotationsDeletion(editor, tr);

        return prevState;
      },
    },

    props: {
      handleDrop(view, event, slice, moved) {
        if (moved) return false;

        const fieldAnnotation = event?.dataTransfer.getData('fieldAnnotation');

        if (fieldAnnotation) {
          if (options.handleDropOutside) {
            handleDropOutside({
              fieldAnnotation,
              editor,
              view,
              event,
            });
          } else {
            let annotationAttrs;

            try {
              const fieldAnnotationObj = JSON.parse(fieldAnnotation);
              annotationAttrs = fieldAnnotationObj.attributes;
            } catch {
              return false;
            }

            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });

            if (coordinates) {
              editor.commands.addFieldAnnotation(coordinates.pos, {
                ...annotationAttrs,
              });
            }
          }

          return true;
        }

        return false;
      },

      handlePaste(view, event, slice) {
        const content = slice.content.content.filter((item) => item.type.name === 'fieldAnnotation');
        if (content.length) {
          editor.emit('fieldAnnotationPaste', {
            content,
            editor,
          });
        }
        return false;
      },

      handleDOMEvents: {
        dragstart: (view, event) => {
          if (!event.target) return false;

          const { target } = event;
          const isAnnotationField = (target as HTMLElement).classList?.contains(annotationClass);

          if (isAnnotationField) {
            event.dataTransfer?.setDragImage(target as Element, 0, 0);
          }

          return false;
        },

        // drop: (view, event) => {
        //   console.log({ view, event });
        // },
      },
    },

    /// For y-prosemirror support.
    appendTransaction: (transactions, oldState, newState) => {
      /*
       * OPTIMIZATION STRATEGY:
       * Instead of scanning the entire document on every change, we:
       * 1. Extract affected ranges from transaction steps to limit our search area
       * 2. Check if field annotations exist in the transaction slice (early exit if adding new ones)
       * 3. Only scan affected ranges for existing annotations (not the full document)
       * 4. Fall back to full document scan only if an error occurs during range processing
       * 5. Remove marks only from field annotations found in affected areas
       *
       * This reduces O(n) full-document scans to O(k) where k is the size of changed regions.
       */
      const docChanges = transactions.some((tr) => tr.docChanged) && !oldState.doc.eq(newState.doc);

      if (!docChanges) {
        return;
      }

      const affectedRanges = [];
      let hasFieldAnnotationsInSlice = false;
      let hasSteps = false;

      transactions.forEach((transaction) => {
        if (!transaction.steps) return;
        hasSteps = true;

        transaction.steps.forEach((step) => {
          // Type assertion for ReplaceStep which has slice property
          const replaceStep = step as { from?: number; to?: number; slice?: Slice };

          // Check if inserted content has field annotations
          if (replaceStep.slice?.content) {
            replaceStep.slice.content.descendants((node: PmNode) => {
              if (node.type.name === 'fieldAnnotation') {
                hasFieldAnnotationsInSlice = true;
                return false;
              }
            });
          }

          // Always track affected ranges for any doc changes that might affect existing field annotations
          if (typeof replaceStep.from === 'number' && typeof replaceStep.to === 'number') {
            // For pure insertions (from === to), derive range from slice size
            const from = replaceStep.from;
            const to =
              replaceStep.from === replaceStep.to && replaceStep.slice?.size
                ? replaceStep.from + replaceStep.slice.size
                : replaceStep.to;
            affectedRanges.push([from, to]);
          }
        });
      });

      // If no steps, fall back to full-scan path (transactions from yjs/helpers can have docChanged without steps)
      // Skip the range-based optimization and let the full scan handle it below

      // If we have steps but no field annotations in inserted content, check if affected ranges contain existing annotations
      if (hasSteps && !hasFieldAnnotationsInSlice && affectedRanges.length > 0) {
        const mergedRanges = mergeRanges(affectedRanges);
        let hasExistingAnnotations = false;

        for (const [start, end] of mergedRanges) {
          const clampedRange = clampRange(start, end, newState.doc.content.size);

          if (!clampedRange) continue;

          const [validStart, validEnd] = clampedRange;

          try {
            newState.doc.nodesBetween(validStart, validEnd, (node) => {
              if (node.type.name === 'fieldAnnotation') {
                hasExistingAnnotations = true;
                return false;
              }
            });
          } catch (error) {
            console.warn('FieldAnnotationPlugin: range check failed, assuming annotations exist', error);
            // If range check fails, assume there might be annotations and continue to main logic
            hasExistingAnnotations = true;
            break;
          }

          if (hasExistingAnnotations) break;
        }

        if (!hasExistingAnnotations) {
          return;
        }
      }

      const { tr } = newState;
      let changed = false;

      /**
       * Removes marks from the field annotation node when it still matches the transaction snapshot.
       * @param {import('prosemirror-model').Node} node - Annotation node discovered in the document.
       * @param {number} pos - Position of the node within the current transaction.
       */
      const removeMarksFromAnnotation = (node: PmNode, pos: number) => {
        const { marks } = node;
        const currentNode = tr.doc.nodeAt(pos);

        if (marks.length > 0 && node.eq(currentNode)) {
          tr.removeMark(pos, pos + node.nodeSize, null);
          changed = true;
        }
      };

      if (affectedRanges.length > 0) {
        const mergedRanges = mergeRanges(affectedRanges);
        let shouldFallbackToFullScan = false;

        for (const [start, end] of mergedRanges) {
          const clampedRange = clampRange(start, end, newState.doc.content.size);

          if (!clampedRange) continue;

          const [validStart, validEnd] = clampedRange;

          try {
            newState.doc.nodesBetween(validStart, validEnd, (node, pos) => {
              if (node.type.name === 'fieldAnnotation') {
                removeMarksFromAnnotation(node, pos);
              }
            });
          } catch (error) {
            console.warn('FieldAnnotationPlugin: nodesBetween failed, falling back to full scan', error);
            // Range-based scan failed due to document structure changes, fall back to full scan
            shouldFallbackToFullScan = true;
            break;
          }
        }

        // If range-based processing failed, do a full document scan
        if (shouldFallbackToFullScan) {
          const annotations = getAllFieldAnnotations(newState);
          if (!annotations.length) {
            return changed ? tr : null;
          }

          annotations.forEach(({ node, pos }) => {
            removeMarksFromAnnotation(node, pos);
          });
        }
      } else {
        const annotations = getAllFieldAnnotations(newState);

        if (!annotations.length) {
          return;
        }

        annotations.forEach(({ node, pos }) => {
          removeMarksFromAnnotation(node, pos);
        });
      }

      return changed ? tr : null;
    },
    ///
  });
};

/**
 * Handles drag-and-drop of field annotations outside the editor.
 * Emits a 'fieldAnnotationDropped' event with drop coordinates and source field information.
 * @private
 * @param {Object} params - Drop event parameters
 * @param {string} params.fieldAnnotation - JSON string containing annotation data
 * @param {Object} params.editor - Editor instance
 * @param {Object} params.view - ProseMirror view
 * @param {DragEvent} params.event - Browser drag event
 * @returns {void}
 */
function handleDropOutside({ fieldAnnotation, editor, view, event }: DropOutsideParams) {
  let sourceField;
  try {
    const fieldAnnotationObj = JSON.parse(fieldAnnotation);
    sourceField = fieldAnnotationObj.sourceField;
  } catch {
    return;
  }

  const coordinates = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });

  if (coordinates) {
    editor.emit('fieldAnnotationDropped', {
      sourceField,
      editor,
      coordinates,
      pos: coordinates.pos,
    });
  }
}
