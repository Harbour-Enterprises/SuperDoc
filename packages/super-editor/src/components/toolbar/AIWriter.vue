<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { writeStreaming, rewriteStreaming } from './ai-helpers';

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
  key: {
    type: String,
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

// Save selection when component is mounted
onMounted(() => {
  if (props.selectedText) {
    selectionState.value = props.editor.state.selection;
    // Store the selection in the editor's state
    props.editor.commands.setMeta('storedSelection', selectionState.value);

    // Emit ai highlight when the writer mounts through the toolbar
    if (props.superToolbar) {
      props.superToolbar.emit('ai-highlight-add');
    }
  }

  // Focus the textarea on mount
  nextTick(() => {
    if (editableRef.value) {
      editableRef.value.focus();
    }
  });

  // Add click outside listener
  document.addEventListener('mousedown', handleClickOutside);

  // Add a capture phase event listener directly to the document
  // We have to intercept the arrow keys to prevent them from being intercepted by ProseMirror
  document.addEventListener('keydown', handleCaptureKeyDown, true);
});

onUnmounted(() => {
  // emit the ai highlight remove event through the toolbar
  if (props.superToolbar) {
    props.superToolbar.emit('ai-highlight-remove');
  }

  // Remove all event listeners
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleCaptureKeyDown, true);
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
          class: 'ai-text-appear',
          'data-mark-id': `ai-animation-${Date.now()}`
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
        apiKey: props.key,
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
      <span class="ai-textarea-icon">
        <i class="gradient-svg edit"></i>
      </span>

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
      <span v-if="isLoading" class="ai-textarea-icon loading">
        <span class="spinner-wrapper">
          <i class="gradient-svg sun"></i>
        </span>
      </span>
      <span v-else-if="isError" class="ai-textarea-icon error"
        ><i class="gradient-svg times-circle" :title="isError"></i
      ></span>
      <span v-else-if="promptText" class="ai-textarea-icon ai-submit-button">
        <i class="gradient-svg paper-plane" @click.stop="handleSubmit"></i>
      </span>
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

.paper-plane {
  --webkit-mask-image: url('@harbour-enterprises/common/icons/paper-plane-regular.svg');
  --mask-image: url('@harbour-enterprises/common/icons/paper-plane-regular.svg');
}

.edit {
  --webkit-mask-image: url('@harbour-enterprises/common/icons/edit-regular.svg');
  --mask-image: url('@harbour-enterprises/common/icons/edit-regular.svg');
}

.times-circle {
  --webkit-mask-image: url('@harbour-enterprises/common/icons/times-circle-regular.svg');
  --mask-image: url('@harbour-enterprises/common/icons/times-circle-regular.svg');
  background: #ed4337 !important;
}

.sun {
  --webkit-mask-image: url('@harbour-enterprises/common/icons/sun-regular.svg');
  --mask-image: url('@harbour-enterprises/common/icons/sun-regular.svg');
}

.gradient-svg {
  /* Give your container some size */
  width: 16px;
  height: 16px;

  /* Apply a gradient background */
  background: linear-gradient(
    270deg,
    rgba(218, 215, 118, 0.5) -20%,
    rgba(191, 100, 100, 1) 30%,
    rgba(77, 82, 217, 1) 60%,
    rgb(255, 219, 102) 150%
  );

  /* Use the SVG as a mask */
  -webkit-mask-image: var(--webkit-mask-image);
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;

  mask-image: var(--mask-image);
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
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
  display: flex;
  font-family: 'Font Awesome 5 Pro';
  content: '';
  font-weight: 800;
  font-size: 14px;
  background: linear-gradient(
    270deg,
    rgba(218, 215, 118, 0.5) -20%,
    rgba(191, 100, 100, 1) 30%,
    rgba(77, 82, 217, 1) 60%,
    rgb(255, 219, 102) 150%
  );
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-background-clip: text;
  color: transparent;
}

.ai-textarea-icon.loading {
  animation: spin 2s linear infinite;
}

.loading i {
  display: flex;
}

.ai-textarea-icon.error {
  background: #dc3545;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-background-clip: text;
  color: transparent;
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
