import path from 'path';

const ROOT = path.resolve(__dirname, '.');

export default {
  basicDocumentsFolder: path.join(ROOT, 'tests/test-data/basic-documents'),
  commentsDocumentsFolder: path.join(ROOT, 'tests/test-data/comments-documents'),
  ignoreDocuments: ['.DS_Store'],
};
