import { ReplaceStep, ReplaceAroundStep } from 'prosemirror-transform';
import type { Transaction } from 'prosemirror-state';
import type { Node as PmNode } from 'prosemirror-model';

interface RemovedNode {
  node: PmNode;
  pos: number;
}

export function findRemovedFieldAnnotations(tr: Transaction): RemovedNode[] {
  const removedNodes: RemovedNode[] = [];

  if (
    !tr.steps.length ||
    (tr.meta && !Object.keys(tr.meta).every((meta) => ['inputType', 'uiEvent', 'paste'].includes(meta))) ||
    ['historyUndo', 'historyRedo'].includes(tr.getMeta('inputType')) ||
    ['drop'].includes(tr.getMeta('uiEvent')) ||
    tr.getMeta('fieldAnnotationUpdate') === true ||
    tr.getMeta('tableGeneration') === true
  ) {
    return removedNodes;
  }

  const hasDeletion = transactionDeletedAnything(tr);
  if (!hasDeletion) return removedNodes;

  tr.steps.forEach((step, stepIndex) => {
    if (step instanceof ReplaceStep && step.from !== step.to) {
      const mapping = tr.mapping.maps[stepIndex];
      const originalDoc = tr.before;

      originalDoc.nodesBetween(step.from, step.to, (node, pos) => {
        if (node.type.name === 'fieldAnnotation') {
          const mappedPos = mapping.mapResult(pos);

          if (mappedPos.deleted) {
            removedNodes.push({ node, pos });
          }
        }
      });
    }
  });

  return removedNodes;
}

function transactionDeletedAnything(tr: Transaction): boolean {
  return tr.steps.some((step) => {
    if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
      return step.from !== step.to;
    }
    return false;
  });
}
