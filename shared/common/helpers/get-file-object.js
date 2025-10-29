/**
 * Turn a file URL into a File object
 *
 * @param {string} fileUrl The url or data URI
 * @param {string} name The name to assign the file object
 * @param {string} type The mime type
 * @returns {Promise<File>} The file object
 */
export const getFileObject = async (fileUrl, name, type) => {
  // Handle base64 data URIs without fetch (CSP-safe)
  if (fileUrl.startsWith('data:') && fileUrl.includes(';base64,')) {
    const binary = atob(fileUrl.split(',')[1]);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new File([bytes], name, { type });
  }

  // Regular URLs and non-base64 data URIs use fetch
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  return new File([blob], name, { type });
};
