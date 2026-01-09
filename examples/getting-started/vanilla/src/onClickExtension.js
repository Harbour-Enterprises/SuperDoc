import { Extensions } from 'superdoc/super-editor';

const { Extension } = Extensions;

// defined in: packages/super-editor/src/core/helpers/editorSurface.js
// (not yet exported)
const getEditorSurfaceElement = (editor) => {
  if (!editor) return null;

  // Check if editor IS a PresentationEditor
  if (typeof editor.hitTest === 'function' && editor.element instanceof HTMLElement) {
    return editor.element;
  }

  // For flow Editor: check for attached PresentationEditor, then fall back to view.dom
  return editor.presentationEditor?.element ?? editor.view?.dom ?? editor.options?.element ?? null;
};

export const onClickExtension = (handler) => {
  let editorElement = null;
  let clickHandler = null;
  
  return Extension.create({
    name: 'OnClickExtension',

    onCreate() {
      setTimeout(() => {
        editorElement = getEditorSurfaceElement(this.editor);
        if (!editorElement) return;
        
        clickHandler = (event) => {
          // left click only
          if (event.button !== 0) return;
          
          const pos = this.editor?.posAtCoords?.({ left: event.clientX, top: event.clientY });
          if (pos && typeof pos.pos === 'number') {
            const $pos = this.editor.state.doc.resolve(pos.pos);
            
            handler({
              pos: pos.pos,
              node: $pos.parent,
              nodePos: $pos.before($pos.depth),
              event,
              direct: pos.inside > -1,
            });
          }
        };
        
        editorElement.addEventListener('click', clickHandler);
      }, 100);
    },

    onDestroy() {
      if (editorElement && clickHandler) {
        editorElement.removeEventListener('click', clickHandler);
      }
    }
  });
};