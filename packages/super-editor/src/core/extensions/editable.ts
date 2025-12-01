import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '../Extension.js';
import type { Editor } from '../Editor.js';

export const Editable = Extension.create({
  name: 'editable',

  addPmPlugins() {
    const editablePlugin = new Plugin({
      key: new PluginKey('editable'),
      props: {
        editable: () => {
          return Boolean((this.editor as Editor | undefined)?.options?.editable);
        },
      },
    });

    return [editablePlugin];
  },
});
