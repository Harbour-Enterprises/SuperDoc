const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
};

export const base64ToFile = (base64String) => {
  const arr = base64String.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : '';
  const data = arr[1];

  // Decode the base64 string
  const binaryString = atob(data);

  // Generate filename using a hash of the binary data
  const hash = simpleHash(binaryString);
  const extension = mimeType.split('/')[1] || 'bin'; // Simple way to get extension
  const filename = `image-${hash}.${extension}`;

  // Create a typed array from the binary string
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create a Blob and then a File
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
};
