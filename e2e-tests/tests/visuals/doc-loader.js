import fs from 'fs';
import path from 'path';

const VALID_EXTENSIONS = new Set(['.docx', '.doc', '.pdf']);

export function loadDocumentsFromFolders(folders, ignore = new Set()) {
  return folders.flatMap(({ key, folder }) => {
    const dir = path.resolve(process.cwd(), folder);
    if (!fs.existsSync(dir)) return [];

    try {
      return fs
        .readdirSync(dir)
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return VALID_EXTENSIONS.has(ext) && !ignore.has(file);
        })
        .map((file) => ({
          id: `${key}-${file}`,
          filePath: path.join(folder, file),
        }));
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
      return [];
    }
  });
}
