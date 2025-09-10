// @ts-check
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const ImagePlaceholderPluginKey = new PluginKey('ImagePlaceholder');

/**
 * Creates a ProseMirror plugin for managing image upload placeholders
 * @category Helper
 * @returns {Plugin} ProseMirror plugin for image placeholders
 * @example
 * const plugin = ImagePlaceholderPlugin();
 * // Use in editor plugins array
 * @note Shows placeholder widgets during image upload
 */
export const ImagePlaceholderPlugin = () => {
  return new Plugin({
    key: ImagePlaceholderPluginKey,

    state: {
      init() {
        return DecorationSet.empty;
      },

      apply(tr, set) {
        // For reference.
        // let diffStart = tr.doc.content.findDiffStart(oldState.doc.content);
        // let diffEnd = oldState.doc.content.findDiffEnd(tr.doc.content);
        // let map = diffEnd && diffStart
        //   ? new StepMap([diffStart, diffEnd.a - diffStart, diffEnd.b - diffStart])
        //   : new StepMap([0, 0, 0]);
        // let pmMapping = new Mapping([map]);
        // let set = value.map(pmMapping, tr.doc);
        ///

        // Adjust decoration positions to changes made by the transaction
        set = set.map(tr.mapping, tr.doc);

        // See if the transaction adds or removes any placeholders
        let action = tr.getMeta(ImagePlaceholderPluginKey);

        if (action?.type === 'add') {
          let widget = document.createElement('placeholder');
          let deco = Decoration.widget(action.pos, widget, {
            id: action.id,
          });
          set = set.add(tr.doc, [deco]);
        } else if (action?.type === 'remove') {
          set = set.remove(set.find(null, null, (spec) => spec.id == action.id));
        }
        return set;
      },
    },

    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
};

/**
 * Finds a placeholder decoration by ID
 * @category Helper
 * @param {Object} state - Editor state
 * @param {string} id - Placeholder ID
 * @returns {number|null} Position of placeholder or null if not found
 * @example
 * const pos = findPlaceholder(state, placeholderId);
 * if (pos !== null) {
 *   // Replace placeholder with actual image
 * }
 */
export const findPlaceholder = (state, id) => {
  let decos = ImagePlaceholderPluginKey.getState(state);
  let found = decos?.find(null, null, (spec) => spec.id === id);
  return found?.length ? found[0].from : null;
};
