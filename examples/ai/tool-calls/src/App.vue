<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { SuperDoc } from 'superdoc'
import { AIActions } from '@superdoc-dev/ai'
import Sidebar from './components/Sidebar.vue'
import { ActionHandler, availableActions } from './actions.js'
import { ActionLogger } from './logging.js'
import 'superdoc/style.css'
import './style.css'

const statusText = ref('Waiting for SuperDoc...')
const buttonsEnabled = ref(false)
const aiInstance = ref(null)
const superdocInstance = ref(null)
const prompt = ref('')
const isDropdownOpen = ref(false)
const mode = ref('prompt') // 'prompt' or 'tool'
const isSidebarCollapsed = ref(false)
let actionHandler = null
let logger = null

const selectedAction = ref(null)

// Initialize logger early
logger = new ActionLogger()
// Set default selected action from the static list
selectedAction.value = availableActions[0]

// Computed properties for the new interface
const availableToolsCount = computed(() => {
  return availableActions.length
})

const filteredActions = computed(() => {
  return availableActions
})

// Functions for mode switching
function handleModeUpdate(newMode) {
  mode.value = newMode
  isDropdownOpen.value = false
}


function initializeAI(superdoc) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
  const proxyUrl = import.meta.env.VITE_PROXY_URL

  let provider
  if (proxyUrl) {
    console.log("Open prompt enabled.");
    provider = {
      type: 'http',
      url: proxyUrl,
      streamResults: true
    }
  } else {
    console.error("Open prompt disabled.");
    provider = {
      type: 'openai',
      apiKey,
      model,
      streamResults: true
    }
  }

  if (!apiKey && !proxyUrl) {
    statusText.value = 'Add VITE_OPENAI_API_KEY to .env then restart the dev server to enable AI actions.'
    return null
  }

  statusText.value = 'Connecting to OpenAI...'
  // buttonsEnabled.value = false

  aiInstance.value = new AIActions(superdoc, {
    user: {
      displayName: 'SuperDoc AI Assistant',
      userId: 'ai-demo',
    },
    provider,
    enableLogging: true,
    planner: {
      maxContextLength: 10000,
      onProgress: (event) => {
        console.log('Planner progress:', event)
        if (event.type === 'planning') {
          logger.updateCurrentLog({ status: event.message })
          statusText.value = event.message
        } else if (event.type === 'tool_start') {
          logger.updateCurrentLog({ 
            status: `Executing ${event.tool} (${event.stepIndex + 1}/${event.totalSteps})...` 
          })
          statusText.value = `Executing ${event.tool}...`
        } else if (event.type === 'tool_complete') {
          logger.updateCurrentLog({ 
            status: `Completed ${event.tool} (${event.stepIndex + 1}/${event.totalSteps})` 
          })
        }
      },
    },
    onReady: () => {
      statusText.value = 'AI is ready. Select an action and enter a prompt.'
      buttonsEnabled.value = true
      // Create action handler when AI is ready (for backward compatibility)
      actionHandler = new ActionHandler(aiInstance, logger)
    },
    onStreamingStart: () => {
      statusText.value = 'AI is processing your request...'
      buttonsEnabled.value = false
      logger.updateCurrentLog({ status: 'Processing...' })
    },
    onStreamingPartialResult: (context) => {
      statusText.value = 'AI is streaming results...'
      logger.updateStreamingResult(context)
    },
    onStreamingEnd: (context) => {
      statusText.value = 'AI completed successfully. Ready for next action.'
      // buttonsEnabled.value = true
      logger.updateStreamingEnd(context)
    },
    onError: (error) => {
      console.error(error)
      statusText.value = `Error: ${error.message}`
      // buttonsEnabled.value = true
      logger.updateError(error)
    }
  })

  aiInstance.value.waitUntilReady().catch((error) => {
    console.error(error)
    statusText.value = `AI failed to initialize: ${error.message}`
  })

  return aiInstance.value
}

async function executeAction() {
  if (!aiInstance.value) {
    statusText.value = 'AI is not ready yet. Add your API key and reload.'
    return
  }

  if (!prompt.value.trim()) {
    statusText.value = 'Please enter a prompt first.'
    return
  }

  // Store the prompt value before clearing it
  const promptToExecute = prompt.value

  // Create log entry for this action
  const logLabel = mode.value === 'prompt' ? 'Open Prompt (Planner)' : selectedAction.value.label
  logger.addActionLog(logLabel, promptToExecute)
  
  // Clear the prompt after a small delay to avoid editor transaction conflicts
  setTimeout(() => {
    prompt.value = ''
  }, 100)
  
  buttonsEnabled.value = false

  try {
    // Wait for AI to be ready
    await aiInstance.value.waitUntilReady()

    if (mode.value === 'prompt') {
      // Use the planner to execute the user's request (similar to superchat)
      const result = await aiInstance.value.planner.execute(promptToExecute)
      
      if (result.success) {
        // Format the result for logging
        const segments = []
        
        if (result.response) {
          segments.push(result.response.trim())
        }
        
        if (result.executedTools?.length) {
          segments.push(`✓ Executed tools: ${result.executedTools.join(', ')}`)
        }
        
        if (result.plan?.reasoning) {
          segments.push(`Reasoning: ${result.plan.reasoning.trim()}`)
        }
        
        if (result.plan?.steps?.length) {
          const planLines = result.plan.steps.slice(0, 5).map((step, index) => {
            const instruction = step.instruction?.trim() || 'No instruction provided'
            return `${index + 1}. ${step.tool} — ${instruction}`
          })
          segments.push(`Plan:\n${planLines.join('\n')}`)
        }
        
        if (result.warnings?.length) {
          segments.push(`Warnings:\n${result.warnings.join('\n')}`)
        }
        
        const resultText = segments.join('\n\n') || 'Done!'
        logger.updateCurrentLog({ 
          status: result.executedTools?.length 
            ? `Executed ${result.executedTools.length} tool(s)` 
            : 'Completed',
          response: resultText
        })
        
        const toolCount = result.executedTools?.length || 0
        statusText.value = toolCount
          ? `Executed ${toolCount} tool${toolCount === 1 ? '' : 's'}`
          : 'Responded without document changes'
      } else {
        throw new Error(result.error || 'Execution failed')
      }
      
    } else {
      // Handle regular tool mode - execute selected action directly
      await selectedAction.value.method(aiInstance.value, promptToExecute)
      logger.updateCurrentLog({ status: 'Done.' })
      statusText.value = `${selectedAction.value.label} completed successfully`
    }
    
  } catch (error) {
    console.error(error)
    statusText.value = `AI error: ${error.message}`
    logger.updateCurrentLog({ 
      status: 'Error', 
      error: error.message 
    })
  } finally {
    buttonsEnabled.value = true
  }
}


function handleClickOutside(event) {
  const dropdown = event.target.closest('.dropdown-container')
  if (!dropdown) {
    isDropdownOpen.value = false
  }
}

function importDocument() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.docx'
  input.onchange = (event) => {
    const file = event.target.files[0]
    if (file) {
      try {
        // Reinitialize SuperDoc with the imported file blob
        initializeSuperdoc(file)
      } catch (error) {
        alert('Error importing file: ' + error.message)
      }
    }
  }
  input.click()
}

async function exportDocument() {
  await superdocInstance.value.export();
}

function initializeSuperdoc(documentBlob = null) {
  const config = {
    selector: '#superdoc',
    documentMode: 'editing',
    pagination: true,
    document: documentBlob,
    rulers: true,
    toolbar: '#superdoc-toolbar',
    useLayoutEngine: true,
    user: {
      name: 'AI Assistant',
      email: 'ai@superdoc.com',
    },
    layoutEngineOptions: {
      trackedChanges: {
        mode: 'review',
        enabled: true,
      },
    },
  }
  config.onEditorCreate = () => initializeAI(superdoc);

  const superdoc = new SuperDoc(config);
  superdocInstance.value = superdoc;
}

onMounted(async () => {
  try {
    // Fetch the default.docx file
    const response = await fetch('/default.docx')
    if (response.ok) {
      const blob = await response.blob()
      initializeSuperdoc(blob)
    } else {
      // Fallback to no document if default.docx is not found
      initializeSuperdoc()
    }
  } catch (error) {
    console.warn('Could not load default.docx, initializing without document:', error)
    // Fallback to no document
    initializeSuperdoc()
  }
  
  // Add click outside listener for dropdown
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="page">
    <div class="page-shell">
      <main class="main-layout">
        <div class="document-area">
                      <div class="import-export-buttons">
              <button class="import-btn" @click="importDocument" title="Import Document">
                <i class="fa-solid fa-file-import"></i>
                Import
              </button>
              <button class="export-btn" @click="exportDocument" title="Export Document">
                <i class="fa-solid fa-file-export"></i>
                Export
              </button>
            </div>
          <!-- <h1>SuperDoc AI Tools</h1> -->
          <div class="toolbar-container">
            <div id="superdoc-toolbar"></div>
          </div>
          <div class="document-content">
              <div id="superdoc"></div>
              <Sidebar
              :action-logs="logger?.actionLogs?.value || []"
              :mode="mode"
              :is-dropdown-open="isDropdownOpen"
              :selected-action="selectedAction"
              :available-tools-count="availableToolsCount"
              :filtered-actions="filteredActions"
              :buttons-enabled="buttonsEnabled"
              :prompt="prompt"
              :is-collapsed="isSidebarCollapsed"
              @update:mode="handleModeUpdate"
              @update:is-dropdown-open="isDropdownOpen = $event"
              @update:selected-action="selectedAction = $event"
              @update:prompt="prompt = $event"
              @execute-action="executeAction"
              @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
            />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>