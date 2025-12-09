import { join, sep } from 'path';
import { readFile, readdir } from 'fs/promises';
import { parseXmlToJson } from '@converter/v2/docxHelper.js';
import { getStarterExtensions } from '@extensions/index.js';
import { Editor } from '@core/Editor.js';
import DocxZipper from '@core/DocxZipper.js';

const EXTENSIONS_TO_CONVERT = new Set(['.xml', '.rels']);

/**
 * Load a test docx file into a map of file names to their content
 * @param {string} name The name of the file in the test data folder
 * @returns {Promise<Object>} The test data as a map of file names to their content
 */
export const getTestDataByFileName = async (name) => {
  const basePath = join(__dirname, '../data', name);
  const fileBuffer = await readFile(basePath);
  const zipper = new DocxZipper();
  const xmlFiles = await zipper.getDocxData(fileBuffer, true);
  return readFilesRecursively(xmlFiles);
};

export const getExtractedDocxData = async (folderName) => {
  const docx = {};
  const basePath = join(__dirname, '../data', folderName);

  const walk = async (relativePath = '') => {
    const targetPath = relativePath ? join(basePath, relativePath) : basePath;
    const entries = await readdir(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      const nextRelative = relativePath ? join(relativePath, entry.name) : entry.name;
      if (entry.isDirectory()) {
        await walk(nextRelative);
        continue;
      }

      const absolutePath = join(basePath, nextRelative);
      const normalizedKey = nextRelative.split(sep).join('/');
      const extension = entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase();

      if (extension === 'xml' || extension === 'rels') {
        const text = await readFile(absolutePath, 'utf8');
        docx[normalizedKey] = parseXmlToJson(text);
      } else {
        const buffer = await readFile(absolutePath);
        docx[normalizedKey] = buffer;
      }
    }
  };

  await walk();
  return docx;
};

export const getTestDataAsFileBuffer = async (name) => {
  const basePath = join(__dirname, '../data', name);
  const fileBuffer = await readFile(basePath);
  return fileBuffer;
};

const readFilesRecursively = (xmlFiles) => {
  const fileDataMap = {};

  try {
    xmlFiles.forEach((entry) => {
      const { name, content } = entry;
      const extension = name.slice(name.lastIndexOf('.'));
      if (EXTENSIONS_TO_CONVERT.has(extension)) fileDataMap[name] = parseXmlToJson(content);
      else fileDataMap[name] = fileData;
    });
  } catch (err) {
    console.error(`Error reading file:`, err);
  }

  return fileDataMap;
};

/**
 * Get test data for editor tests
 *
 * @param {string} filename
 * @returns {Promise<[Object, Object, Object, Object]>}
 */
export const loadTestDataForEditorTests = async (filename) => {
  const fileSource = await getTestDataAsFileBuffer(filename);
  const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(fileSource, true);
  return { docx, media, mediaFiles, fonts };
};

/**
 * Instantiate a new test editor instance and wait for it to be ready.
 *
 * This function creates an Editor and waits for async initialization to complete
 * before returning. This ensures the editor's state and renderer are fully initialized
 * before tests attempt to use methods like exportDocx() that depend on the state.
 *
 * @param {Object} options Editor options
 * @returns {Promise<{editor: Editor, dispatch: Function}>} A promise that resolves with the initialized editor
 */
export const initTestEditor = (options = {}) => {
  const { onCreate: userOnCreate, element: providedElement, useImmediateSetTimeout = true, ...restOptions } = options;

  const hasWindow = typeof window !== 'undefined' && window?.setTimeout;
  const originalSetTimeout = hasWindow ? window.setTimeout : null;
  const immediateSetTimeout = (cb, ...cbArgs) => {
    cb(...cbArgs);
    return 0;
  };
  if (hasWindow && useImmediateSetTimeout) {
    window.setTimeout = immediateSetTimeout;
  }

  const defaultElement = providedElement ?? (typeof document !== 'undefined' ? document.createElement('div') : null);

  const editor = new Editor({
    mode: 'docx',
    documentId: 'test',
    role: 'editor',
    documentMode: 'editing',
    isHeadless: true,
    element: defaultElement,
    extensions: getStarterExtensions(),
    users: [],
    onCreate: (...args) => {
      userOnCreate?.(...args);
    },
    ...restOptions,
  });

  if (hasWindow && originalSetTimeout && useImmediateSetTimeout) {
    window.setTimeout = originalSetTimeout;
  }

  return {
    editor,
    get dispatch() {
      return editor.view?.dispatch;
    },
  };
};

/**
 * Get a new transaction from an editor instance
 *
 * @param {Editor} editor
 * @returns {Transaction} A new transaction instance
 */
export const getNewTransaction = (editor) => {
  const { view } = editor;
  const { state, dispatch } = view;
  return state.tr;
};
