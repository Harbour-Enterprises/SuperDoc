import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import './style.css';
import { onClickExtension } from './onClickExtension.js';

// Initialize SuperDoc
let editor = null;

function initializeEditor(file = null) {
  // Cleanup previous instance if it exists
  if (editor) {
    editor.destroy();
    editor = null;
  }

  // Create click handler
  const clickHandler = ({ pos, node, nodePos, event, direct }) => {
    console.log('📍 Click details:', {
      pos,
      node: node?.type.name,
      nodePos,
      direct,
      target: event.target.tagName,
      clientX: event.clientX,
      clientY: event.clientY
    }, node);
  };

  editor = new SuperDoc({
    selector: '#superdoc',
    toolbar: '#superdoc-toolbar',
    document: file, // URL, File or document config
    documentMode: 'editing',
    pagination: true,
    rulers: true,
    editorExtensions: [
      onClickExtension(clickHandler),
    ],
    onReady: (event) => {
      console.log('SuperDoc is ready', event);
    },
    onEditorCreate: (event) => {
      console.log('Editor is created', event);
    },
  });
}

// Setup file input handling
const fileInput = document.getElementById('fileInput');
const loadButton = document.getElementById('loadButton');

loadButton.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) {
    initializeEditor(file);
  }
});

// Initialize empty editor on page load
initializeEditor();