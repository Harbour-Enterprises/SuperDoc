import { Extension } from '@core/Extension.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

export const CustomSelectionPluginKey = new PluginKey('CustomSelection');

export const CustomSelection = Extension.create({
  name: 'customSelection',

  addPmPlugins() {
    const customSelectionPlugin = new Plugin({
      key: CustomSelectionPluginKey,
      state: {
        init() {
          return DecorationSet.empty;
        },
        apply(tr, oldDecorations) {
          const newDecorations = tr.getMeta(CustomSelectionPluginKey);
          if (newDecorations) {
            return newDecorations;
          }
          return oldDecorations.map(tr.mapping, tr.doc);
        }
      },
      props: {
        decorations(state) {
          return CustomSelectionPluginKey.getState(state);
        }
      }
    });

    return [customSelectionPlugin];
  },
});
