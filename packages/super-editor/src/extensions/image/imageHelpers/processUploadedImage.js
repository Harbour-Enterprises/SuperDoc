/**
 * Process an uploaded image to ensure it fits within the editor's content area.
 * @param {string | File} fileData Base 64 string or File object.
 * @returns {Promise<string | File>} Resolves with a base 64 string or File object.
 */
export const processUploadedImage = (fileData, editor) => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const { width, height } = getAllowedImageDimensions(img.width, img.height, editor);
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      if (typeof fileData === 'string') {
        const resizedBase64 = canvas.toDataURL();
        resolve(resizedBase64);
      } else {
        canvas.toBlob((blob) => {
          const updatedFile = new File([blob], fileData.name, {
            type: fileData.type,
            lastModified: Date.now(),
          });
          resolve({ file: updatedFile, width, height });
        });
      }
    };
    img.onerror = (error) => reject(error);
    img.src = typeof fileData === 'string' ? fileData : URL.createObjectURL(fileData);
  });
};

export const getAllowedImageDimensions = (width, height, editor) => {
  const { width: maxWidth, height: maxHeight } = editor.getMaxContentSize();
  if (!maxWidth || !maxHeight) return { width, height };

  let adjustedWidth = width;
  let adjustedHeight = height;
  const aspectRatio = width / height;

  if (height > maxHeight) {
    adjustedHeight = maxHeight;
    adjustedWidth = Math.round(maxHeight * aspectRatio);
  }

  if (adjustedWidth > maxWidth) {
    adjustedWidth = maxWidth;
    adjustedHeight = Math.round(maxWidth / aspectRatio);
  }

  return { width: adjustedWidth, height: adjustedHeight };
};
