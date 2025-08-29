// Imports
// import { SuperDoc } from '@harbour-enterprises/superdoc';
// import '@harbour-enterprises/superdoc/style.css';
import { SuperDoc } from './dist-keep/superdoc.es.js';
import './dist-keep/style.css';
import './style.css';

// Init
let editor = null;

//Init SuperDoc from DOCX file
function initSuperDocFromFile(file = null) {
  if (editor) {
    editor = null;
  }

  editor = new SuperDoc({
    selector: '#superdoc',
    toolbar: '#superdoc-toolbar',
    document: file, // URL, File or document config
    documentMode: 'editing',
    pagination: false,
    rulers: true,
    onReady: (event) => {
      const docJSON = event.superdoc.activeEditor.getJSON();
      console.log('SuperDoc ready - JSON', docJSON);
    },
    onEditorUpdate: (event) => {
      const docJSON = event.editor.getJSON();
      console.log('SuperDoc updated - JSON', docJSON);
    },
  });
}

//Init SuperDoc from JSON
function initSuperDocFromJSON() {
  // if (editor) {
  //   editor = null;
  // }
  let demoJSON = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Hello, ProseMirror!',
          },
        ],
      },
    ],
  };
  // if (editor) {
  //   demoJSON = editor.activeEditor.getJSON();
  //   console.log('>>> UPDATED JSON', demoJSON);
  // }
  editor = new SuperDoc({
    selector: '#superdoc',
    toolbar: '#superdoc-toolbar',
    documentMode: 'editing',

    /* LOADING JSON */
    //https://docs.superdoc.dev/core/supereditor/configuration#param-options-content
    jsonOverride: demoJSON,
    // content: demoJSON,
    // mode: 'docx',

    pagination: true,
    rulers: true,
    onReady: (event) => {
      const docJSON = event.superdoc.activeEditor.getJSON();
      console.log('SuperDoc ready - JSON', docJSON);
      window.editor = event.superdoc.activeEditor;
      console.log('>>> WINDOW', window.editor);
    },
    onEditorUpdate: (event) => {
      const docJSON = event.editor.getJSON();
      console.log('SuperDoc updated - JSON', docJSON);
    },
  });
}

// Setup file input handling
const fileInput = document.getElementById('fileInput');
const loadButton = document.getElementById('loadButton');
const loadJSON = document.getElementById('loadJSON');

loadButton.addEventListener('click', () => {
  fileInput.click();
});

loadJSON.addEventListener('click', () => {
  initSuperDocFromJSON();
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) {
    initSuperDocFromFile(file);
  }
});

// Initialize empty editor on page load
initSuperDocFromFile(null);
