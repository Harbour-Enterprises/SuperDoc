
// Available actions dictionary - defined outside the class for easy access
const actionsDictionary = {
  'find': { 
    label: 'Find', 
    description: 'Find the first occurrence of content in the document based on a search instruction',
    method: (ai, prompt) => ai.action.find(prompt) 
  },
  'findAll': { 
    label: 'Find All', 
    description: 'Find all occurrences of content in the document based on a search instruction',
    method: (ai, prompt) => ai.action.findAll(prompt) 
  },
  'highlight': { 
    label: 'Highlight', 
    description: 'Highlight specific text or sections in the document with optional color',
    method: (ai, prompt) => ai.action.highlight(prompt) 
  },
  'replace': { 
    label: 'Replace', 
    description: 'Replace the first occurrence of content in the document with new text',
    method: (ai, prompt) => ai.action.replace(prompt) 
  },
  'replaceAll': { 
    label: 'Replace All', 
    description: 'Replace all occurrences of content in the document with new text',
    method: (ai, prompt) => ai.action.replaceAll(prompt) 
  },
  'insertTrackedChange': { 
    label: 'Insert Tracked Change', 
    description: 'Insert a single tracked change or suggestion in the document for review',
    method: (ai, prompt) => ai.action.insertTrackedChange(prompt) 
  },
  'insertTrackedChanges': { 
    label: 'Insert Multiple Tracked Changes', 
    description: 'Insert multiple tracked changes or suggestions throughout the document',
    method: (ai, prompt) => ai.action.insertTrackedChanges(prompt) 
  },
  'insertComment': { 
    label: 'Insert Comment', 
    description: 'Add a single comment or annotation to a specific part of the document',
    method: (ai, prompt) => ai.action.insertComment(prompt) 
  },
  'insertComments': { 
    label: 'Insert Multiple Comments', 
    description: 'Add multiple comments or annotations throughout the document',
    method: (ai, prompt) => ai.action.insertComments(prompt) 
  },
  'summarize': { 
    label: 'Summarize', 
    description: 'Generate a summary of the document content or specific sections',
    method: (ai, prompt) => ai.action.summarize(prompt) 
  },
  'insertContent': { 
    label: 'Insert Content', 
    description: 'Insert new content, text, or sections into the document at appropriate locations',
    method: (ai, prompt) => ai.action.insertContent(prompt) 
  },
}

// Export the available actions list as a static array
export const availableActions = Object.keys(actionsDictionary)
  .sort()
  .map(key => ({
    key,
    ...actionsDictionary[key]
  }))

// Action handler class to manage dependencies and reduce parameter passing
export class ActionHandler {
  constructor(aiInstance, logger) {
    this.availableActions = availableActions
    this.aiInstance = aiInstance
    this.logger = logger
  }

  // Build tools array for OpenAI function calling
  buildToolsArray() {
    const convertToOpenAITool = action => ({
      type: "function",
      function: {
        name: action.key,
        description: action.description,
        parameters: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The specific instruction or prompt for this action"
            }
          },
          required: ["prompt"]
        }
      }
    })
    
    return this.availableActions.map(convertToOpenAITool)
  }

  // Make API request to proxy
  async callOpenAI(prompt, tools) {
    const proxyUrl = import.meta.env.VITE_PROXY_URL
    if (!proxyUrl) {
      throw new Error('VITE_PROXY_URL not configured')
    }
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  }

  // Execute a single tool call
  async executeToolCall(toolCall) {
    const functionName = toolCall.function.name
    const args = JSON.parse(toolCall.function.arguments)
    
    const action = this.availableActions.find(a => a.key === functionName)
    
    if (!action?.method) {
      this.logger.addActionLog(functionName, args.prompt)
      this.logger.updateCurrentLog({ status: 'Error', error: 'Tool not found' })
      return `✗ ${functionName}: Tool not found`
    }
    
    try {
      this.logger.addActionLog(action.label, args.prompt)
      console.log(`Executing ${functionName} with prompt:`, args.prompt)
      
      await action.method(this.aiInstance.value, args.prompt)
      
      this.logger.updateCurrentLog({ status: 'Done.' })
      return `✓ ${action.label}: "${args.prompt}"`
      
    } catch (error) {
      console.error(`Error executing ${functionName}:`, error)
      this.logger.updateCurrentLog({ status: 'Error', error: error.message })
      return `✗ ${action.label}: Error - ${error.message}`
    }
  }


  // Execute tool calls from open prompt response
  async executeToolCallsFromPrompt(toolCalls) {
    const toolResults = []
    
    for (const toolCall of toolCalls) {
      const result = await this.executeToolCall(toolCall)
      toolResults.push(result)
    }
    
    this.logger.updateOriginalLog(toolCalls.length)
    
    const result = `Function calls executed:\n${toolResults.join('\n')}`
    console.log('Open prompt result:', result)
    return result
  }

  // Standalone function to handle open prompt AI calls
  async handleOpenPrompt(prompt) {
    try {
      this.logger.updateCurrentLog({ status: 'Processing open prompt...' })
      
      const tools = this.buildToolsArray()
      const data = await this.callOpenAI(prompt, tools)
      const message = data.choices?.[0]?.message
      
      if (message?.tool_calls?.length > 0) {
        console.log('Function calls requested:', message.tool_calls)
        this.logger.updateCurrentLog({ status: `Executing ${message.tool_calls.length} function call(s)...` })
        
        // Return the tool calls for the application to handle
        return {
          type: 'tool_calls',
          toolCalls: message.tool_calls,
          count: message.tool_calls.length
        }
        
      } else {
        // No tools were run
        const result = message?.content || data.content || JSON.stringify(data)
        console.log('Open prompt result:', result)
        this.logger.updateNoToolsRun(result)
        
        return {
          type: 'text_response',
          content: result
        }
      }
      
    } catch (error) {
      this.logger.handleError(error)
      throw error
    }
  }
}