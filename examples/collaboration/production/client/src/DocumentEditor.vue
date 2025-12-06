<script setup>
import 'superdoc/style.css';
import { onMounted, onBeforeUnmount, shallowRef, ref } from 'vue';
import { useRoute } from 'vue-router';
import { SuperDoc } from 'superdoc';

// Default documents
import defaultDocument from '/default.docx?url';

const route = useRoute();
const superdoc = shallowRef(null);
const connectedUsers = ref([]);
const hoveredUser = ref(null);
const currentUser = ref(null);
const showToolbar = ref(true);

const generateUserInfo = async () => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3050';
  const apiUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');

  const response = await fetch(`${apiUrl}/user`);
  return await response.json();
};

const handleImageUpload = (file) => {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const mediaPath = `word/media/${file.name}`;

      if (superdoc.value?.ydoc) {
        const mediaMap = superdoc.value.ydoc.getMap('media');
        mediaMap.set(mediaPath, dataUrl);
      }
    
      resolve(dataUrl);
    };
    reader.onerror = reject;
    setTimeout(() => reader.readAsDataURL(file), 250);
  });
};

const setupMediaObserver = (ydoc, editor) => {
  const mediaMap = ydoc.getMap('media');
  const imageStorage = editor?.storage?.image;
  
  // Set up observer for real-time media sync
  mediaMap.observe((ymapEvent) => {
    ymapEvent.changes.keys.forEach((change, key) => {
      if (change.action !== 'add') return;
      const mediaUrl = mediaMap.get(key);

      // Sync to local editor storage
      if (imageStorage && mediaUrl) {
        imageStorage.media[key] = mediaUrl;
        const { state, view } = editor;
        if (view && state) {
          // Create an empty transaction to trigger re-render
          const tr = state.tr;
          view.dispatch(tr);
        }
      }
    });
  });
  
  // Initial sync of existing media
  mediaMap.forEach((mediaUrl, mediaPath) => {
    if (imageStorage && mediaUrl) {
      imageStorage.media[mediaPath] = mediaUrl;
    }
  });
};

const onAwarenessUpdate = (users) => {
  // Handle removed users
  if (users.removed && users.removed.length > 0) {
    users.removed.forEach(clientId => {
      const index = connectedUsers.value.findIndex(user => user.clientId === clientId);
      if (index !== -1) {
        console.log("Removing user:", connectedUsers.value[index]);
        connectedUsers.value.splice(index, 1);
      }
    });
  }

  // Handle added users
  if (users.added && users.added.length > 0) {
    users.added.forEach(clientId => {
      const userState = users.states.find(user => user.clientId === clientId);
      if (userState && userState.name && !connectedUsers.value.find(u => u.clientId === clientId)) {
        console.log("Adding user:", userState);
        connectedUsers.value.push(userState);
      }
    });
  }

  // Fallback: if no added/removed, update wholesale (initial load)
  if ((!users.added || users.added.length === 0) && (!users.removed || users.removed.length === 0)) {
    if (users.states) {
      connectedUsers.value = users.states.filter(user => user && user.name);
      console.log("Initial user load:", connectedUsers.value);
    }
  }
};

const init = async () => {
  const documentId = route.params.documentId;
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3050';
  const apiUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
  const user = await generateUserInfo();
  currentUser.value = user;

  // Check if hide-toolbar query param is present
  const hideToolbar = route.query['hide-toolbar'] === 'true';
  showToolbar.value = !hideToolbar;

  const config = {
    selector: '#superdoc',
    document: {
      id: documentId,
      type: 'docx',
      isNewFile: false,
    },
    pagination: true,
    colors: ['#a11134', '#2a7e34', '#b29d11', '#2f4597', '#ab5b22'],
    user,
    modules: {
      collaboration: {
        url: `${wsUrl}/doc`,
        token: 'token',
      },
    },
    handleImageUpload,
    onAwarenessUpdate,
    onReady: (event) => {
      console.log('SuperDoc is ready', event);
      const editor = event.superdoc.activeEditor;
      console.log('Active editor:', editor);
      
      // Set up media observer for collaboration
      const ydoc = event.superdoc.ydoc;
      if (ydoc && editor) {
        setupMediaObserver(ydoc, editor);
      }
    },
    onEditorCreate: async (event) => {
      // load default doc if current doc is blank
      const { editor } = event;

      if (!editor?.state) return;
      const textContent = editor.state.doc.textContent;

      // Check if document is empty (no content or only whitespace)
      const isEmpty = !textContent || textContent.trim().length === 0;
      if (!isEmpty) return;

      try {
        // Fetch and load default.docx
        const response = await fetch(defaultDocument);
        const blob = await response.blob();
        const file = new File([blob], 'default.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        await editor.replaceFile(file);
      } catch (error) {
        console.error('Error loading default content:', error);
      }
    },
    onContentError: ({ error, documentId, file }) => {
      console.error('Content loading error:', error);
      console.log('Failed document:', documentId, file);
    }
  };

  // Conditionally add toolbar if not hidden
  if (!hideToolbar) {
    config.toolbar = '#superdoc-toolbar';
  }

  superdoc.value = new SuperDoc(config);
};

onMounted(() => init());

onBeforeUnmount(() => {
  if (superdoc.value) {
    superdoc.value.destroy();
  }
});
</script>

<template>
  <div class="example-container">
    <div class="user-presence">
      <div class="current-user" v-if="currentUser">
        Connected as: {{ currentUser.name }}
      </div>
      <div class="user-avatars">
        <div 
          v-for="user in connectedUsers" 
          :key="user.name"
          class="user-avatar"
          :style="{ backgroundColor: user.color }"
          @mouseover="() => { console.log('Hovering:', user.name); hoveredUser = user.name; }"
          @mouseleave="() => { console.log('Left hover'); hoveredUser = null; }"
        >
          {{ user.name.split(' ').map(part => part.charAt(0)).join('').toUpperCase() }}
          <div 
            v-if="hoveredUser === user.name"
            class="user-tooltip"
          >
            {{ user.name }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="showToolbar" id="superdoc-toolbar"></div>
    <div id="superdoc"></div>
  </div>
</template>

<style>
.user-presence {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #ffffff;
}

.current-user {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.user-avatars {
  display: flex;
  gap: 6px;
  flex-direction: row-reverse;
}

.user-avatar {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.user-tooltip {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  font-weight: normal;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.user-tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent transparent #333 transparent;
}

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

.my-custom-toolbar {
  min-height: 60px;
  border: 1px solid #e5e5e5;
  border-radius: 8px 8px 0 0;
  background: #ffffff;
}

.editor-container {
  border: 1px solid #ccc;
  border-radius: 0 0 8px 8px;
  border-top: none;
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
