/**
 * Converts an image file to base64 data URL
 * @category Helper
 * @param file - Image file to convert
 * @returns Base64 data URL of the image
 * @example
 * const dataUrl = await handleImageUpload(file);
 * // Returns: "data:image/png;base64,..."
 * @note Adds 250ms delay before reading to ensure file is ready
 */
export const handleImageUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = reject;
    setTimeout(() => reader.readAsDataURL(file), 250);
  });
};
