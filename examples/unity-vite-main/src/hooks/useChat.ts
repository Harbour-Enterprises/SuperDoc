import { useState, useCallback } from 'react';
import type { ChatMessage, ChatContext } from '../types/chat';

interface UseChatOptions {
  /** API endpoint for sending messages */
  apiEndpoint?: string;
  /** Initial messages */
  initialMessages?: ChatMessage[];
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Document section context */
  documentSection?: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (content: string, context?: ChatContext) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Hook for managing chat messages and API calls
 * Calls the backend superdoc chat API
 */
export const useChat = ({
  apiEndpoint,
  initialMessages = [],
  maxTokens = 4096,
  documentSection = '',
}: UseChatOptions = {}): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (content: string, context?: ChatContext) => {
      // If context is provided, prepend it to the user's message
      let finalContent = content;
      if (context) {
        finalContent = `Context from document:\n---\n${context.fullText}\n---\n\nQuestion: ${content}`;
      }

      // Add user message (display original content to user)
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      // Store current messages including the new user message for API call
      let currentMessages: ChatMessage[] = [];
      setMessages((prev) => {
        currentMessages = [...prev, userMessage];
        return currentMessages;
      });

      setIsStreaming(true);

      try {
        if (apiEndpoint) {
          // Convert chat history to backend API format
          // Use the enhanced message with context for the API call
          const apiMessages = currentMessages.slice(0, -1).map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          // Add the current message with context
          apiMessages.push({
            role: 'user',
            content: finalContent,
          });

          // Make API call to backend superdoc chat endpoint
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: apiMessages,
              document_section: documentSection,
              stream: false,
              max_tokens: maxTokens,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `API request failed: ${response.status} ${response.statusText}`,
            );
          }

          const data = await response.json();

          // Extract response content from backend API format
          // The backend returns: { completion: { role: string, content: string } }
          let responseContent = 'Sorry, I could not process your request.';

          if (data.completion?.content) {
            // Content is now a simple string
            responseContent = data.completion.content;
          }

          // Add assistant response
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error) {
        console.error('Error sending message:', error);

        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : 'Sorry, there was an error processing your message. Please try again.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
      }
    },
    [apiEndpoint, maxTokens, documentSection],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
  };
};
