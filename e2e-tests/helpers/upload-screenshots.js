import { readdirSync, readFileSync } from 'fs';
import { uploadFile } from './linear.js';

export async function findAndUploadDiffScreenshots() {
  const folders = readdirSync('../test-results', {
    withFileTypes: true,
  }).filter((file) => file.isDirectory());

  const uploadedFiles = [];
  const screenshotUrls = [];

  for (const folder of folders) {
    const files = readdirSync(`../test-results/${folder.name}`, {
      withFileTypes: true,
    });
    const diffFiles = files.filter((file) => file.name.includes('diff'));

    for (const diffFile of diffFiles) {
      if (uploadedFiles.includes(diffFile.name)) {
        continue;
      }

      const fileType = diffFile.name.split('.')[1];
      const fileBuffer = readFileSync(`../test-results/${folder.name}/${diffFile.name}`);

      const screenshotUrl = await uploadFile({
        name: diffFile.name,
        type: fileType,
        size: fileBuffer.length,
        buffer: fileBuffer,
      });

      screenshotUrls.push(screenshotUrl);
      uploadedFiles.push(diffFile.name);
    }
  }

  // Transform the screenshot URLs into markdown
  const markdownScreenshotUrls = screenshotUrls.map((url) => `![Diff screenshot](${url})`);

  // Write it to STDOUT so the github action can pick it up
  process.stdout.write(markdownScreenshotUrls.join('|'), 'utf8');
  return markdownScreenshotUrls;
}

await findAndUploadDiffScreenshots();
