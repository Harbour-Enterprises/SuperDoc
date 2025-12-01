import { findRemovedFieldAnnotations } from './findRemovedFieldAnnotations.js';
import type { Editor } from '@core/Editor.js';
import type { Transaction } from 'prosemirror-state';
import type { RemovedNode } from './findRemovedFieldAnnotations.js';

export function trackFieldAnnotationsDeletion(editor: Editor, tr: Transaction): void {
  let removedAnnotations: RemovedNode[] = [];
  try {
    removedAnnotations = findRemovedFieldAnnotations(tr);
  } catch {}

  if (removedAnnotations.length > 0) {
    setTimeout(() => {
      editor.emit('fieldAnnotationDeleted', {
        editor,
        removedNodes: removedAnnotations,
      });
    }, 0);
  }
}
