import { findRemovedFieldAnnotations } from './findRemovedFieldAnnotations.js';
import type { Editor } from '@core/Editor.js';
import type { Transaction } from 'prosemirror-state';

export function trackFieldAnnotationsDeletion(editor: Editor, tr: Transaction): void {
  let removedAnnotations = [];
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
