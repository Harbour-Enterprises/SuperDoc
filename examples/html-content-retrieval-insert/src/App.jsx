import React, { useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import prettier from 'prettier/standalone';
import htmlParser from 'prettier/plugins/html';
import DocumentEditor from './components/DocumentEditor';
import { getHTMLFromSelection, setHTMLInSelection } from './get-and-set-html';

function App() {
  const [documentFile, setDocumentFile] = useState(null);
  const [codeEditorContent, setCodeEditorContent] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: window.innerWidth - 450, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocumentFile(file);
    }
  };

  const handleEditorReady = useCallback((editor) => {
    console.log('SuperDoc editor is ready', editor);
    editorRef.current = editor;
    
    // Listen to selection changes to enable/disable buttons
    const { view } = editor.activeEditor;
    const checkSelection = () => {
      const { selection } = view.state;
      const hasContent = !selection.empty;
      setHasSelection(hasContent);
    };
    
    // Check initial selection
    checkSelection();
    
    // Subscribe to state changes by intercepting updateState
    const originalUpdateState = view.updateState.bind(view);
    view.updateState = (state) => {
      originalUpdateState(state);
      checkSelection();
    };
  }, []);

  const handleGetHTML = async () => {
    const html = getHTMLFromSelection(editorRef.current);
    
    // Format the HTML for better readability
    try {
      const formatted = await prettier.format(html, {
        parser: 'html',
        plugins: [htmlParser],
        printWidth: 60,
        tabWidth: 2
      });
      setCodeEditorContent(formatted);
    } catch (e) {
      // If formatting fails, just use the raw HTML
      setCodeEditorContent(html);
    }
  };

  const handleSetHTML = () => {
    setHTMLInSelection(editorRef.current, codeEditorContent);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeEditorContent);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    setPanelPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="app">
      <header>
        <h1>SuperDoc Example</h1>
        <button onClick={() => fileInputRef.current?.click()}>
          Load Document
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".docx, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </header>

      <div 
        className="selection-content"
        style={{
          position: 'fixed',
          left: `${panelPosition.x}px`,
          top: `${panelPosition.y}px`,
          zIndex: 1000
        }}
      >
        <div 
          className="window-titlebar"
          onMouseDown={handleMouseDown}
        >
          <span className="window-title">Selection content</span>
        </div>
        <div className="window-content">
          <div className="note">See get-and-set-html.js for source</div>
          <div className="button-group">
            <button 
              className="primary-button" 
              onClick={handleGetHTML}
              disabled={!hasSelection}
            >
              Get HTML
            </button>
            <button 
              className="secondary-button" 
              onClick={handleSetHTML}
              disabled={!hasSelection || !codeEditorContent.trim()}
            >
              Set HTML
            </button>
          </div>
          <div className="editor-container">
            <button 
              className={`copy-button ${showCopied ? 'copied' : ''}`}
              onClick={copyToClipboard}
              disabled={!codeEditorContent}
              title="Copy HTML"
            >
              {showCopied ? 'Copied!' : 'Copy'}
            </button>
            <Editor
              height="250px"
              defaultLanguage="html"
              value={codeEditorContent}
              onChange={(value) => setCodeEditorContent(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                renderLineHighlight: 'none',
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                lineNumbers: 'off',
                glyphMargin: false,
                folding: false,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'hidden'
                }
              }}
              theme="vs"
            />
          </div>
          {codeEditorContent && (
            <>
              <div className="divider"></div>
              <div className="html-preview" dangerouslySetInnerHTML={{ __html: codeEditorContent }} />
            </>
          )}
        </div>
      </div>

      <main>
        <DocumentEditor
          initialData={documentFile}
          onEditorReady={handleEditorReady}
        />
      </main>

      <style jsx>{`
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        header {
          padding: 1rem;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        header button {
          padding: 0.5rem 1rem;
          background: #1355ff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        header button:hover {
          background: #0044ff;
        }
        .selection-content {
          width: 400px;
          background: #f6f6f6;
          border: 1px solid #c8c8c8;
          border-radius: 6px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          user-select: ${isDragging ? 'none' : 'auto'};
        }
        .window-titlebar {
          height: 28px;
          background: #e3e3e3;
          border-bottom: 1px solid #c8c8c8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          cursor: ${isDragging ? 'grabbing' : 'grab'};
        }
        .window-title {
          flex: 1;
          text-align: center;
          font-size: 13px;
          font-weight: 500;
          color: #4a4a4a;
          user-select: none;
        }
        .window-content {
          padding: 1rem;
          background: white;
        }
        .note {
          font-size: 16px;
          color: #666;
          margin-bottom: 0.75rem;
          font-style: italic;
        }
        .button-group {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .primary-button, .secondary-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .primary-button {
          background: #1355ff;
          color: white;
        }
        .primary-button:hover:not(:disabled) {
          background: #0044ff;
        }
        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .secondary-button {
          background: white;
          color: #1355ff;
          border: 1px solid #1355ff;
        }
        .secondary-button:hover:not(:disabled) {
          background: #f0f5ff;
        }
        .secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .editor-container {
          position: relative;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .copy-button {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10;
          padding: 4px 8px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #666;
          transition: all 0.2s;
        }
        .copy-button:hover:not(:disabled) {
          background: #f0f0f0;
          color: #333;
        }
        .copy-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .divider {
          height: 1px;
          background: #ddd;
          margin: 1rem 0;
        }
        .html-preview {
          padding: 0.5rem;
          border: 1px solid #f0f0f0;
          border-radius: 4px;
          background: #fafafa;
          font-size: 0.875rem;
          max-height: 300px;
          overflow-y: auto;
        }
        .html-preview:empty {
          display: none;
        }
        main {
          flex: 1;
          min-height: 0;
        }
      `}</style>
    </div>
  );
}

export default App;