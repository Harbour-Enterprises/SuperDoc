export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatContext {
  /** Preview text (first two words of selection) */
  preview: string;
  /** Full selected text */
  fullText: string;
}
