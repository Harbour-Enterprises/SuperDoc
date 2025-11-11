<script setup>
import 'superdoc/style.css';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket'
import { onMounted, shallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { Editor, getStarterExtensions, SuperToolbar } from 'superdoc/super-editor';

// Default document
import sampleDocument from '/sample-document.docx?url';

const route = useRoute();
const editor = shallowRef(null);

const turnUrlToFile = (url) => {
  const fileName = url.split('/').pop();
  return fetch(url)
    .then(response => response.blob())
    .then(blob => new File([blob], fileName, { type: blob.type }));
};

const USER_COLORS = ['#a11134', '#2a7e34', '#b29d11', '#2f4597', '#ab5b22'];

const init = async () => {
  // Generate random user for collaboration
  const userId = Math.random().toString(36).substring(2, 15);
  const userName = `User-${userId.substring(0, 6)}`;

  // Get documentId from route
  const documentId = route.params.documentId;

  const fileObject = await turnUrlToFile(sampleDocument);
  const [content, _, mediaFiles, fonts] = await Editor.loadXmlData(fileObject)

  // Start a blank Y.Doc and provider
  // This is all handled for you in SuperDoc, but with the lower-level Editor we have to create it manually
  const ydoc = new Y.Doc();
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3050';
  const provider = new WebsocketProvider(
    `${wsUrl}/doc`,
    documentId,
    ydoc
  );

  const user = {
    name: userName,
    color: `${USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]}`,
  };
  provider.awareness.setLocalStateField('user', user);

  // Create editor config
  const config = {
    // For collaboration, we need to pass in the Y.Doc and provider
    ydoc,
    collaborationProvider: provider,
    user,

    // Usual editor config below
    element: document.getElementById('editor'),
    extensions: getStarterExtensions(),
    mode: 'docx',
    pagination: true,
    documentId,

    content,
    mediaFiles,
    fonts,
  };
  editor.value = new Editor(config);

  new SuperToolbar({
    selector: '#toolbar',
    editor: editor.value,
    excludeItems: [
      'documentMode',
      'image'
    ]
  });
};

onMounted(() => init());
</script>

<template>
  <div class="example-container">
    <div id="toolbar" class="my-custom-toolbar"></div>
    <div class="editor-container">
      <div id="editor" class="main-editor"></div>
    </div>
  </div>
</template>

<style>
.document-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.control-btn {
  background: #1355FF;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.control-btn:hover {
  background: #0a3dff;
}

.control-btn:active {
  transform: translateY(1px);
}

.editor-container {
  border: 1px solid #ccc;
  border-radius: 8px;
}
.fields > div {
  margin-bottom: 10px;
}
textarea {
  margin-left: 10px;
}
.my-custom-node-default-class {
  background-color: #1355FF;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
}
.my-custom-node-default-class:hover {
  background-color: #0a3dff;
}
.draggable-field {
  background-color: #1355FF;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
}
</style>
