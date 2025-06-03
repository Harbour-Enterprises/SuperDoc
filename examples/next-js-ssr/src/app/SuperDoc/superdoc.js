'use client';

import { useEffect, useRef, useCallback } from 'react';
import './superdoc.css';
import sampleDocumentB64 from '../../../public/sample-document.js';
import '@harbour-enterprises/superdoc/style.css';

const base64ToDocx = (base64String, filename) => {
  try {
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      return file;
  } catch (error) {
      console.error('Error converting base64 to DOCX:', error);
  }
}

const sampleDocument = base64ToDocx(sampleDocumentB64);

export default function SuperDocEditor() {
  const superdocContainerRef = useRef(null);
  const superdoc = useRef(null);
  const editor = useRef(null);

  const onReady = () => {
    editor.current = superdoc.current.activeEditor;
    console.log('SuperDoc is ready');
  };

  const initSuperDoc = async (fileToLoad = null) => {
    const { SuperDoc } = await import('@harbour-enterprises/superdoc');
    superdoc.current = new SuperDoc({
      selector: superdocContainerRef.current,
      modules: { 
        toolbar: { 
          selector: '#toolbar', 
          toolbarGroups: ['center'], 
        },
      },
      document: fileToLoad ? { data: fileToLoad } : '/sample-document.docx',
      pagination: true,
      rulers: true,
      onReady,
      onEditorCreate: (event) => {
        console.log('Editor is created', event);
      },
    });
  };

  useEffect(() => {
    initSuperDoc(sampleDocument);
  }, []);

  const handleImport = useCallback(async () => {
    if (!superdocContainerRef.current) return;

    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'Word document',
        accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
      }]
    });

    const file = await fileHandle.getFile();
    initSuperDoc(file);
  }, []);

  const handleExport = useCallback(async () => {
    console.debug('Exporting document', superdoc.current);
    superdoc.current.export();
  });

  return (
    <div className="example-container">
      <div id="toolbar" />
      <div className="editor-and-button">
        <div id="superdoc" ref={superdocContainerRef} />
        <div className="editor-buttons">
          <button className="custom-button" onClick={handleImport}>Import</button>
          <button className="custom-button" onClick={handleExport}>Export</button>
        </div>
      </div>
    </div>
  );
}
