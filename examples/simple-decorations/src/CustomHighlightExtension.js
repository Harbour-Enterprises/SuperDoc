import { Extensions } from 'superdoc/super-editor';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const highlightKey = new PluginKey('customHighlight');

export const CustomHighlightExtension = Extensions.Extension.create({
  name: 'CustomHighlight',

  addCommands() {
    return {
      highlightSelection: () => ({ state, dispatch }) => {
        const { selection } = state;
        const { from, to } = selection;
        
        if (from === to) return false; // No selection
        
        const decoration = Decoration.inline(from, to, {
          class: 'custom-highlight'
        });
        
        const tr = state.tr.setMeta(highlightKey, { decoration });
        if (dispatch) dispatch(tr);
        return true;
      },

      clearHighlights: () => ({ state, dispatch }) => {
        const tr = state.tr.setMeta(highlightKey, { clear: true });
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },

  addPmPlugins() {
    return [
      new Plugin({
        key: highlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, decorationSet, _, newState) => {
            const meta = tr.getMeta(highlightKey);
            
            if (meta) {
              if (meta.clear) {
                return DecorationSet.empty;
              }
              if (meta.decoration) {
                return DecorationSet.create(newState.doc, [meta.decoration]);
              }
            }
            
            return decorationSet.map(tr.mapping, newState.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});