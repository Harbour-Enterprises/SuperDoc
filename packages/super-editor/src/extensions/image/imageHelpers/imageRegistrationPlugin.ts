import { Plugin, PluginKey } from 'prosemirror-state';
import type { Transaction, EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Node as PmNode } from 'prosemirror-model';
import type { Step } from 'prosemirror-transform';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { ReplaceStep, ReplaceAroundStep } from 'prosemirror-transform';
import type { Editor } from '@core/Editor.js';
import { base64ToFile, getBase64FileMeta } from './handleBase64';
import { urlToFile, validateUrlAccessibility } from './handleUrl';
import { checkAndProcessImage, uploadAndInsertImage } from './startImageUpload';
import { buildMediaPath, ensureUniqueFileName } from './fileNameUtils.js';
import { addImageRelationship } from '@extensions/image/imageHelpers/startImageUpload.js';

const key = new PluginKey('ImageRegistration');
const WORD_MEDIA_PREFIX = 'word/';

interface ImageNodeInfo {
  node: PmNode;
  pos: number;
  id: object;
}

export const ImageRegistrationPlugin = ({ editor }: { editor: Editor }): Plugin => {
  const { view } = editor;
  return new Plugin({
    key,
    state: {
      init() {
        return { set: DecorationSet.empty };
      },

      apply(tr: Transaction, { set }: { set: DecorationSet }): { set: DecorationSet } {
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
    appendTransaction: (
      trs: readonly Transaction[],
      _oldState: EditorState,
      state: EditorState,
    ): Transaction | null => {
      let foundImages: ImageNodeInfo[] = [];
      if (!trs.some((tr: Transaction) => tr.docChanged)) return null;

      trs.forEach((tr: Transaction) => {
        if (tr.docChanged) {
          // Check if there are any images in the incoming transaction. If so, we need to register them.
          tr.steps.forEach((step: Step, index: number) => {
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
                (node: PmNode, pos: number) => {
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

      // NODE PATH
      if (editor.options.isHeadless) {
        return handleNodePath(foundImages, editor, state);
      }

      // BROWSER PATH
      return handleBrowserPath(foundImages, editor, view, state);
    },
    props: {
      decorations(state: EditorState): DecorationSet {
        const { set } = key.getState(state) as { set: DecorationSet };
        return set;
      },
    },
  });
};

const derivePreferredFileName = (src: string): string => {
  if (typeof src !== 'string' || src.length === 0) {
    return 'image.bin';
  }

  if (src.startsWith('data:')) {
    return getBase64FileMeta(src).filename;
  }

  const lastSegment = src.split('/').pop() ?? '';
  const trimmed = lastSegment.split(/[?#]/)[0];
  return trimmed || 'image.bin';
};

/**
 * Handles the node path for image registration.
 *
 * @param foundImages - Array of found image nodes with their positions and IDs.
 * @param editor - The editor instance.
 * @param state - The current editor state.
 * @returns The updated transaction with image nodes updated with registered paths and IDs.
 */
interface ImageStorage {
  media?: Record<string, string>;
}

export const handleNodePath = (foundImages: ImageNodeInfo[], editor: Editor, state: EditorState): Transaction => {
  const { tr } = state;
  const imageStorage = editor.storage.image as ImageStorage;
  const mediaStore: Record<string, string> = imageStorage.media ?? {};

  if (!imageStorage.media) {
    imageStorage.media = mediaStore;
  }

  const existingFileNames = new Set<string>(
    Object.keys(mediaStore)
      .map((key) => key.split('/').pop() || key)
      .filter(Boolean) as string[],
  );

  foundImages.forEach(({ node, pos }: ImageNodeInfo) => {
    const { src } = node.attrs as { src?: unknown };
    const srcValue = typeof src === 'string' ? src : String(src ?? '');
    const preferredFileName = derivePreferredFileName(srcValue);
    const uniqueFileName = ensureUniqueFileName(preferredFileName, existingFileNames);
    existingFileNames.add(uniqueFileName);

    const mediaPath = buildMediaPath(uniqueFileName);
    mediaStore[mediaPath] = typeof src === 'string' ? src : String(src ?? '');

    const path = mediaPath.startsWith(WORD_MEDIA_PREFIX) ? mediaPath.slice(WORD_MEDIA_PREFIX.length) : mediaPath;
    const rId = addImageRelationship({ editor, path });

    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      src: mediaPath,
      rId,
    });
  });

  return tr;
};

/**
 * Handles the browser path for image registration.
 *
 * @param foundImages - Array of found image nodes with their positions and IDs.
 * @param editor - The editor instance.
 * @param view - The editor view instance.
 * @param state - The current editor state.
 * @returns The updated transaction with image nodes replaced by placeholders and registration process initiated.
 */
const handleBrowserPath = (
  foundImages: ImageNodeInfo[],
  editor: Editor,
  view: EditorView,
  state: EditorState,
): Transaction => {
  // Register the images. (async process).
  registerImages(foundImages, editor, view);

  // Remove all the images that were found. These will eventually be replaced by the updated images.
  const tr = state.tr;

  // We need to delete the image nodes and replace them with decorations. This will change their positions.

  // Get the current decoration set
  let { set } = key.getState(state) as { set: DecorationSet };

  // Add decorations for the images first at their current positions
  foundImages
    .slice()
    .sort((a, b) => a.pos - b.pos)
    .forEach(({ pos, id }: ImageNodeInfo) => {
      const deco = Decoration.widget(pos, () => document.createElement('placeholder'), {
        side: -1,
        id,
      });
      set = set.add(tr.doc, [deco]);
    });

  // Then delete the image nodes (highest position first to avoid position shifting issues)
  foundImages
    .slice()
    .sort((a, b) => b.pos - a.pos)
    .forEach(({ node, pos }: ImageNodeInfo) => {
      tr.delete(pos, pos + node.nodeSize);
    });
  // Map the decoration set through the transaction to adjust positions
  set = set.map(tr.mapping, tr.doc);

  // Set the updated decoration set in the transaction metadata
  tr.setMeta(key, { set });
  return tr;
};

export const findPlaceholder = (state: EditorState, id: object): number | null => {
  const { set } = key.getState(state) as { set: DecorationSet };
  const found = set?.find(undefined, undefined, (spec: Record<string, unknown>) => spec.id === id);
  return found?.length ? found[0].from : null;
};

export const removeImagePlaceholder = (state: EditorState, tr: Transaction, id: object): Transaction => {
  let { set } = key.getState(state) as { set: DecorationSet };
  set = set.map(tr.mapping, tr.doc);
  set = set.remove(set.find(undefined, undefined, (spec: Record<string, unknown>) => spec.id == id));
  return tr.setMeta(key, { set, type: 'remove' });
};

export const addImagePlaceholder = (state: EditorState, tr: Transaction, id: object, pos: number): Transaction => {
  let { set } = key.getState(state) as { set: DecorationSet };
  set = set.map(tr.mapping, tr.doc);
  const deco = Decoration.widget(pos, () => document.createElement('placeholder'), {
    id,
  });
  set = set.add(tr.doc, [deco]);
  return tr.setMeta(key, { set, type: 'add' });
};

export const getImageRegistrationMetaType = (tr: Transaction): string | null => {
  const meta = tr.getMeta(key);
  if (meta && meta.type) {
    return meta.type;
  }
  return null;
};

const registerImages = async (foundImages: ImageNodeInfo[], editor: Editor, view: EditorView): Promise<void> => {
  foundImages.forEach(async (image: ImageNodeInfo) => {
    const src = image.node.attrs.src;
    const id = image.id;
    let file: File | null = null;

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
        getMaxContentSize: () => {
          const size = editor.getMaxContentSize();
          return { width: size.width ?? 0, height: size.height ?? 0 };
        },
        file,
      });

      if (!process.file) {
        // Processing failed, remove placeholder
        const tr = view.state.tr;
        removeImagePlaceholder(view.state, tr, id);
        view.dispatch(tr);
        return;
      }

      await uploadAndInsertImage({
        editor,
        view,
        file: process.file,
        size: { width: process.size.width, height: process.size.height },
        id,
      });
    } catch (error) {
      console.error(`Error processing image from ${src}:`, error);
      // Ensure placeholder is removed even on error
      const tr = view.state.tr;
      removeImagePlaceholder(view.state, tr, id);
      view.dispatch(tr);
    }
  });
};
