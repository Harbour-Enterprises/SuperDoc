import { useMemo, useState, useCallback } from 'react';
import { ResizableChatPanel } from '../ResizableChatPanel';
import { ChatPanel } from '../ChatPanel';
import { useChat } from '../../../hooks/useChat';
import type { ChatContext } from '../../../types/chat';
import FaddockSuperdocWrapper from '../../../pages/PageOne/FaddockSuperdocWrapper';

interface EditorWithChatProps {
  initialContent?: string;
  documentId?: string;
}

/**
 * Reusable component that combines the Faddock Superdoc editor with a chat panel.
 * Used for editing protocol sections with AI assistance.
 */
export const EditorWithChat = ({
  initialContent,
  documentId = 'demo-doc',
}: EditorWithChatProps) => {
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);

  const handleAddToChat = useCallback((selectedText: string, documentText: string) => {
    if (selectedText.trim()) {
      // Extract first two words for preview
      const words = selectedText.trim().split(/\s+/);
      const preview = words.slice(0, 2).join(' ');

      setChatContext({
        preview: preview,
        fullText: selectedText,
      });
      console.log('AddToChat received - Selected:', selectedText);
      console.log('AddToChat received - Document:', documentText);
    }
  }, []);

  const handleClearContext = useCallback(() => {
    setChatContext(null);
  }, []);

  // Initialize chat with backend API
  const { messages, isStreaming, sendMessage } = useChat({
    apiEndpoint: `${import.meta.env.VITE_BACKEND_API_URL}/api/v1/superdoc/chat`,
  });

  // Memoize the documents array to prevent FaddockSuperdocWrapper from re-rendering
  const documents = useMemo(
    () => [
      {
        id: documentId,
        type: 'docx',
        data: initialContent || null,
      },
    ],
    [documentId, initialContent],
  );

  // Memoize the chat panel to prevent unnecessary re-renders of the superdoc editor
  const chatPanel = useMemo(
    () => (
      <ChatPanel
        messages={messages}
        onSendMessage={sendMessage}
        isStreaming={isStreaming}
        placeholder="Ask agent.."
        context={chatContext}
        onClearContext={handleClearContext}
      />
    ),
    [messages, isStreaming, sendMessage, chatContext, handleClearContext],
  );

  return (
    <div className="flex h-full w-full">
      <ResizableChatPanel
        defaultChatWidth={450}
        minChatWidth={300}
        maxChatWidthPercent={50}
        defaultCollapsed={false}
        chatPanel={chatPanel}
      >
        <FaddockSuperdocWrapper
          onAddToChat={handleAddToChat}
          documents={documents}
        />
      </ResizableChatPanel>
    </div>
  );
};
