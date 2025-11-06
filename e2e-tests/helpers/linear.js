import { LinearClient } from '@linear/sdk';

if (!process.env.LINEAR_API_KEY) {
  throw new Error('LINEAR_API_KEY is not set');
}

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY,
});

export async function uploadFile(file) {
  const uploadPayload = await linear.fileUpload(file.type, file.name, file.size);

  if (!uploadPayload.success || !uploadPayload.uploadFile) {
    throw new Error('Failed to request upload URL');
  }

  const uploadUrl = uploadPayload.uploadFile.uploadUrl;
  const assetUrl = uploadPayload.uploadFile.assetUrl;

  const headers = new Headers();
  headers.set('Content-Type', file.type);
  headers.set('Cache-Control', 'public, max-age=31536000');
  uploadPayload.uploadFile.headers.forEach(({ key, value }) => headers.set(key, value));

  try {
    await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file.buffer,
    });

    return assetUrl;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to upload file to Linear');
  }
}
