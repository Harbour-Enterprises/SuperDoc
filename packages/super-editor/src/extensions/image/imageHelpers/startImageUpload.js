import { findPlaceholder, removeImagePlaceholder, addImagePlaceholder } from './imageRegistrationPlugin.js';
import { handleImageUpload as handleImageUploadDefault } from './handleImageUpload.js';
import { processUploadedImage } from './processUploadedImage.js';
import { insertNewRelationship } from '@core/super-converter/docx-helpers/document-rels.js';

const fileTooLarge = (file) => {
  let fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(4));

  if (fileSizeMb > 5) {
    window.alert('Image size must be less than 5MB');
    return true;
  }
  return false;
};

export const checkAndProcessImage = async ({ getMaxContentSize, file }) => {
  if (fileTooLarge(file)) {
    return { file: null, size: { width: 0, height: 0 } };
  }

  try {
    // Will process the image file in place
    const processedImageResult = await processUploadedImage(file, getMaxContentSize);
    const process = processedImageResult;
    return { file: process.file, size: { width: process.width, height: process.height } };
  } catch (err) {
    console.warn('Error processing image:', err);
    return { file: null, size: { width: 0, height: 0 } };
  }
};

export function replaceSelectionWithImagePlaceholder({ editorOptions, view, id }) {
  // Replace the selection with a placeholder
  let { tr } = view.state;
  let { selection } = tr;
  if (editorOptions.isHeaderOrFooter) {
    selection = editorOptions.lastSelection;
  }

  if (!selection.empty && !editorOptions.isHeaderOrFooter) {
    tr.deleteSelection();
  }

  tr = addImagePlaceholder(view.state, tr, id, selection.from);

  view.dispatch(tr);
}

export async function uploadAndInsertImage({ editor, view, file, size, id }) {
  const imageUploadHandler =
    typeof editor.options.handleImageUpload === 'function'
      ? editor.options.handleImageUpload
      : handleImageUploadDefault;

  try {
    let url = await imageUploadHandler(file);

    let fileName = file.name.replace(' ', '_');
    let placeholderPos = findPlaceholder(view.state, id);

    // If the content around the placeholder has been deleted,
    // drop the image
    if (placeholderPos == null) {
      return;
    }

    let mediaPath = `word/media/${fileName}`;

    let rId = null;
    if (editor.options.mode === 'docx') {
      const [, path] = mediaPath.split('word/'); // Path without 'word/' part.
      const id = addImageRelationship({ editor, path });
      if (id) rId = id;
    }

    let imageNode = view.state.schema.nodes.image.create({
      src: mediaPath,
      size,
      id,
      rId,
    });

    editor.storage.image.media = Object.assign(editor.storage.image.media, { [mediaPath]: url });

    // If we are in collaboration, we need to share the image with other clients
    if (editor.options.ydoc && typeof editor.commands.addImageToCollaboration === 'function') {
      editor.commands.addImageToCollaboration({ mediaPath, fileData: url });
    }

    let tr = view.state.tr;

    tr.replaceWith(placeholderPos, placeholderPos, imageNode);

    tr = removeImagePlaceholder(view.state, tr, id);
    // Otherwise, insert it at the placeholder's position, and remove
    // the placeholder

    view.dispatch(tr);
  } catch {
    const tr = removeImagePlaceholder(view.state, view.state.tr, id);
    // On failure, just clean up the placeholder
    view.dispatch(tr);
  }
}

function addImageRelationship({ editor, path }) {
  const target = path;
  const type = 'image';
  try {
    const id = insertNewRelationship(target, type, editor);
    return id;
  } catch {
    return null;
  }
}
