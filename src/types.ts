// Basic message structure
interface BaseMessage {
  role: string;
  content: string;
}

interface UserMessage extends BaseMessage {
  role: "user";
}

interface AssistantMessage extends BaseMessage {
  role: "assistant";
  tool_calls?: ToolCall[];
}

interface ToolMessage extends BaseMessage {
  role: "tool";
  tool_call_id: string;
  name: string;
}

type Message = UserMessage | AssistantMessage | ToolMessage;

// Tools
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// Providers
interface ChatRequest {
  messages: Message[];
  tools?: ToolDefinition[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  message: AssistantMessage;
  finish_reason: string;
}

interface ProviderConfig {
  provider: "ollama" | "openai" | "anthropic";
  model?: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
}

export type {
  BaseMessage,
  UserMessage,
  AssistantMessage,
  ToolMessage,
  Message,
  ToolCall,
  ToolDefinition,
  ChatRequest,
  ChatResponse,
  ProviderConfig,
};
