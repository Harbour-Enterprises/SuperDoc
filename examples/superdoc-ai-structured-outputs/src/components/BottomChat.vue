<template>
  <div class="bottom-chat" :class="{ 'collapsed': isCollapsed }">
    <!-- Collapsed state - just a tab -->
    <div v-if="isCollapsed" class="chat-tab" @click="$emit('toggle-collapse')">
      <i class="fa-solid fa-comment"></i>
      <span>Document Assistant</span>
    </div>

    <!-- Expanded state - full chat -->
    <div v-else class="chat-panel">
      <!-- Chat Header -->
      <div class="chat-header">
        <div class="header-left">
          <span>Document Assistant</span>
        </div>
        <button class="hide-button" @click="$emit('toggle-collapse')">
          Hide
        </button>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="welcome-message">
            <i class="fa-solid fa-sparkles"></i>
          </div>
        </div>
        
        <div v-for="message in messages" :key="message.id" class="message" :class="message.type">
          <div class="message-content">
            {{ message.content }}
          </div>
          <div v-if="message.tools && message.tools.length > 0" class="tools-used">
            <div v-for="tool in message.tools" :key="tool.id" class="tool-item">
              <span :class="tool.success ? 'success' : 'error'">
                {{ tool.success ? '✓' : '✗' }} {{ tool.name }}
              </span>
              <span class="tool-message">{{ tool.message }}</span>
            </div>
          </div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <!-- Chat Input -->
      <div class="chat-input">
        <div class="input-container">
          <textarea
            :value="prompt"
            @input="$emit('update:prompt', $event.target.value)"
            @keydown="handleKeydown"
            placeholder="What would you like to change in this document?"
            rows="1"
            :disabled="!buttonsEnabled"
            ref="textareaRef"
          ></textarea>
          <button
            @click="$emit('send-message')"
            :disabled="!buttonsEnabled || !prompt.trim()"
            class="send-button"
          >
            <i v-if="buttonsEnabled" class="fa-solid fa-arrow-up"></i>
            <i v-else class="fa-solid fa-spinner fa-spin"></i>
          </button>
        </div>
        <div class="input-hint">
          Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  prompt: { type: String, default: '' },
  buttonsEnabled: { type: Boolean, default: true },
  isCollapsed: { type: Boolean, default: false }
})

const emit = defineEmits(['update:prompt', 'send-message', 'toggle-collapse'])

const messagesContainer = ref(null)
const textareaRef = ref(null)

// Auto-scroll to bottom when new messages arrive
watch(() => props.messages.length, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

// Auto-resize textarea
watch(() => props.prompt, () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px'
    }
  })
})

onMounted(() => {
  if (textareaRef.value) {
    textareaRef.value.style.height = '40px'
  }
})

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (props.buttonsEnabled && props.prompt.trim()) {
      emit('send-message')
    }
  }
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>

<style scoped>
.bottom-chat {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 1000;
}

.bottom-chat.collapsed {
  right: 20px;
  bottom: 20px;
}

/* Collapsed Tab */
.chat-tab {
  background: #3b82f6;
  color: white;
  padding: 12px 16px;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.chat-tab:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

/* Expanded Panel */
.chat-panel {
  width: 480px;
  height: 400px;
  background: white;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

.header-left i {
  color: #3b82f6;
}

.hide-button {
  background: #e5e7eb;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.2s;
}

.hide-button:hover {
  background: #d1d5db;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome-message {
  text-align: center;
  color: #6b7280;
}

.welcome-message i {
  font-size: 24px;
  color: #3b82f6;
  margin-bottom: 8px;
}

.welcome-message p {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: #111827;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion {
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-style: italic;
  color: #6b7280;
}

.message {
  max-width: 85%;
  word-wrap: break-word;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-content {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.message.user .message-content {
  background: #3b82f6;
  color: white;
}

.message.assistant .message-content {
  background: #f3f4f6;
  color: #111827;
}

.tools-used {
  margin-top: 6px;
  font-size: 11px;
  color: #6b7280;
}

.tool-item {
  display: block;
  margin: 2px 0;
}

.tool-item .success {
  color: #10b981;
  font-weight: 500;
}

.tool-item .error {
  color: #ef4444;
  font-weight: 500;
}

.tool-message {
  margin-left: 6px;
  color: #9ca3af;
}

.message-time {
  margin-top: 4px;
  font-size: 10px;
  color: #9ca3af;
}

.message.user .message-time {
  text-align: right;
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 8px;
}

.input-container textarea {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  line-height: 1.4;
  min-height: 40px;
  max-height: 120px;
}

.input-container textarea:focus {
  outline: none;
}

.input-container textarea:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.send-button {
  padding: 8px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #2563eb;
}

.send-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.send-button:disabled .fa-spinner {
  color: #6b7280;
}

.input-container:has(textarea:disabled) {
  opacity: 0.7;
  background: #f3f4f6;
}

.input-hint {
  margin-top: 6px;
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

/* Custom scrollbar */
.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Responsive */
@media (max-width: 600px) {
  .chat-panel {
    width: 100vw;
    height: 50vh;
    border-radius: 0;
  }
  
  .bottom-chat.collapsed {
    right: 16px;
    bottom: 16px;
  }
}
</style>