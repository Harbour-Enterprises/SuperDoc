import 'superdoc/style.css';
import './style.css';

import { SuperDoc } from 'superdoc';

const TOKEN_ENDPOINT = '/v1/collaboration/tokens';
const WS_PATH = '/v1/collaboration/ws';

const form = document.getElementById('token-form');
const statusBox = document.getElementById('status');
const apiBaseInput = document.getElementById('api-base');
const apiKeyInput = document.getElementById('api-key');
const nameInput = document.getElementById('user-name');

let editorInstance = null;

const updateStatus = (message) => {
  statusBox.textContent = message;
};

const httpToWs = (url) => {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  return parsed;
};

const destroyEditor = () => {
  if (!editorInstance) return;
  if (typeof editorInstance.destroy === 'function') {
    editorInstance.destroy();
  }
  editorInstance = null;
};

const initEditor = ({ token, documentId, apiBase, displayName }) => {
  destroyEditor();

  const wsBase = httpToWs(apiBase);

  const sessionId = crypto.randomUUID();
  const userName = displayName || 'Guest';
  const wsUrl = `http://127.0.0.1:3000/v1/collaboration/ws/${token}?user=${userName}&session=${sessionId}`;

  editorInstance = new SuperDoc({
    selector: '#superdoc',
    toolbar: '#superdoc-toolbar',
    documentMode: 'editing',
    documents: [
      {
        id: documentId,
        isNewFile: true,
      },
    ],
    user: {
      name: userName,
      email: `${sessionId}@demo.local`,
      color: '#6366f1',
    },
    modules: {
      collaboration: {
        providerType: 'superdoc',
        url: wsUrl,
        params: {
          user: encodeURIComponent(userName),
          session: sessionId,
        },
      },
      comments: {
        enabled: true,
      },
    },
    onCollaborationReady: ({ editor }) => {
      updateStatus((prev) =>
        ['\u2705 Connected to collaboration session', `Token: ${token}`, `Document ID: ${documentId}`]
          .concat(prev ? ['', prev] : [])
          .join('\n')
      );
      console.info('Collaboration ready', { editor, token, documentId });
    },
    onException: (error) => {
      console.error('SuperDoc error', error);
    },
  });
};

const requestToken = async ({ apiBase, apiKey }) => {
  const url = new URL(TOKEN_ENDPOINT, apiBase).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token request failed (${response.status}): ${errorBody}`);
  }

  return response.json();
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const apiBase = apiBaseInput.value.trim() || 'http://localhost:3000';
  const apiKey = apiKeyInput.value.trim();
  const displayName = nameInput.value.trim();

  if (!apiKey) {
    updateStatus('Please enter an API key issued by SuperDoc API.');
    return;
  }

  updateStatus('Requesting collaboration token...');

  try {
    const token = '95baf3a661e1456aaa6ccc5bdcf8ce3b';
    const documentId = '6df8edea-bc58-43ba-be83-094377c7a89';
    updateStatus(`\u2728 Token acquired!\nToken: ${token}\nDocument ID: ${documentId}\nConnecting to WebSocket...`);
    initEditor({ token, documentId, apiBase, displayName });
  } catch (error) {
    console.error(error);
    updateStatus(`\u274c ${error.message}`);
  }
});

updateStatus('Waiting for API key...');
