import { ref } from 'vue'

// Helper function for text truncation
function truncateText(text, maxLength) {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

export class ActionLogger {
  constructor() {
    this.actionLogs = ref([])
    this.currentLogId = 0
    this.currentOriginalLogId = null
  }

  addActionLog(action, prompt) {
    const log = {
      id: this.currentLogId++,
      action: action,
      prompt: prompt,
      status: 'Starting...',
      partialResult: null,
      fullResult: null,
      error: null
    }
    this.actionLogs.value.push(log)
    this.currentOriginalLogId = log.id
    return log
  }

  updateCurrentLog(updates) {
    if (this.actionLogs.value.length > 0) {
      const currentLog = this.actionLogs.value[this.actionLogs.value.length - 1]
      Object.assign(currentLog, updates)
    }
  }

  updateLogById(logId, updates) {
    const logIndex = this.actionLogs.value.findIndex(log => log.id === logId)
    if (logIndex !== -1) {
      Object.assign(this.actionLogs.value[logIndex], updates)
    }
  }

  updateStreamingResult(context) {
    this.updateCurrentLog({ 
      status: 'Streaming...', 
      partialResult: truncateText(context.partialResult, 100) 
    })
  }

  updateStreamingEnd(context) {
    this.updateCurrentLog({ 
      status: 'Done.', 
      fullResult: truncateText(String(context.fullResult), 100) 
    })
  }

  updateError(error) {
    this.updateCurrentLog({ 
      status: 'Error', 
      error: error.message 
    })
  }

  updateNoToolsRun(result) {
    this.updateCurrentLog({ 
      status: 'No tools were run.', 
      fullResult: truncateText(String(result), 100) 
    })
  }

  updateOriginalLog(toolCallsCount) {
    if (!this.currentOriginalLogId) return
    
    const originalLogIndex = this.actionLogs.value.findIndex(log => log.id === this.currentOriginalLogId)
    if (originalLogIndex !== -1) {
      this.actionLogs.value[originalLogIndex].status = `All ${toolCallsCount} function calls completed.`
    }
  }

  handleError(error) {
    console.error('Open prompt error:', error)
    
    if (this.currentOriginalLogId) {
      const originalLogIndex = this.actionLogs.value.findIndex(log => log.id === this.currentOriginalLogId)
      if (originalLogIndex !== -1) {
        this.actionLogs.value[originalLogIndex].status = 'Open prompt failed.'
        this.actionLogs.value[originalLogIndex].error = error.message
      }
    } else {
      this.updateCurrentLog({ status: 'Open prompt failed.', error: error.message })
    }
  }
}