<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { writeStreaming, rewriteStreaming } from './ai-helpers';
import edit from '@harbour-enterprises/common/icons/edit-regular.svg?raw';
import paperPlane from '@harbour-enterprises/common/icons/paper-plane-regular.svg?raw';
import timesCircle from '@harbour-enterprises/common/icons/times-circle-regular.svg?raw';
import sun from '@harbour-enterprises/common/icons/sun-regular.svg?raw';

const props = defineProps({
  selectedText: {
    type: String,
    required: true,
  },
  handleClose: {
    type: Function,
    required: true,
  },
  editor: {
    type: Object,
    required: true,
  },
  apiKey: {
    type: String,
  },
  endpoint: {
    type: String,
    required: false,
  },
/**
   * AIWriter component is used both in the superToolbar and SuperDoc directly
   * When we are rending in the toolbar menu, our events are emitted through toolbar to Superdoc
   * When we are rendering directly in SuperDoc, we need to emit the events through Superdoc and do not need to 
   * emit any events through 
   */
  superToolbar: {
    type: Object,
  },
});

// Store the selection state
const selectionState = ref(null);

// Add click outside handler
const aiWriterRef = ref(null);

const handleClickOutside = (event) => {
  if (aiWriterRef.value && !aiWriterRef.value.contains(event.target)) {
    props.handleClose();
  }
};

// Add ref for the textarea
const editableRef = ref(null);

// Helper function to emit AI highlight events
const emitAiHighlight = (type, data = null) => {
  if (props.superToolbar) {
    props.superToolbar.emit('ai-highlight', { type, data });
  }
};

// Helper functions
const saveSelection = () => {
  if (props.selectedText) {
    selectionState.value = props.editor.state.selection;
    // Store the selection in the editor's state
    props.editor.commands.setMeta('storedSelection', selectionState.value);

    // Emit ai highlight when the writer mounts through the toolbar
    emitAiHighlight('add');
  }
};

const focusTextarea = () => {
  nextTick(() => {
    if (editableRef.value) {
      editableRef.value.focus();
    }
  });
};

const addEventListeners = () => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleCaptureKeyDown, true);
};

const removeEventListeners = () => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleCaptureKeyDown, true);
};

// Save selection when component is mounted
onMounted(() => {
  saveSelection();
  focusTextarea();
  addEventListeners();
});

onUnmounted(() => {
  // emit the ai highlight remove event through the toolbar
  emitAiHighlight('remove');

  // Remove all event listeners
  removeEventListeners();
});

// Capture phase handler to stop arrow key events from being intercepted in our ai textarea
const handleCaptureKeyDown = (event) => {
  if (
    editableRef.value &&
    event.target === editableRef.value &&
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
  ) {
    event.stopPropagation(); // This prevents ProseMirror from seeing the event
  }
};

// Computed property to determine text based on selection
const placeholderText = computed(() =>
  props.selectedText ? 'Insert prompt to update text' : 'Insert prompt to generate text',
);

const isLoading = ref(false);
const isError = ref('');
const promptText = ref('');

// Computed property to check if editor is in suggesting mode
const isInSuggestingMode = computed(() => {
  return props.editor.isInSuggestingMode?.() || false;
});

// Helper to get document XML from the editor if needed
const getDocumentXml = () => {
  try {
    // Get document content as XML if available
    // This is a placeholder, implement according to your editor's capability
    return props.editor.state.doc.textContent || '';
  } catch (error) {
    console.error('Error getting document XML:', error);
    return '';
  }
};

// Handler for processing text chunks from the stream
const handleTextChunk = (text) => {
  try {
    // If this is the first chunk and we're rewriting, remove the selected text
    if (props.selectedText && !textProcessingStarted.value) {
      props.editor.commands.deleteSelection();
      textProcessingStarted.value = true;
    }

    // If the text is null, undefined or empty, don't process it
    if (text === null || text === undefined || text === '') {
      return;
    }

    // Convert to string in case it's not already a string
    const textStr = String(text);

    // Wrap the content in a span with our animation class and unique ID
    const wrappedContent = {
      type: 'text',
      marks: [{
        type: 'aiAnimationMark',
        attrs: { 
          class: 'sd-ai-text-appear',
          'dataMarkId': `ai-animation-${Date.now()}`
        }
      }],
      text: textStr
    };

    // Insert the new content
    props.editor.commands.insertContent(wrappedContent);
    
    // Hide the AI Writer after content is received
    props.handleClose();

  } catch (error) {
    console.error('Error handling text chunk:', error);
  }
};

// Handler for when the stream is done
const handleDone = () => {
  // If we are done we can remove the animation mark
  // We need to wait for the animation to finish before removing the mark
  setTimeout(() => {
    props.editor.commands.removeAiMark('aiAnimationMark');
  }, 1000);
};

// Track text processing state
const textProcessingStarted = ref(false);
const previousText = ref('');

// Refactored handleSubmit function
const handleSubmit = async () => {
  // Reset state
  isLoading.value = true;
  isError.value = '';
  textProcessingStarted.value = false;
  previousText.value = '';

  try {
    // Enable track changes if in suggesting mode
    if (isInSuggestingMode.value) {
      props.editor.commands.enableTrackChanges();
    }

    // Get document content for context
    const documentXml = getDocumentXml();

    // Common options for API calls
    const options = {
      // @todo: implement grabbing document text
      docText: '',
      documentXml: documentXml,
      config: {
        // Pass the aiApiKey to the AI helper functions
        apiKey: props.apiKey,
        endpoint: props.endpoint,
      },
    };

    // Always use streaming approach
    if (props.selectedText) {
      // Use rewriteStreaming for selected text
      await rewriteStreaming(props.selectedText, promptText.value, options, handleTextChunk, handleDone);
    } else {
      // Use writeStreaming for generating new text
      await writeStreaming(promptText.value, options, handleTextChunk, handleDone);
    }

    // If all is good, close the AI Writer
    props.handleClose();
  } catch (error) {
    console.error('AI generation error:', error);
    isError.value = error.message || 'An error occurred';
  } finally {
    promptText.value = ''; // Clear the input after submission
    // Only disable track changes if we enabled it (in suggesting mode)
    if (isInSuggestingMode.value) {
      props.editor.commands.disableTrackChanges();
    }
    isLoading.value = false;
  }
};

// New handler for keydown
const handleKeyDown = (event) => {
  // For Enter key, submit the form instead of adding a new line
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
};

// Updated handler for input to work with textarea
const handleInput = (event) => {
  if (isError.value) {
    isError.value = '';
  }
  // Textarea provides value instead of textContent
  promptText.value = event.target.value;
};
</script>

<template>
  <div class="ai-writer prosemirror-isolated" ref="aiWriterRef" @mousedown.stop>
    <div class="ai-user-input-field">
      <span class="ai-textarea-icon" v-html="edit"></span>
      <!-- Replace contenteditable div with textarea -->
      <textarea
        ref="editableRef"
        class="ai-textarea"
        :placeholder="placeholderText"
        @keydown="handleKeyDown"
        @input="handleInput"
        v-model="promptText"
        rows="4"
      ></textarea>
    </div>
    <div class="ai-loader">
      <span v-if="isLoading" class="ai-textarea-icon loading spinner-wrapper">
        <span v-html="sun"></span>
      </span>
      <span v-else-if="isError" class="ai-textarea-icon error" v-html="timesCircle" />
      <span v-else-if="promptText" class="ai-textarea-icon ai-submit-button" @click.stop="handleSubmit" v-html="paperPlane" />
    </div>
  </div>
</template>

<style scoped>
/* Add isolation styles */
.prosemirror-isolated {
  /* Make sure the component is above ProseMirror in z-index */
  z-index: 100;
  position: relative;
}

.ai-writer {
  display: flex;
  flex-direction: column;
  width: 300px;
  border-radius: 5px;
  overflow-y: scroll;
  /* Firefox */
  scrollbar-width: none;
  /* Internet Explorer and Edge */
  -ms-overflow-style: none;

  padding: 0.75rem;
  box-shadow: 0 0 2px 2px #7715b366;
  border: 1px solid #7715b3;
}

/* Chrome, Safari, and Opera */
.ai-writer::-webkit-scrollbar {
  display: none;
}

/* Replace .ai-editable with .ai-textarea */
.ai-textarea {
  padding-left: 8px;
  width: 100%;
  color: #47484a;
  font-size: 12px;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  overflow: hidden;
  height: 100%;
  font-family: Inter, sans-serif;
}

/* Add specific styles for textarea placeholder */
.ai-textarea::placeholder {
  color: #666;
  font-weight: 400;
}

.ai-user-input-field {
  line-height: 13px;
  display: flex;
  flex-direction: row;
  min-height: 50px;
  resize: none;
  border: none;
  border-radius: 8px;
  margin-bottom: 10px;
}

.ai-textarea-icon {
  display: block;
  font-weight: 800;
  font-size: 14px;
  width: 16px;
  height: 16px;
}

.ai-textarea-icon svg {
  height: 16px;
  width: 16px;
}

.ai-textarea-icon.loading {
  animation: spin 2s linear infinite;
}

.loading i {
  display: flex;
}

.error {
  fill: #ed4337;
}

.ai-submit-button {
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.ai-submit-button:hover {
  opacity: 0.8;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ai-loader {
  display: flex;
  height: 14px;
  justify-content: flex-end;
  align-items: center;
}

</style>
