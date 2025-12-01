import { anthropicTools } from './sd-955-ai-builder-v0/index.js'

export async function onRequestPost(context) {
  try {
    const { request, env } = context
    const { messages, systemPrompt } = await request.json()

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({
        error: 'ANTHROPIC_API_KEY not configured'
      }), {
        status: 500,
        headers: corsHeaders('application/json')
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
        tools: anthropicTools(),
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({
        error: `Anthropic API error: ${response.status} ${errorText}`
      }), {
        status: response.status,
        headers: corsHeaders('application/json')
      })
    }

    const responseData = await response.json()

    // Extract tool calls and text response
    const toolCalls = responseData.content?.filter(block => block.type === 'tool_use') || []
    const textBlock = responseData.content?.find(block => block.type === 'text')

    return new Response(JSON.stringify({
      success: true,
      toolCalls: toolCalls.map(tc => ({
        id: tc.id,
        name: tc.name,
        input: tc.input
      })),
      textResponse: textBlock?.text || null,
      stopReason: responseData.stop_reason,
      // Include full assistant content for conversation continuity
      assistantContent: responseData.content
    }), {
      headers: corsHeaders('application/json')
    })

  } catch (error) {
    console.error('Chat function error:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders('application/json')
    })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: corsHeaders()
  })
}

function corsHeaders(contentType) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
  if (contentType) {
    headers['Content-Type'] = contentType
  }
  return headers
}
