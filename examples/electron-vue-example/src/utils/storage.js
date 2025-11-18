// Storage utility functions for handling document files

const { ipcRenderer } = window.require ? window.require('electron') : {};

export class DocumentStorage {
  /**
   * Load a document file from disk using Electron's native file dialog
   * @returns {Promise<File|null>} The selected file or null if cancelled
   */
  static async loadDocument() {
    try {
      if (!ipcRenderer) {
        throw new Error('Electron IPC not available');
      }
      
      const result = await ipcRenderer.invoke('dialog:openFile');
      if (result.canceled || !result.filePaths.length) {
        return null;
      }
      
      const filePath = result.filePaths[0];
      const fileData = await ipcRenderer.invoke('fs:readFile', filePath);
      
      // Create a File object from the buffer data
      const fileName = filePath.split('/').pop();
      const blob = new Blob([fileData], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      return new File([blob], fileName, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
    } catch (error) {
      console.error('Error loading document:', error);
      throw error;
    }
  }

  /**
   * Save document content to disk using Electron's native file dialog
   * @param {Blob|ArrayBuffer} documentData - The document data to save
   * @param {string} defaultName - Default filename for the save dialog
   * @returns {Promise<boolean>} True if saved successfully, false if cancelled
   */
  static async saveDocument(documentData, defaultName = 'document.docx') {
    try {
      if (!ipcRenderer) {
        throw new Error('Electron IPC not available');
      }
      
      const result = await ipcRenderer.invoke('dialog:saveFile', defaultName);
      if (result.canceled || !result.filePath) {
        return false;
      }
      
      // Convert document data to buffer if needed
      let buffer;
      if (documentData instanceof Blob) {
        buffer = await documentData.arrayBuffer();
      } else if (documentData instanceof ArrayBuffer) {
        buffer = documentData;
      } else {
        throw new Error('Invalid document data format');
      }
      
      await ipcRenderer.invoke('fs:writeFile', result.filePath, buffer);
      return true;
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  /**
   * Get document content from SuperDoc editor for saving
   * @param {Object} editor - The SuperDoc editor instance
   * @returns {Promise<Blob>} The document as a blob
   */
  static async getDocumentFromEditor(editor) {
    try {
      if (!editor || !editor.getDocx) {
        throw new Error('Invalid editor instance or getDocx method not available');
      }
      
      // Get the document as a blob from SuperDoc
      const docxBlob = await editor.getDocx();
      return docxBlob;
    } catch (error) {
      console.error('Error getting document from editor:', error);
      throw error;
    }
  }

  /**
   * Show a native file browser using Electron's shell
   * @param {string} filePath - The file path to reveal
   */
  static async showInFileManager(filePath) {
    try {
      if (!ipcRenderer) {
        throw new Error('Electron IPC not available');
      }
      
      await ipcRenderer.invoke('shell:showItemInFolder', filePath);
    } catch (error) {
      console.error('Error showing file in manager:', error);
      throw error;
    }
  }
}