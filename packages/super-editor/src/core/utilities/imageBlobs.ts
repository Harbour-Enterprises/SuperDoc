/**
 * Convert object of Uint8Array to blob URL
 * @param media Object where keys are docx file names and values are Uint8Arrays
 * @returns Object where keys are docx file names and values are blob URLs
 */
export const getMediaObjectUrls = (media: Record<string, Uint8Array>): Record<string, string> => {
  const blobUrls: Record<string, string> = {};
  Object.keys(media).forEach((key) => {
    const uint8Array = media[key];
    const copy = new Uint8Array(uint8Array);
    const blob = new Blob([copy], { type: 'text/plain' });
    const file = new File([blob], key, { type: blob.type });
    const imageUrl = URL.createObjectURL(file);
    blobUrls[key] = imageUrl;
  });
  return blobUrls;
};
