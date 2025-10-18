import { ChatRequest, ChatResponse } from '../types';

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'done';
  content?: string;
  toolCall?: any;
  finishReason?: string;
}

export interface LLMProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream?(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse, unknown>;
}
