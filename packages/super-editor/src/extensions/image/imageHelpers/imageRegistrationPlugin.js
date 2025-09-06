import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { ReplaceStep, ReplaceAroundStep } from 'prosemirror-transform';
import { base64ToFile } from './handleBase64';
import { urlToFile, validateUrlAccessibility } from './handleUrl';
import { checkAndProcessImage, uploadAndInsertImage } from './startImageUpload';

const key = new PluginKey('ImageRegistration');

export const ImageRegistrationPlugin = ({ editor }) => {
  const { view } = editor;
  return new Plugin({
    key,
    state: {
      init() {
        return { set: DecorationSet.empty };
      },

      apply(tr, { set }) {
        // For reference.
        // let diffStart = tr.doc.content.findDiffStart(oldState.doc.content);
        // let diffEnd = oldState.doc.content.findDiffEnd(tr.doc.content);
        // let map = diffEnd && diffStart
        //   ? new StepMap([diffStart, diffEnd.a - diffStart, diffEnd.b - diffStart])
        //   : new StepMap([0, 0, 0]);
        // let pmMapping = new Mapping([map]);
        // let set = value.map(pmMapping, tr.doc);
        ///
        const meta = tr.getMeta(key);
        // If meta is set, it overrides the default behavior.
        if (meta) {
          set = meta.set;
          return { set };
        }
        // Adjust decoration positions to changes made by the transaction
        set = set.map(tr.mapping, tr.doc);

        return { set };
      },
    },
    appendTransaction: (trs, _oldState, state) => {
      let foundImages = [];
      trs.forEach((tr) => {
        if (tr.docChanged) {
          // Check if there are any images in the incoming transaction. If so, we need to register them.
          tr.steps.forEach((step, index) => {
            const stepMap = step.getMap();
            foundImages = foundImages.map(({ node, pos, id }) => {
              const mappedPos = stepMap.map(pos, -1);
              return { node, pos: mappedPos, id };
            });
            if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
              // Check for new images.
              (tr.docs[index + 1] || tr.doc).nodesBetween(
                stepMap.map(step.from, -1),
                stepMap.map(step.to, 1),
                (node, pos) => {
                  if (node.type.name === 'image' && !node.attrs.src.startsWith('word/media')) {
                    // Node contains an image that is not yet registered.
                    const id = {};
                    foundImages.push({ node, pos, id });
                  } else {
                    return true;
                  }
                },
              );
            }
          });
        }
      });

      if (!foundImages || foundImages.length === 0) {
        return null;
      }

      // Register the images. (async process).
      registerImages(foundImages, editor, view);

      // Remove all the images that were found. These will eventually be replaced by the updated images.
      const tr = state.tr;

      // We need to delete the image nodes and replace them with decorations. This will change their positions.

      // Get the current decoration set
      let { set } = key.getState(state);

      // Add decorations for the images first at their current positions
      foundImages
        .toSorted((a, b) => a.pos - b.pos)
        .forEach(({ pos, id }) => {
          let deco = Decoration.widget(pos, () => document.createElement('placeholder'), {
            side: -1,
            id,
          });
          set = set.add(tr.doc, [deco]);
        });

      // Then delete the image nodes (highest position first to avoid position shifting issues)
      foundImages
        .toSorted((a, b) => b.pos - a.pos)
        .forEach(({ node, pos }) => {
          tr.delete(pos, pos + node.nodeSize);
        });
      // Map the decoration set through the transaction to adjust positions
      set = set.map(tr.mapping, tr.doc);

      // Set the updated decoration set in the transaction metadata
      tr.setMeta(key, { set });

      return tr;
    },
    props: {
      decorations(state) {
        let { set } = key.getState(state);
        return set;
      },
    },
  });
};

export const findPlaceholder = (state, id) => {
  let { set } = key.getState(state);
  let found = set?.find(null, null, (spec) => spec.id === id);
  return found?.length ? found[0].from : null;
};

export const removeImagePlaceholder = (state, tr, id) => {
  let { set } = key.getState(state);
  set = set.map(tr.mapping, tr.doc);
  set = set.remove(set.find(null, null, (spec) => spec.id == id));
  return tr.setMeta(key, { set, type: 'remove' });
};

export const addImagePlaceholder = (state, tr, id, pos) => {
  let { set } = key.getState(state);
  set = set.map(tr.mapping, tr.doc);
  let deco = Decoration.widget(pos, () => document.createElement('placeholder'), {
    id,
  });
  set = set.add(tr.doc, [deco]);
  return tr.setMeta(key, { set, type: 'add' });
};

export const getImageRegistrationMetaType = (tr) => {
  const meta = tr.getMeta(key);
  if (meta && meta.type) {
    return meta.type;
  }
  return null;
};

const registerImages = async (foundImages, editor, view) => {
  foundImages.forEach(async (image) => {
    const src = image.node.attrs.src;
    const id = image.id;
    let file = null;

    if (src.startsWith('http')) {
      // First check if the URL is accessible without CORS issues
      const isAccessible = await validateUrlAccessibility(src);

      if (isAccessible) {
        // Download image first, create fileobject, then proceed with registration.
        file = await urlToFile(src);
      } else {
        console.warn(`Image URL ${src} is not accessible due to CORS or other restrictions. Using original URL.`);
        // Fallback: Remove the placeholder.
        const tr = view.state.tr;
        removeImagePlaceholder(view.state, tr, id);
        view.dispatch(tr);
        return;
      }
    } else if (src.startsWith('data:')) {
      file = base64ToFile(src);
    } else {
      console.error(`Unsupported image source: ${src}`);
    }

    if (!file) {
      // If file conversion failed, remove the placeholder to avoid stuck UI
      const tr = view.state.tr;
      removeImagePlaceholder(view.state, tr, id);
      view.dispatch(tr);
      return;
    }

    try {
      const process = await checkAndProcessImage({
        getMaxContentSize: () => editor.getMaxContentSize(),
        file,
      });

      if (!process.file) {
        // Processing failed, remove placeholder
        const tr = view.state.tr;
        removeImagePlaceholder(view.state, tr, id);
        view.dispatch(tr);
        return;
      }

      await uploadAndInsertImage({ editor, view, file: process.file, size: process.size, id });
    } catch (error) {
      console.error(`Error processing image from ${src}:`, error);
      // Ensure placeholder is removed even on error
      const tr = view.state.tr;
      removeImagePlaceholder(view.state, tr, id);
      view.dispatch(tr);
    }
  });
};
