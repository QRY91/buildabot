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
      // Tool messages become tool role messages for Ollama
      if (msg.role === "tool") {
        return {
          role: "tool",
          content: msg.content,
        };
      }

      // Assistant messages with tool_calls need to include them
      if (msg.role === "assistant" && "tool_calls" in msg && msg.tool_calls) {
        return {
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.tool_calls.map((tc) => ({
            function: {
              name: tc.function.name,
              // Parse arguments back to object for Ollama
              arguments: typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments,
            },
          })),
        };
      }

      // Other messages pass through as-is
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }

  private parseOllamaResponse(response: any): ChatResponse {
    const message = response.message;

    // Check if Ollama returned native tool_calls
    let toolCalls = undefined;
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      // Map Ollama's tool_calls to our expected format
      toolCalls = message.tool_calls.map((tc: any) => ({
        id: `call_${uuid()}`, // Generate an ID for each call
        type: "function" as const,
        function: {
          name: tc.function.name,
          // Convert arguments from object to JSON string
          arguments: typeof tc.function.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
        },
      }));
    } else if (message.content && message.content.includes('{')) {
      // Fallback: Some models (like qwen2.5-coder) return JSON in content
      // instead of using the tool_calls array. Try to extract it.
      try {
        // Find the start of the JSON object
        const startIdx = message.content.indexOf('{');
        if (startIdx !== -1) {
          // Try to find the matching closing brace by parsing
          let parsed = null;
          let endIdx = startIdx + 1;

          // Incrementally try to parse until we get valid JSON
          while (endIdx <= message.content.length && !parsed) {
            try {
              const jsonStr = message.content.substring(startIdx, endIdx);
              const candidate = JSON.parse(jsonStr);
              if (candidate.name && candidate.arguments) {
                parsed = candidate;
                break;
              }
            } catch {
              // Not valid yet, keep going
            }
            endIdx++;
          }

          if (parsed) {
            // This looks like a tool call
            toolCalls = [
              {
                id: `call_${uuid()}`,
                type: "function" as const,
                function: {
                  name: parsed.name,
                  arguments: typeof parsed.arguments === 'string'
                    ? parsed.arguments
                    : JSON.stringify(parsed.arguments),
                },
              },
            ];
          }
        }
      } catch (e) {
        // Not valid JSON or not a tool call, treat as normal content
      }
    }

    return {
      message: {
        role: "assistant",
        content: toolCalls ? "" : (message.content || ""),
        ...(toolCalls && { tool_calls: toolCalls }), // only add if exists
      },
      finish_reason: response.done ? "stop" : "length",
    };
  }
}
