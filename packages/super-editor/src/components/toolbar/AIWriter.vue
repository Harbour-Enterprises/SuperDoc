<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { write, writeStreaming, rewrite, rewriteStreaming } from './ai-helpers';

const props = defineProps({
  selectedText: {
    type: String,
    required: true,
  },
  handleClose: {
    type: Function,
    required: true,
  },
  superToolbar: {
    type: Object,
    required: true,
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

// Add ref for the editable div
const editableRef = ref(null);

// Save selection when component is mounted
onMounted(() => {
  if (props.selectedText) {
    selectionState.value = props.superToolbar.activeEditor.state.selection;
    // Store the selection in the editor's state
    props.superToolbar.activeEditor.commands.setMeta('storedSelection', selectionState.value);

    // Emit ai highlight when the writer mounts
    props.superToolbar.emit('ai-highlight-add');
  }

  // Focus the input element on mount using nextTick to ensure DOM is ready
  nextTick(() => {
    if (editableRef.value) {
      editableRef.value.focus();
      // Optional: Place cursor at end of any existing text
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editableRef.value);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  // Add click outside listener
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  // emit the ai highlight remove event
  props.superToolbar.emit('ai-highlight-remove');

  // Remove click outside listener
  document.removeEventListener('mousedown', handleClickOutside);
});

// Computed property to determine text based on selection
const placeholderText = computed(() =>
  props.selectedText ? 'Insert prompt to update text' : 'Insert prompt to generate text',
);

const isLoading = ref(false);
const isError = ref('');
const promptText = ref('');

// Computed property to check if editor is in suggesting mode
const isInSuggestingMode = computed(() => {
  return props.superToolbar.activeEditor.isInSuggestingMode?.() || false;
});

// Helper to get document XML from the editor if needed
const getDocumentXml = () => {
  try {
    // Get document content as XML if available
    // This is a placeholder, implement according to your editor's capability
    return props.superToolbar.activeEditor.state.doc.textContent || '';
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
      props.superToolbar.activeEditor.commands.deleteSelection();
      // Remove the ai highlight
      props.superToolbar.emit('ai-highlight-remove');
      textProcessingStarted.value = true;
    }
    
    // If the text is null, undefined or empty, don't process it
    if (text === null || text === undefined) {
      return;
    }
    
    // Convert to string in case it's not already a string
    const textStr = String(text || '');
    
    // Handle incremental updates with plaintext
    // Only insert content that hasn't been inserted yet
    let newContent = '';
    
    if (previousText.value.length === 0) {
      // First chunk - insert everything
      newContent = textStr;
    } else {
      // Subsequent chunks - only insert what's new
      if (textStr.startsWith(previousText.value)) {
        // If text is an extension of previous text
        newContent = textStr.slice(previousText.value.length);
      } else {
        // If it's completely different (unlikely with streaming)
        newContent = textStr;
      }
    }
    
    // Update the document with only the new content
    if (newContent) {
      props.superToolbar.activeEditor.commands.insertContent(newContent);
      previousText.value = textStr;
    }
  } catch (error) {
    console.error('Error handling text chunk:', error);
  }
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
      props.superToolbar.activeEditor.commands.enableTrackChanges();
    }

    // Get document content for context
    const documentXml = getDocumentXml();

    // Common options for API calls
    const options = {
      // @todo: implement grabbing document text
      docText: '',
      documentXml: documentXml,
      config: {
        // Pass the aiApiKey from superToolbar to the AI helper functions
        apiKey: props.superToolbar.aiApiKey,
      }
    };

    // @DEBUG - Use non-streaming for now
    // Determine if we should use streaming or non-streaming
    const useStreaming = true; // Set to true to use streaming

    if (useStreaming) {
      // STREAMING APPROACH
      if (props.selectedText) {
        // Use rewriteStreaming for selected text
        await rewriteStreaming(props.selectedText, promptText.value, options, handleTextChunk);
      } else {
        // Use writeStreaming for generating new text
        await writeStreaming(promptText.value, options, handleTextChunk);
      }
    } else {
      // NON-STREAMING APPROACH
      let generatedText;
      
      if (props.selectedText) {
        // Get rewritten text
        generatedText = await rewrite(props.selectedText, promptText.value, options);
        
        // Remove the selected text
        props.superToolbar.activeEditor.commands.deleteSelection();
        // Remove the ai highlight
        props.superToolbar.emit('ai-highlight-remove');
      } else {
        // Get generated text
        generatedText = await write(promptText.value, options);
      }
      
      // Insert the generated text
      if (generatedText) {
        props.superToolbar.activeEditor.commands.insertContent(generatedText);
      }
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
      props.superToolbar.activeEditor.commands.disableTrackChanges();
    }
    isLoading.value = false;
  }
};

// New handler for keydown
const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSubmit();
  }
};

// New handler for input
const handleInput = (event) => {
  if (isError.value) {
    isError.value = '';
  }
  promptText.value = event.target.textContent;
};
</script>

<template>
  <div class="ai-writer" ref="aiWriterRef">
    <div class="ai-user-input-field">
      <span class="">
        <i class="far fa-edit fa-gradient"></i>
      </span>

      <div
        ref="editableRef"
        contenteditable="true"
        class="ai-editable"
        :data-placeholder="placeholderText"
        @keydown="handleKeyDown"
        @input="handleInput"
      ></div>
    </div>
    <div class="ai-loader">
      <span v-if="isLoading" class="ai-textarea-icon loading">
        <span class="spinner-wrapper">
          <i class="far fa-sun"></i>
        </span>
      </span>
      <span v-else-if="isError" class="ai-textarea-icon error"><i class="far fa-times-circle" :title="isError"></i></span>
      <span v-else-if="promptText" class="ai-textarea-icon ai-submit-button"
        ><i class="far fa-paper-plane fa-gradient" @click="handleSubmit"></i
      ></span>
    </div>
  </div>
</template>

<style scoped>
.fa-gradient {
	background: linear-gradient(
    270deg,
    rgba(218, 215, 118, 0.5) -20%,
    rgba(191, 100, 100, 1) 30%,
    rgba(77, 82, 217, 1) 60%,
    rgb(255, 219, 102) 150%
  );
  background-clip: text;
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.ai-writer {
  display: flex;
  flex-direction: column;
  width: 300px;
  overflow-y: scroll;
  /* Firefox */
  scrollbar-width: none;
  /* Internet Explorer and Edge */
  -ms-overflow-style: none;
}

/* Chrome, Safari, and Opera */
.ai-writer::-webkit-scrollbar {
  display: none;
}

.ai-editable {
  padding-left: 8px;
  width: 100%;

  color: #47484a;
  font-size: initial;
  line-height: initial;
  border: initial;
  background-color: initial;
  outline: none;
  border: none;
  font-size: 13px;
  display: inline;
}

.ai-user-input-field {
  line-height: 13px;
  display: flex;
  flex-direction: row;

  min-height: 50px;
  height: 50px;
  padding: 10px;
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

.ai-editable[data-placeholder]:empty::before {
  content: attr(data-placeholder);
  pointer-events: none;
  font-size: 13px;
  color: #666;
  font-weight: 400;
  line-height: 1.5;
  font-family: Inter, sans-serif;
}

.ai-loader {
  display: flex;
  height: 14px;
  justify-content: flex-end;
  align-items: center;
  padding-right: 5px;
  padding-left: 5px;
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
</style>
