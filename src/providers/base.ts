import { ChatRequest, ChatResponse } from '../types';

export interface LLMProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  // chatStream?(request: ChatRequest): AsyncGenerator<string>;
}
