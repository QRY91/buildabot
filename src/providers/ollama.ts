import axios from "axios";
import { LLMProvider } from "./base";
import { ChatRequest, ChatResponse, Message, ToolDefinition } from "../types";
import { v4 as uuid } from "uuid";

export class OllamaProvider implements LLMProvider {
  private baseURL: string;
  private defaultModel: string;

  constructor(
    baseURL: string = "http://localhost:11434",
    defaultModel: string = "qwen2.5-coder:7b"
  ) {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.defaultModel = defaultModel;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. Prepare the request body for Ollama's /api/chat endpoint
    // 2. Convert messages and tools to Ollama's format (inline)
    const body = {
      model: request.model || this.defaultModel,
      messages: this.convertToOllamaMessages(request.messages),
      tools: request.tools,
      stream: false,
    };
    try {
      // 3. Make POST request to ${this.baseURL}/api/chat
      const response = await axios.post(`${this.baseURL}/api/chat`, body);

      // 4. Parse response and convert back to common format
      return this.parseOllamaResponse(response.data);
    } catch (error) {
      // 5. Handle errors appropriately
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Ollama API error: ${error.response?.data?.error || error.message}`
        );
      }
      throw error;
    }
  }

  private convertToOllamaMessages(messages: Message[]): any[] {
    return messages.map((msg) => {
      // Tool messages become user messages for Ollama
      if (msg.role === "tool") {
        return {
          role: "user",
          content: `Tool ${msg.name} (id: ${msg.tool_call_id}) returned: ${msg.content}`,
        };
      }

      // User and assistant messages pass through as-is
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }

  private parseOllamaResponse(response: any): ChatResponse {
    const message = response.message;

    // Check if the content looks like a tool call (JSON with name/arguments)
    let toolCalls = undefined;
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.name && parsed.arguments) {
        // This is a tool call
        toolCalls = [
          {
            id: `call_${uuid()}`, // Generate an ID
            type: "function" as const,
            function: {
              name: parsed.name,
              arguments: JSON.stringify(parsed.arguments),
            },
          },
        ];
      }
    } catch {
      // ignore the error
    }

    return {
      message: {
        role: "assistant",
        content: toolCalls ? "" : message.content,
        ...(toolCalls && { tool_calls: toolCalls }), // only add if exists
      },
      finish_reason: response.done ? "stop" : "length",
    };
  }
}
