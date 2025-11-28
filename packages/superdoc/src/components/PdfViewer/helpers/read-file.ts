/**
 * Read a Blob or File as a Data URL
 *
 * Converts a Blob or File into a base64-encoded Data URL string that can be
 * used directly in img src attributes or for other browser display purposes.
 *
 * Note: Despite the function name containing "ArrayBuffer", this function
 * actually reads as a Data URL for compatibility with existing code. The return
 * type is string | ArrayBuffer to maintain backward compatibility, but in practice
 * this will always return a string (Data URL) or null.
 *
 * @param blob - The Blob or File to read
 * @returns Promise that resolves to a Data URL string or null on error
 * @throws Rejects the promise if the FileReader encounters an error
 *
 * @example
 * const dataUrl = await readFileAsArrayBuffer(myBlob);
 * imageElement.src = dataUrl;
 */
export const readFileAsArrayBuffer = (blob: Blob): Promise<string | ArrayBuffer | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result ?? null);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
