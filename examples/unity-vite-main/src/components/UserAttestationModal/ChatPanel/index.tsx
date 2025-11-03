import {
  ChatBubble,
  ChatBubbleRow,
  Typography,
  ChatInput,
  Button,
  Icon,
} from '@abbvie-unity/react';
import { useRef, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ChatMessage, ChatContext } from '../../types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPanelProps {
  /** Array of chat messages */
  messages: ChatMessage[];
  /** Callback when user sends a message */
  onSendMessage: (message: string, context?: ChatContext) => void;
  /** Whether the assistant is currently typing/streaming */
  isStreaming?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether to show the input */
  showInput?: boolean;
  /** Context from highlighted text */
  context?: ChatContext | null;
  /** Callback to clear context */
  onClearContext?: () => void;
}

export const ChatPanel = ({
  messages,
  onSendMessage,
  isStreaming = false,
  placeholder = 'Type your message here...',
  showInput = true,
  context = null,
  onClearContext,
}: ChatPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Auto-scroll to bottom when new messages arrive (only within messages container)
  useEffect(() => {
    if (
      messagesEndRef.current &&
      messagesContainerRef.current &&
      messages.length > 0
    ) {
      // Scroll within the messages container only, not the entire page
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (inputValue?.trim() && !isStreaming) {
      onSendMessage(inputValue.trim(), context || undefined);
      setInputValue(''); // Clear the input
      // Clear context after sending
      if (onClearContext) {
        onClearContext();
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Messages area */}
      <div
        className="flex min-h-0 flex-col overflow-x-hidden overflow-y-auto px-4 py-4"
        style={{ flex: '1 1 auto' }}
        ref={messagesContainerRef}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-300"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Typography className="text-center text-sm text-gray-500">
              Start a conversation
            </Typography>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatBubbleRow
                key={message.id}
                className="animate-[fadeIn_0.3s_ease-in-out]"
              >
                <ChatBubble variant={message.role}>
                  <Typography className="prose prose-sm max-w-none leading-relaxed break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </Typography>
                </ChatBubble>
              </ChatBubbleRow>
            ))}
            {isStreaming && (
              <ChatBubbleRow className="animate-[fadeIn_0.3s_ease-in-out]">
                <ChatBubble variant="assistant">
                  <div className="flex gap-1.5 py-2">
                    <span
                      className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out_both] rounded-full bg-gray-400"
                      style={{ animationDelay: '-0.32s' }}
                    />
                    <span
                      className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out_both] rounded-full bg-gray-400"
                      style={{ animationDelay: '-0.16s' }}
                    />
                    <span className="h-2 w-2 animate-[bounce_1.4s_infinite_ease-in-out_both] rounded-full bg-gray-400" />
                  </div>
                </ChatBubble>
              </ChatBubbleRow>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Context area - positioned above input without affecting layout */}
      {showInput && context && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="rounded-medium flex items-center gap-2 border border-gray-300 bg-white px-3 py-1">
              <span className="text-[11px] text-gray-600">
                {context.preview}...
              </span>
              <button
                type="button"
                onClick={onClearContext}
                className="flex h-3 w-3 items-center justify-center"
                aria-label="Clear context"
              >
                <Icon icon="close" style={{ fontSize: '10px' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      {showInput && (
        <div className="px-4 pb-4" style={{ flex: '0 0 auto' }}>
          <form onSubmit={handleSubmit}>
            <ChatInput
              bottom={
                <div
                  style={{
                    alignItems: 'center',
                    direction: 'rtl',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button
                    aria-label="Submit"
                    shape="circle"
                    size="small"
                    type="submit"
                    variant="primary"
                    disabled={isStreaming}
                  >
                    <Icon icon="send" />
                  </Button>
                  <Button
                    aria-label="Attach file"
                    shape="circle"
                    size="small"
                    variant="tertiary"
                    disabled={isStreaming}
                  >
                    <Icon icon="paperclip" />
                  </Button>
                </div>
              }
              maxRows={8}
              name="message"
              placeholder={placeholder}
              rows={1}
              disabled={isStreaming}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </form>
        </div>
      )}
    </div>
  );
};
