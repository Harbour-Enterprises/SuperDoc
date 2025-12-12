<template>
  <div class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <button class="collapse-toggle" @click="$emit('toggle-collapse')" :aria-label="isCollapsed ? 'Show sidebar' : 'Hide sidebar'">
      <span class="chevron">{{ isCollapsed ? '‹' : '›' }}</span>
    </button>
    <div class="sidebar-content" v-show="!isCollapsed">
    <div class="history-section">
      <div class="section-header">
        <span>Tool Usage</span>
      </div>
      <div class="history-content">
        <div v-if="actionLogs.length === 0" class="history-placeholder">
          Your tool usage will be logged here.
        </div>
        <div v-else>
          <div v-for="log in [...actionLogs].reverse()" :key="log.id" class="history-item">
            <div class="history-action">
              <strong>{{ log.action }}:</strong> "{{ log.prompt }}"
            </div>
            <div class="history-status">
              <span v-if="isProcessing(log.status)" class="spinner"></span>
              {{ log.status || 'Starting...' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="controls-section">
      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button 
          class="mode-toggle-btn"
          :class="{ 'active': mode === 'prompt' }"
          @click="setMode('prompt')"
        >
          Prompt
        </button>
        <button 
          class="mode-toggle-btn"
          :class="{ 'active': mode === 'tool' }"
          @click="setMode('tool')"
        >
          Tool
        </button>
      </div>

      <!-- Tool Selection Row -->
      <div class="control-row">
        <div class="dropdown-container">
          <button 
            class="custom-dropdown"
            @click="toggleDropdown"
            :class="{ 'is-open': isDropdownOpen }"
            :disabled="mode === 'prompt'"
          >
            <span v-if="mode === 'prompt'">
              Open Prompt <small>(using {{ availableToolsCount }} tools)</small>
            </span>
            <span v-else>{{ selectedAction.label }}</span>
            <i class="fa-solid fa-chevron-down dropdown-arrow" v-if="mode !== 'prompt'"></i>
          </button>
          <div 
            v-show="isDropdownOpen && mode !== 'prompt'" 
            class="dropdown-menu"
            @click="closeDropdown"
          >
            <button
              v-for="action in filteredActions"
              :key="action.key"
              class="dropdown-item"
              :class="{ 'is-selected': selectedAction.key === action.key }"
              @click="selectAction(action)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <button 
          class="run-button" 
          @click="executeAction"
          :disabled="!buttonsEnabled || !prompt.trim()"
        >
          <i class="fa-solid fa-play"></i>
          Run
        </button>
      </div>

      <!-- Prompt Input -->
      <div class="prompt-container">
        <textarea
          :value="prompt"
          @input="$emit('update:prompt', $event.target.value)"
          @keydown="handleKeydown"
          class="prompt-textarea"
          :placeholder="mode === 'prompt' ? 'Enter your prompt here (AI will choose tools automatically)...' : 'Enter your prompt here...'"
          rows="4"
        ></textarea>
        <div class="prompt-hint">
          Press Enter to run • Shift+Enter for new line
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  actionLogs: Array,
  mode: String,
  isDropdownOpen: Boolean,
  selectedAction: Object,
  availableToolsCount: Number,
  filteredActions: Array,
  buttonsEnabled: Boolean,
  prompt: String,
  isCollapsed: Boolean
})

const emit = defineEmits([
  'update:mode',
  'update:isDropdownOpen', 
  'update:selectedAction',
  'update:prompt',
  'executeAction',
  'toggle-collapse'
])

function isProcessing(status) {
  return status && (
    status.includes('Starting') ||
    status.includes('Processing') ||
    status.includes('Streaming') ||
    status.includes('Executing')
  )
}

function setMode(newMode) {
  emit('update:mode', newMode)
}

function toggleDropdown() {
  emit('update:isDropdownOpen', !props.isDropdownOpen)
}

function closeDropdown() {
  emit('update:isDropdownOpen', false)
}

function selectAction(action) {
  emit('update:selectedAction', action)
  emit('update:isDropdownOpen', false)
}

function executeAction() {
  emit('executeAction')
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (props.buttonsEnabled && props.prompt.trim()) {
      executeAction()
    }
  }
}
</script>