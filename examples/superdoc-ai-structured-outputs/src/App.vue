<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { SuperDoc } from 'superdoc'
import { executeTool } from './sd-955-ai-builder-v0/index.js'
import BottomChat from './components/BottomChat.vue'
import 'superdoc/style.css'
import './style.css'

const MAX_ROUNDS = 5

const statusText = ref('Waiting for SuperDoc...')
const buttonsEnabled = ref(false)
const superdocInstance = ref(null)
const prompt = ref('')
const isSidebarCollapsed = ref(false)
const messages = ref([])
let editor = null

// Message ID counter
let messageId = 0

// Check if backend is available
function initBackend() {
  // No API key needed on frontend anymore
  console.log('🤖 Backend chat API ready')
  return true
}

// Build system prompt with current document state
function buildSystemPrompt() {
  const selection = editor.view?.state?.selection
  const documentJSON = editor.view?.state?.doc?.toJSON()

  return `You are a document editing assistant using SuperDoc AI Builder.

Current document:
${JSON.stringify(documentJSON, null, 2)}

Current selection: ${selection?.from || 0} to ${selection?.to || 0}

TOOLS:
- searchContent: Find text in document, returns positions
- replaceContent: Replace text (use query param to find and replace by text)
- readContent/readSelection/readSection: Read document content
- insertContent: Insert new content at position
- getContentSchema: Get the JSON schema for content format

IMPORTANT: When inserting/replacing content, call getContentSchema FIRST to get the exact JSON structure required. The schema shows how to create paragraphs, headings, lists, tables, and other complex nodes.

CRITICAL RULES:
- Text nodes MUST have a non-empty "text" field (never empty string or missing)
- Always follow the exact structure from getContentSchema
- Study the current document JSON above to see valid node examples

Complete the user's request using the tools.`
}

// Call backend API for a single round
async function callBackendAPI(conversationMessages, systemPrompt) {
  const apiBase = import.meta.env.DEV ? 'http://localhost:8788' : ''
  const response = await fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: conversationMessages,
      systemPrompt
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Execute tools client-side and return results for Anthropic
async function executeToolsClientSide(toolCalls) {
  const results = []

  for (const toolCall of toolCalls) {
    try {
      console.log(`🔧 Executing tool: ${toolCall.name}`, toolCall.input)
      const result = await executeTool(toolCall.name, toolCall.input, editor)
      console.log(`✅ Tool ${toolCall.name} result:`, result)

      results.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: JSON.stringify(result)
      })
    } catch (error) {
      console.error(`❌ Tool ${toolCall.name} error:`, error)
      results.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: JSON.stringify({ success: false, error: error.message }),
        is_error: true
      })
    }
  }

  return results
}

// Chat with backend API - client-side agentic loop
async function chatWithBackend(userPrompt) {
  if (!editor) {
    throw new Error('Editor not available')
  }

  // Add user message to chat
  const userMessage = {
    id: ++messageId,
    type: 'user',
    content: userPrompt,
    timestamp: Date.now()
  }
  messages.value.push(userMessage)

  try {
    const systemPrompt = buildSystemPrompt()
    const allToolsUsed = []
    let textResponse = ''
    let round = 0

    // Start conversation with user message
    let conversationMessages = [{
      role: 'user',
      content: userPrompt
    }]

    // Agentic loop - continue until no more tool calls or max rounds
    while (round < MAX_ROUNDS) {
      round++
      statusText.value = `Claude is thinking... (round ${round})`

      const data = await callBackendAPI(conversationMessages, systemPrompt)
      console.log(`🤖 Round ${round} response:`, data)

      // Capture text response if present
      if (data.textResponse) {
        textResponse = data.textResponse
      }

      // If there are tool calls, execute them client-side
      if (data.toolCalls && data.toolCalls.length > 0) {
        // Execute tools
        const toolResults = await executeToolsClientSide(data.toolCalls)

        // Track tools used for UI
        for (let i = 0; i < data.toolCalls.length; i++) {
          const tc = data.toolCalls[i]
          const result = JSON.parse(toolResults[i].content)
          allToolsUsed.push({
            name: tc.name,
            input: tc.input,
            result: result,
            success: result?.success !== false,
            message: result?.message || ''
          })
        }

        // Add assistant response (with tool_use) to conversation
        conversationMessages.push({
          role: 'assistant',
          content: data.assistantContent
        })

        // Add tool results as user message (required by Anthropic API)
        conversationMessages.push({
          role: 'user',
          content: toolResults
        })

        // If stop reason is 'end_turn', Claude is done even with tool calls
        if (data.stopReason === 'end_turn') {
          break
        }
      } else {
        // No tool calls - we're done
        break
      }
    }

    // Add final assistant message to chat
    const assistantMessage = {
      id: ++messageId,
      type: 'assistant',
      content: textResponse || (allToolsUsed.length > 0 ? 'Done! I made the requested changes.' : 'How can I help you?'),
      tools: allToolsUsed,
      timestamp: Date.now()
    }
    messages.value.push(assistantMessage)

    return {
      response: textResponse,
      toolsUsed: allToolsUsed,
      totalTools: allToolsUsed.length,
      rounds: round
    }

  } catch (error) {
    console.error('❌ Chat error:', error)

    // Add error message to chat
    const errorMessage = {
      id: ++messageId,
      type: 'assistant',
      content: `Sorry, I encountered an error: ${error.message}`,
      timestamp: Date.now()
    }
    messages.value.push(errorMessage)

    throw error
  }
}

// Send message to AI
async function sendMessage() {
  const promptToExecute = prompt.value.trim()
  
  if (!promptToExecute) return

  // Clear prompt immediately
  prompt.value = ''
  buttonsEnabled.value = false

  try {
    await chatWithBackend(promptToExecute)
    console.log('💬 Chat updated with new messages')
    
  } catch (error) {
    console.error('Chat error:', error)
    statusText.value = `Error: ${error.message}`
  } finally {
    buttonsEnabled.value = true
    statusText.value = 'Ready to chat...'
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
  }
  
  config.onEditorCreate = () => {
    // Initialize backend connection
    if (initBackend()) {
      editor = superdoc.activeEditor
      statusText.value = 'Ready to chat...'
      buttonsEnabled.value = true
    }
  };

  const superdoc = new SuperDoc(config);
  superdocInstance.value = superdoc;
}

onMounted(async () => {
  try {
    const response = await fetch('/default.docx')
    if (response.ok) {
      const blob = await response.blob()
      initializeSuperdoc(blob)
    } else {
      initializeSuperdoc()
    }
  } catch (error) {
    console.warn('Could not load default.docx, initializing without document:', error)
    initializeSuperdoc()
  }
})

onUnmounted(() => {
  // Cleanup if needed
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
          <div class="toolbar-container">
            <div id="superdoc-toolbar"></div>
          </div>
          <div class="document-content">
            <div id="superdoc"></div>
          </div>
        </div>
        
      <!-- Bottom Chat Overlay -->
      <BottomChat
        :messages="messages"
        :prompt="prompt"
        :buttons-enabled="buttonsEnabled"
        :is-collapsed="isSidebarCollapsed"
        @update:prompt="prompt = $event"
        @send-message="sendMessage"
        @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      />
      </main>
    </div>
  </div>
</template>