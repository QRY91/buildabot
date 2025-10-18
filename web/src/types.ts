export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls?: string;
  metadata?: string;
  timestamp: number;
  duration_ms?: number;
  token_count?: number;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MessageMetadata {
  model?: string;
  temperature?: number;
  finish_reason?: string;
  tool_name?: string;
  tool_arguments?: string;
  error?: string;
  [key: string]: any;
}
