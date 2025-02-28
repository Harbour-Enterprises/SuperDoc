// Import the Editor library, and our starter extensions
import { Editor, getStarterExtensions } from '@harbour-enterprises/superdoc/super-editor';

// Import the JSDOM library to mock the window and document
import { JSDOM } from 'jsdom';

/**
 * Main function to instantiate a SuperEditor instance from Editor.js
 * Since the editor is normally a front end class, we need to mock a couple of things - see comments below.
 * @param {Buffer} docxBuffer The docx file as a Buffer
 * @returns {Promise<Editor>} The Super Editor instance
 */
export const getEditor = async (docxBuffer) => {
  const { window: mockWindow } = (new JSDOM('<!DOCTYPE html><html><body></body></html>'));
  const { document: mockDocument } = mockWindow;

  const [content] = await Editor.loadXmlData(docxBuffer);

  // The standard list of extensions that the editor uses
  const extensions = getStarterExtensions();

  // Basic editor config
  const options = {
    // We need to mock the element, since we are running in a headless environment
    element: { mount: mockDocument.createElement('div') },

    // Important, since we are running in a headless environment
    isHeadless: true,

    // We pass in the mock document and window here
    mockDocument,
    mockWindow,

    extensions,
    content,
    documentId: "test-doc-id",
  };

  // Create and return the Super Editor instance
  return new Editor(options);
};
