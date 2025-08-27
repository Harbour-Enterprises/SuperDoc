import { ImagePlaceholderPluginKey, findPlaceholder } from './imagePlaceholderPlugin.js';
import { handleImageUpload as handleImageUploadDefault } from './handleImageUpload.js';
import { processUploadedImage } from './processUploadedImage.js';
import { insertNewRelationship } from '@core/super-converter/docx-helpers/document-rels.js';

export const startImageUpload = async ({ editor, view, file }) => {
  const imageUploadHandler =
    typeof editor.options.handleImageUpload === 'function'
      ? editor.options.handleImageUpload
      : handleImageUploadDefault;

  let fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(4));

  if (fileSizeMb > 5) {
    window.alert('Image size must be less than 5MB');
    return;
  }

  let width;
  let height;
  try {
    // Will process the image file in place
    const processedImageResult = await processUploadedImage(file, editor);
    width = processedImageResult.width;
    height = processedImageResult.height;
    file = processedImageResult.file;
  } catch (err) {
    console.warn('Error processing image:', err);
    return;
  }

  await uploadImage({
    editor,
    view,
    file,
    size: { width, height },
    uploadHandler: imageUploadHandler,
  });
};

export async function uploadImage({ editor, view, file, size, uploadHandler }) {
  // A fresh object to act as the ID for this upload
  let id = {};

  // Replace the selection with a placeholder
  let { tr, schema } = view.state;
  let { selection } = tr;
  if (editor.options.isHeaderOrFooter) {
    selection = editor.options.lastSelection;
  }

  if (!selection.empty && !editor.options.isHeaderOrFooter) {
    tr.deleteSelection();
  }

  let imageMeta = {
    type: 'add',
    pos: selection.from,
    id,
  };

  tr.setMeta(ImagePlaceholderPluginKey, imageMeta);
  view.dispatch(tr);

  try {
    let url = await uploadHandler(file);

    let fileName = file.name.replace(' ', '_');
    let placeholderPos = findPlaceholder(view.state, id);

    // If the content around the placeholder has been deleted,
    // drop the image
    if (placeholderPos == null) {
      return;
    }

    // Otherwise, insert it at the placeholder's position, and remove
    // the placeholder
    let removeMeta = { type: 'remove', id };

    let mediaPath = `word/media/${fileName}`;

    let rId = null;
    if (editor.options.mode === 'docx') {
      const [, path] = mediaPath.split('word/'); // Path without 'word/' part.
      const id = addImageRelationship({ editor, path });
      if (id) rId = id;
    }

    let imageNode = schema.nodes.image.create({
      src: mediaPath,
      size,
      rId,
    });

    editor.storage.image.media = Object.assign(editor.storage.image.media, { [mediaPath]: url });

    // If we are in collaboration, we need to share the image with other clients
    if (editor.options.ydoc) {
      editor.commands.addImageToCollaboration({ mediaPath, fileData: url });
    }

    view.dispatch(
      view.state.tr
        .replaceWith(placeholderPos, placeholderPos, imageNode) // or .insert(placeholderPos, imageNode)
        .setMeta(ImagePlaceholderPluginKey, removeMeta),
    );
  } catch {
    let removeMeta = { type: 'remove', id };
    // On failure, just clean up the placeholder
    view.dispatch(tr.setMeta(ImagePlaceholderPluginKey, removeMeta));
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
