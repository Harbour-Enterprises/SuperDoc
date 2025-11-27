import type { EditorView } from 'prosemirror-view';
import type { Selection } from 'prosemirror-state';
import type { Node as PmNode } from 'prosemirror-model';
import type { Editor } from '@core/Editor.js';
import { findPlaceholder, removeImagePlaceholder, addImagePlaceholder } from './imageRegistrationPlugin.js';
import { handleImageUpload as handleImageUploadDefault } from './handleImageUpload.js';
import { processUploadedImage } from './processUploadedImage.js';
import { buildMediaPath, ensureUniqueFileName } from './fileNameUtils.js';
import { generateDocxRandomId } from '@core/helpers/index.js';
import { insertNewRelationship } from '@core/super-converter/docx-helpers/document-rels.js';

const fileTooLarge = (file: File): boolean => {
  const fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(4));

  if (fileSizeMb > 5) {
    window.alert('Image size must be less than 5MB');
    return true;
  }
  return false;
};

export const checkAndProcessImage = async ({
  getMaxContentSize,
  file,
}: {
  getMaxContentSize: () => { width: number; height: number };
  file: File;
}): Promise<{ file: File | null; size: { width: number; height: number } }> => {
  if (fileTooLarge(file)) {
    return { file: null, size: { width: 0, height: 0 } };
  }

  try {
    // Will process the image file in place
    const processedImageResult = await processUploadedImage(file, getMaxContentSize);
    const process = processedImageResult as { file: File; width: number; height: number };
    return { file: process.file, size: { width: process.width, height: process.height } };
  } catch (err) {
    console.warn('Error processing image:', err);
    return { file: null, size: { width: 0, height: 0 } };
  }
};

interface EditorOptions {
  isHeaderOrFooter?: boolean;
  lastSelection?: Selection;
  mode?: 'docx' | 'text' | 'html';
  handleImageUpload?: (file: File) => Promise<string>;
  ydoc?: unknown;
}

export function replaceSelectionWithImagePlaceholder({
  editorOptions,
  view,
  id,
}: {
  editorOptions: EditorOptions;
  view: EditorView;
  id: object;
}): void {
  // Replace the selection with a placeholder
  let { tr } = view.state;
  let selection: Selection = tr.selection;
  if (editorOptions.isHeaderOrFooter && editorOptions.lastSelection) {
    selection = editorOptions.lastSelection;
  }

  if (!selection.empty && !editorOptions.isHeaderOrFooter) {
    tr.deleteSelection();
  }

  tr = addImagePlaceholder(view.state, tr, id, selection.from);

  view.dispatch(tr);
}

export const generateUniqueDocPrId = (editor: Editor): string => {
  const existingIds = new Set<string>();
  editor?.state?.doc?.descendants((node: PmNode) => {
    if (node.type.name === 'image' && node.attrs.id !== undefined && node.attrs.id !== null) {
      existingIds.add(String(node.attrs.id));
    }
  });

  let candidate: string;
  do {
    const hex = generateDocxRandomId();
    candidate = String(parseInt(hex, 16));
  } while (!candidate || existingIds.has(candidate));

  return candidate;
};

interface ImageStorage {
  media?: Record<string, string | unknown>;
}

export async function uploadAndInsertImage({
  editor,
  view,
  file,
  size,
  id,
}: {
  editor: Editor;
  view: EditorView;
  file: File;
  size: { width: number; height: number };
  id: object;
}): Promise<void> {
  const imageUploadHandler =
    typeof editor.options.handleImageUpload === 'function'
      ? editor.options.handleImageUpload
      : handleImageUploadDefault;

  const placeholderId = id;

  try {
    const imageStorage = editor.storage.image as ImageStorage;
    const existingFileNames = new Set(Object.keys(imageStorage.media ?? {}).map((key) => key.split('/').pop()));

    const uniqueFileName = ensureUniqueFileName(file.name, existingFileNames);
    const normalizedFile =
      uniqueFileName === file.name
        ? file
        : new File([file], uniqueFileName, {
            type: file.type,
            lastModified: file.lastModified ?? Date.now(),
          });

    const url = await imageUploadHandler(normalizedFile);

    const placeholderPos = findPlaceholder(view.state, placeholderId);

    // If the content around the placeholder has been deleted,
    // drop the image
    if (placeholderPos == null) {
      return;
    }

    const mediaPath = buildMediaPath(uniqueFileName);
    const docPrId = generateUniqueDocPrId(editor);

    let rId = null;
    if (editor.options.mode === 'docx') {
      const [, path] = mediaPath.split('word/'); // Path without 'word/' part.
      const id = addImageRelationship({ editor, path });
      if (id) rId = id;
    }

    const imageNode = view.state.schema.nodes.image.create({
      src: mediaPath,
      size,
      id: docPrId,
      rId,
    });

    imageStorage.media = Object.assign(imageStorage.media ?? {}, { [mediaPath]: url });

    // If we are in collaboration, we need to share the image with other clients
    if (editor.options.ydoc && typeof editor.commands.addImageToCollaboration === 'function') {
      editor.commands.addImageToCollaboration({ mediaPath, fileData: url });
    }

    let tr = view.state.tr;

    tr.replaceWith(placeholderPos, placeholderPos, imageNode);

    tr = removeImagePlaceholder(view.state, tr, placeholderId);
    // Otherwise, insert it at the placeholder's position, and remove
    // the placeholder

    view.dispatch(tr);
  } catch {
    const tr = removeImagePlaceholder(view.state, view.state.tr, placeholderId);
    // On failure, just clean up the placeholder
    view.dispatch(tr);
  }
}

export function addImageRelationship({ editor, path }: { editor: Editor; path: string }): string | null {
  const target = path;
  const type = 'image';
  try {
    const id = insertNewRelationship(target, type, editor);
    return id;
  } catch {
    return null;
  }
}
