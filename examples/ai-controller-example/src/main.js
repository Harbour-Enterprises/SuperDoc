import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import './style.css';

import {
  SuperDocAiController,
  ConfigurableAIProvider,
  InsightsAIProvider
} from '@harbour-enterprises/superdoc-ai-controller';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const provider = new InsightsAIProvider({
  endpoint: 'https://sd-dev-express-gateway-i6xtm.ondigitalocean.app/insights',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test'
  },
});

// const provider = new ConfigurableAIProvider({
//   endpoint: 'http://127.0.0.1:5001/api/ai',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   model: 'gpt-4o-mini',
//
//   buildRequest: (operation, params, options) => {
//     const baseRequest = {
//       model: 'gpt-4o-mini',
//       max_tokens: 2000,
//       temperature: operation === 'findContent' ? 0 : 0.7,
//       messages: [
//         {
//           role: 'system',
//           content: `Operation: ${operation}${options.documentXml ? `\n\nCurrent document:\n${options.documentXml.substring(0, 2000)}` : ''}`,
//         },
//         {
//           role: 'user',
//           content: params.prompt || params.text || params.query || JSON.stringify(params),
//         },
//       ],
//     };
//
//     // Add stream flag for streaming operations
//     if (operation.includes('Streaming')) {
//       baseRequest.stream = true;
//     }
//
//     return baseRequest;
//   },
//
//   // ⭐ Simple parser - just extract content
//   parseResponse: (data) => {
//     // ⭐ OpenAI returns: data.choices[0].message.content
//     let content = data.choices?.[0]?.message?.content || '';
//
//     if (!content) {
//       console.error('No content in response:', data);
//       return '';
//     }
//
//     // Remove markdown code fences if present
//     content = content
//         .replace(/```(?:json|javascript|text)?\s*/g, '')
//         .replace(/```/g, '')
//         .trim();
//
//     // Try to parse as JSON (for change/findContent operations that return structured data)
//     try {
//       const parsed = JSON.parse(content);
//
//       // For change operation
//       if (parsed.original || parsed.modified) {
//         return {
//           originalText: parsed.original || parsed.originalText || '',
//           modifiedText: parsed.modified || parsed.modifiedText || '',
//         };
//       }
//
//       // For other structured responses
//       return parsed;
//     } catch {
//       // Plain text response - return as is
//       return content;
//     }
//   },
//
// });

let editor = null;
let aiController = null;
let documentFile = null;
let isDrawerOpen = true;

const fileInput = document.getElementById('fileInput');
const loadButton = document.getElementById('loadButton');
const drawer = document.getElementById('drawer');
const drawerTab = document.getElementById('drawerTab');
const drawerTabLabel = drawerTab.querySelector('span');

const findPromptInput = document.getElementById('findContent');
const findButton = document.getElementById('findContentButton');
const findResultList = document.getElementById('aiFindContent');

const findContentsPromptInput = document.getElementById('findContents');
const findContentsButton = document.getElementById('findContentsButton');
const findResultsList = document.getElementById('aiFindContents');

const redlinePromptInput = document.getElementById('redline');
const redlineButton = document.getElementById('redlineButton');
const redline = document.getElementById('redline');

const replacePromptInput = document.getElementById('redline');
const replaceButton = document.getElementById('replaceButton');

const commentPromptInput = document.getElementById('comment');
const commentButton = document.getElementById('commentButton');


const aiEventLog = document.getElementById('aiEventLog');

function appendAiEvent(message) {
  if (!aiEventLog) return;
  const entry = document.createElement('div');
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  aiEventLog.prepend(entry);
  while (aiEventLog.children.length > 8) {
    aiEventLog.removeChild(aiEventLog.lastChild);
  }
}

function wireEditorAiEvents(editor) {
  editor.on('ai:command:start', ({ command }) =>
    appendAiEvent(`Started ${command}`),
  );
  editor.on('ai:command:complete', ({ command }) =>
    appendAiEvent(`Completed ${command}`),
  );
  editor.on('ai:command:error', ({ command, error }) =>
    appendAiEvent(`Error on ${command}: ${error?.message ?? 'Unknown error'}`),
  );
  editor.on('ai:chunk', ({ chunk }) =>
    appendAiEvent(`Chunk received: "${chunk.trim()}"`),
  );
  editor.on('ai:stream:complete', () => appendAiEvent('Stream complete'));
}

function ensureAiController() {
  if (!aiController) {
    throw new Error('AI controller not ready yet. Wait for the editor to load.');
  }
}

function clearFindResults(message = '') {
  findResultList.innerHTML = '';
  if (message) {
    const li = document.createElement('li');
    li.textContent = message;
    findResultList.appendChild(li);
  }
  findResultsList.innerHTML = '';
  if (message) {
    const li = document.createElement('li');
    li.textContent = message;
    findResultsList.appendChild(li);
  }
}
function initializeEditor() {
  if (editor && typeof editor.destroy === 'function') {
    editor.destroy();
  }

  editor = null;
  editor = null;
  aiController = null;

  const config = {
    selector: '#superdoc',
    toolbar: '#superdoc-toolbar',
    documentMode: 'editing',
    pagination: true,
    rulers: true,
    document: documentFile,
    modules: {
      comments: {
        // comments: sampleComments,
        // overflow: true,
        // selector: 'comments-panel',
        useInternalExternalComments: true,
        // suppressInternalExternal: true,
      },
    },
    onReady(instance) {
      console.log('SuperDoc is ready', instance);
      appendAiEvent('SuperDoc ready');
    },
    onEditorCreate({ editor: createdEditor }) {
      console.log('Editor is created', createdEditor);
      editor = createdEditor;
      aiController = new SuperDocAiController({
        editor: editor,
        provider,
      });
      wireEditorAiEvents(editor);
      appendAiEvent('AI controller ready');
    },
    onEditorDestroy() {
      console.log('Editor is destroyed');
      appendAiEvent('Editor destroyed');
      editor = null;
      aiController = null;
    },
  };

  editor = new SuperDoc(config);
}

function toggleDrawer() {
  isDrawerOpen = !isDrawerOpen;
  drawer.classList.toggle('open', isDrawerOpen);
  drawerTab.classList.toggle('drawer-open', isDrawerOpen);
  drawerTabLabel.textContent = isDrawerOpen ? '◀' : '▶';
}


async function handleFindContent() {
  try {
    ensureAiController();
    const prompt = findPromptInput.value.trim();
    if (!prompt) {
      appendAiEvent('Enter a phrase to search for.');
      return;
    }
    const result = await aiController.aiFindContent(prompt);
    clearFindResults();
    if (!result || result.length === 0) {
      clearFindResults('No matches found.');
      return;
    }
    const li = document.createElement('li');
    li.textContent = result;
    findResultList.appendChild(li);
  } catch (error) {
    appendAiEvent(`Find error: ${error.message}`);
  }
}

async function handleFindContents() {
  try {
    ensureAiController();
    const prompt = findContentsPromptInput.value.trim();
    if (!prompt) {
      appendAiEvent('Enter a phrase to search for.');
      return;
    }
    const results = await aiController.aiFindContents(prompt);
    clearFindResults();
    if (!results || results.length === 0) {
      clearFindResults('No matches found.');
      return;
    }
    results.forEach(match => {
      const li = document.createElement('li');
      li.textContent = match;
      findResultsList.appendChild(li);
    });
  } catch (error) {
    appendAiEvent(`Find error: ${error.message}`);
  }
}

async function redlineContents() {
  try {
    ensureAiController();
    const prompt = redlinePromptInput.value.trim();
    if (!prompt) {
      appendAiEvent('Enter a phrase to search for.');
      return;
    }
    const results = await aiController.aiChange({
      prompt: prompt,
      action: 'insert_tracked_change',
      author: {
        display_name: 'AI Redliner',
        profile_url: 'https://lh3.googleusercontent.com/a/ACg8ocJ1RobuAlpOl8qFy6po4p1Slw8jZwBd4_7tKt55snntfnIj3sY=s576-c-no',
      },
    });
    clearFindResults();
    if (!results || results.length === 0) {
      clearFindResults('No matches found.');
      return;
    }
    const li = document.createElement('li');
    li.textContent = results;
    findResultsList.appendChild(li);
  } catch (error) {
    appendAiEvent(`Find error: ${error.message}`);
  }
}

async function replaceContents() {
  try {
    ensureAiController();
    const prompt = replacePromptInput.value.trim();
    if (!prompt) {
      appendAiEvent('Enter a phrase to search for.');
      return;
    }
    const results = await aiController.aiChange({
      prompt: "Make the GDRP clause into bullet points",
      action: "replace"
    })
    clearFindResults();
    if (!results || results.length === 0) {
      clearFindResults('No matches found.');
      return;
    }
  } catch (error) {
    appendAiEvent(`Find error: ${error.message}`);
  }
}

async function insertComment() {
  try {
    ensureAiController();
    const prompt = commentPromptInput.value.trim();
    if (!prompt) {
      appendAiEvent('Enter a phrase to search for.');
      return;
    }
    const results = await aiController.aiChange({
      prompt: "Make the GDRP clause into bullet points",
      action: "insert_comment"
    })
    clearFindResults();
    if (!results || results.length === 0) {
      clearFindResults('No matches found.');
      return;
    }
  } catch (error) {
    appendAiEvent(`Find error: ${error.message}`);
  }
}


loadButton.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (file.type && file.type !== DOCX_MIME) {
    console.warn(`Unsupported file type: ${file.type}`);
  }

  documentFile = file;
  initializeEditor();
});

drawerTab.addEventListener('click', toggleDrawer);
findButton.addEventListener('click', handleFindContent);
findContentsButton.addEventListener('click', handleFindContents);
redlineButton.addEventListener('click', redlineContents);
replaceButton.addEventListener('click', replaceContents);
commentButton.addEventListener('click', insertComment);
// Initialize UI
clearFindResults('Run "Find match/es" to view results.');
initializeEditor();
