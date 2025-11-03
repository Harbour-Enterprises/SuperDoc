import { Plugin, PluginKey } from 'prosemirror-state';
import { trackFieldAnnotationsDeletion } from './fieldAnnotationHelpers/trackFieldAnnotationsDeletion.js';
import { getAllFieldAnnotations } from './fieldAnnotationHelpers/getAllFieldAnnotations.js';

export const FieldAnnotationPlugin = (options = {}) => {
  let { editor, annotationClass } = options;

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

        let fieldAnnotation = event?.dataTransfer.getData('fieldAnnotation');

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
              let fieldAnnotationObj = JSON.parse(fieldAnnotation);
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

          let { target } = event;
          let isAnnotationField = target.classList?.contains(annotationClass);

          if (isAnnotationField) {
            event.dataTransfer?.setDragImage(target, 0, 0);
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
      let docChanges = transactions.some((tr) => tr.docChanged) && !oldState.doc.eq(newState.doc);

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
          if (step.slice?.content) {
            step.slice.content.descendants((node) => {
              if (node.type.name === 'fieldAnnotation') {
                hasFieldAnnotationsInSlice = true;
                return false;
              }
            });
          }

          if (typeof step.from === 'number' && typeof step.to === 'number') {
            const from = step.from;
            const to = step.from === step.to && step.slice?.size ? step.from + step.slice.size : step.to;
            affectedRanges.push([from, to]);
          }
        });
      });

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
          } catch {
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

      const removeMarksFromAnnotation = (node, pos) => {
        let { marks } = node;
        let currentNode = tr.doc.nodeAt(pos);

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
          } catch {
            shouldFallbackToFullScan = true;
            break;
          }
        }

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

const mergeRanges = (ranges) => {
  if (!ranges.length) return [];

  const normalized = ranges
    .filter(([start, end]) => typeof start === 'number' && typeof end === 'number')
    .map(([start, end]) => [Math.min(start, end), Math.max(start, end)]);

  if (!normalized.length) return [];

  normalized.sort((a, b) => a[0] - b[0]);

  const merged = [normalized[0]];

  for (let i = 1; i < normalized.length; i++) {
    const [start, end] = normalized[i];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
};

const clampRange = (start, end, docSize) => {
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  if (docSize <= 0) return null;

  const clampedStart = Math.max(0, Math.min(start, docSize));
  const clampedEnd = Math.max(0, Math.min(end, docSize));

  if (clampedStart === clampedEnd) return null;

  if (clampedStart > clampedEnd) {
    return [clampedEnd, clampedStart];
  }

  return [clampedStart, clampedEnd];
};

function handleDropOutside({ fieldAnnotation, editor, view, event }) {
  let sourceField;
  try {
    let fieldAnnotationObj = JSON.parse(fieldAnnotation);
    sourceField = fieldAnnotationObj.sourceField;
  } catch {
    return;
  }

  let coordinates = view.posAtCoords({
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
