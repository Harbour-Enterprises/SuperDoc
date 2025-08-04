import { Extension } from '@core/Extension.js';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const CustomSelectionPluginKey = new PluginKey('CustomSelection');

const handleClickOutside = (event, editor) => {
  const editorElem = editor?.options?.element;
  if (!editorElem) return;

  const isInsideEditor = editorElem?.contains(event.target);

  if (!isInsideEditor) {
    editor.setOptions({
      focusTarget: event.target,
    });
  } else {
    editor.setOptions({
      focusTarget: null,
    });
  }
};

function getFocusMeta(tr) {
  return tr.getMeta(CustomSelectionPluginKey);
}

function setFocusMeta(tr, value) {
  return tr.setMeta(CustomSelectionPluginKey, value);
}

function getFocusState(state) {
  return CustomSelectionPluginKey.getState(state);
}

export const CustomSelection = Extension.create({
  name: 'customSelection',
  addPmPlugins() {
    const editor = this.editor;
    const customSelectionPlugin = new Plugin({
      key: CustomSelectionPluginKey,
      state: {
        init: () => false,
        apply: (tr, value) => {
          return getFocusMeta(tr) ?? value;
        },
      },
      view: () => {
        document?.addEventListener('mousedown', (event) => handleClickOutside(event, editor));

        return {
          destroy: () => {
            document?.removeEventListener('mouseout', handleClickOutside);
          },
        };
      },
      props: {
        handleDOMEvents: {
          mousedown: (view, event) => {
            if (event.button === 2) return false;

            const { selection } = view.state;
            const isToolbarButton = this.editor.options.focusTarget?.closest('.toolbar-button');

            if (!isToolbarButton) {
              view.dispatch(setFocusMeta(view.state.tr, false));
            }
            if (!selection.empty) {
              this.editor.setOptions({
                lastSelection: view.state.selection,
              });
              const clearSelectionTr = view.state.tr.setSelection(TextSelection.create(view.state.doc, 0));

              view.dispatch(clearSelectionTr);
            }
          },
          focus: (view) => {
            const isToolbarButton = this.editor.options.focusTarget?.closest('.toolbar-button');

            if (isToolbarButton) {
              return;
            }

            view.dispatch(setFocusMeta(view.state.tr, false));
          },

          blur: (view) => {
            const isToolbarButton = this.editor.options.focusTarget?.closest('.toolbar-button');

            if (isToolbarButton) {
              view.dispatch(setFocusMeta(view.state.tr, true));
              return;
            }

            view.dispatch(setFocusMeta(view.state.tr, false));
          },
        },
        decorations: (state) => {
          const { selection, doc } = state;

          if (selection.empty || !getFocusState(state)) {
            return null;
          }

          return DecorationSet.create(doc, [
            Decoration.inline(selection.from, selection.to, {
              class: 'sd-custom-selection',
            }),
          ]);
        },
      },
    });

    return [customSelectionPlugin];
  },
});
