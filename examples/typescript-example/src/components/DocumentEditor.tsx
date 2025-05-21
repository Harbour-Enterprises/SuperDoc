import { SuperDoc, Config } from '@harbour-enterprises/superdoc';
import { Editor } from '@harbour-enterprises/superdoc/super-editor'

import '@harbour-enterprises/superdoc/style.css';
import { useEffect, useRef } from 'react';

interface Props {
    documentId: string,
    initialData: File | null,
    documentType?: string,
    readOnly?: boolean,
    onEditorReady: (editor: { superdoc: SuperDoc }) => void;
}

const DocumentEditor = ({
  documentId, 
  documentType = 'docx', 
  initialData = null,
  readOnly = false,
  onEditorReady 
}: Props) => {
  const editorRef = useRef<SuperDoc>(null);
  useEffect(() => {
    const config: Config = {
      selector: '#superdoc',
      toolbar: 'superdoc-toolbar',
      documentMode: readOnly ? 'viewing' : 'editing',
      onReady: (activeSuperDoc: SuperDoc) => {
        const superEditor = activeSuperDoc.activeEditor;
        console.debug('SuperDoc editor is ready', superEditor);
      },
      onEditorCreate: (editor: Editor) => {
        console.log('Editor created', editor);
      },
      onEditorDestroy: () => {
        console.log('Editor destroyed');
      },
    };
  
    const editor = new SuperDoc(config);
    editorRef.current = editor;

    // Cleanup on unmount
    return () => {
      if (editorRef.current) {
        editorRef.current = null;
      }
    };
  }, [documentId, documentType, initialData, readOnly, onEditorReady]);

  return (
    <div className="document-editor">
      <div id="superdoc-toolbar" className="toolbar" />
      <div id="superdoc" className="editor" />
      <style>{`
        .document-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
        .toolbar {
          flex: 0 0 auto;
          border-bottom: 1px solid #eee;
        }
        .editor {
          flex: 1 1 auto;
          overflow: auto;
        }
      `}</style>
    </div>
  );
};

export default DocumentEditor;