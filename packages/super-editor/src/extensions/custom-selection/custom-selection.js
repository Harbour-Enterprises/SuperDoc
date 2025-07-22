import { Extension } from '@core/Extension.js';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const CustomSelectionPluginKey = new PluginKey('CustomSelection');

export const CustomSelection = Extension.create({
  name: 'customSelection',

  addPmPlugins() {
    const customSelectionPlugin = new Plugin({
      key: CustomSelectionPluginKey,

      state: {
        init(_, { doc }) {
          return DecorationSet.empty;
        },
        apply(tr, oldDecorationSet, oldState, newState) {
          const sel = tr.selection;
          let newDecos = [];

          // Only apply to text selections
          if (sel.from !== sel.to && tr.doc.resolve(sel.from).parent.isTextblock) {
            newDecos.push(
              Decoration.inline(sel.from, sel.to, {
                class: 'sd-custom-selection',
              }),
            );
          }

          return DecorationSet.create(newState.doc, newDecos);
        },
      },
      props: {
        handleDOMEvents: {
          focusout: (view, event) => {
            const isDropDownOption = this.editor.options.focusTarget.getAttribute('data-dropdown-option');
            if (document.activeElement && !event.relatedTarget && !view.state.selection.empty && !isDropDownOption) {
              this.editor.setOptions({
                lastSelection: view.state.selection,
              });
              const clearSelectionTr = view.state.tr.setSelection(TextSelection.create(view.state.doc, 0));

              view.dispatch(clearSelectionTr);
            }
            return false;
          },
        },
        decorations(state) {
          return CustomSelectionPluginKey.getState(state);
        },
      },
    });

    return [customSelectionPlugin];
  },
});
