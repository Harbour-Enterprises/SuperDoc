
// Available actions dictionary - matches the planner's built-in tools
const actionsDictionary = {
  'findAll': { 
    label: 'Find All', 
    description: 'Locate all occurrences of content matching the instruction',
    method: (ai, prompt) => ai.action.findAll(prompt) 
  },
  'highlight': { 
    label: 'Highlight', 
    description: 'Visually highlight text without changing it. Use for: drawing attention to issues, marking items for discussion, indicating areas of concern.',
    method: (ai, prompt) => ai.action.highlight(prompt) 
  },
  'replaceAll': { 
    label: 'Replace All', 
    description: 'DIRECT batch editing (no tracking). Use ONLY when user explicitly wants all instances changed immediately AND the user does NOT provide exact find/replace text pairs.',
    method: (ai, prompt) => ai.action.replaceAll(prompt) 
  },
  'literalReplace': { 
    label: 'Literal Replace', 
    description: 'PREFERRED for explicit find-and-replace operations. Use when the user provides both the exact text to find AND the exact replacement text.',
    method: (ai, prompt) => {
      // For literal replace, we need to parse the prompt differently
      // This is a simplified version - in practice, the planner would handle this
      const parts = prompt.split(/ to | with /i);
      if (parts.length >= 2) {
        const findText = parts[0].trim();
        const replaceText = parts.slice(1).join(' ').trim();
        return ai.action.literalReplace(findText, replaceText, { trackChanges: false });
      }
      throw new Error('Literal replace requires format: "find X to replace with Y"');
    }
  },
  'insertTrackedChanges': { 
    label: 'Insert Tracked Changes', 
    description: 'PRIMARY TOOL for suggesting multiple edits. Creates tracked changes across multiple locations. Use for: batch corrections, applying consistent changes, multiple editing suggestions.',
    method: (ai, prompt) => ai.action.insertTrackedChanges(prompt) 
  },
  'insertComments': { 
    label: 'Insert Comments', 
    description: 'PRIMARY TOOL for providing feedback in multiple locations when location criteria are complex or require AI interpretation. Use for: comprehensive document review, multiple questions, batch feedback.',
    method: (ai, prompt) => ai.action.insertComments(prompt) 
  },
  'literalInsertComment': { 
    label: 'Literal Insert Comment', 
    description: 'PREFERRED for explicit find-and-add-comment operations. Use when the user provides both the exact text to find AND the exact comment text to add.',
    method: (ai, prompt) => {
      // Simplified version - planner would handle this better
      const parts = prompt.split(/ with comment | add comment /i);
      if (parts.length >= 2) {
        const findText = parts[0].trim();
        const commentText = parts.slice(1).join(' ').trim();
        return ai.action.literalInsertComment(findText, commentText);
      }
      throw new Error('Literal insert comment requires format: "find X with comment Y"');
    }
  },
  'summarize': { 
    label: 'Summarize', 
    description: 'Generate a summary or clarification of content. Use for: creating executive summaries, explaining complex sections, condensing information.',
    method: (ai, prompt) => ai.action.summarize(prompt) 
  },
  'insertContent': { 
    label: 'Insert Content', 
    description: 'Draft and insert new content relative to the current selection. Use for inserting headings, lists, clauses, or replacing selected text.',
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