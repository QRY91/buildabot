import { LLMProvider, StreamChunk } from "./providers/base";
import { ToolRegistry } from "./tools/base";
import { Message, ToolMessage, UserMessage, ChatResponse } from "./types";
import { DatabaseManager } from "./db/manager";
import { EventEmitter } from "events";
import * as path from "path";

export interface AgentEvent {
  type: 'user_message' | 'assistant_message' | 'tool_call' | 'tool_result' | 'stream_chunk';
  data: any;
  conversationId?: string;
}

export class Agent {
  private provider: LLMProvider;
  private toolRegistry: ToolRegistry;
  private messages: Message[] = [];
  private maxIterations: number = 10;
  private db?: DatabaseManager | undefined;
  private eventEmitter?: EventEmitter | undefined;
  private currentConversationId?: string | undefined;
  private workingDirectory: string;

  constructor(
    provider: LLMProvider,
    toolRegistry: ToolRegistry,
    options?: {
      db?: DatabaseManager | undefined;
      eventEmitter?: EventEmitter | undefined;
      workingDirectory?: string | undefined;
    }
  ) {
    this.provider = provider;
    this.toolRegistry = toolRegistry;
    this.db = options?.db;
    this.eventEmitter = options?.eventEmitter;

    // Set working directory: use provided, or default based on SANDBOX_MODE
    if (options?.workingDirectory) {
      this.workingDirectory = path.resolve(options.workingDirectory);
    } else if (process.env.SANDBOX_MODE === "true") {
      this.workingDirectory = path.resolve(__dirname, "../sandbox");
    } else {
      this.workingDirectory = process.cwd();
    }
  }

  setConversationId(conversationId: string): void {
    this.currentConversationId = conversationId;
  }

  getConversationId(): string | undefined {
    return this.currentConversationId;
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  async run(userInput: string): Promise<string> {
    // Add user message to history
    const userMessage: UserMessage = {
      role: "user",
      content: userInput,
    };
    this.messages.push(userMessage);

    // Log to database
    if (this.db && this.currentConversationId) {
      await this.db.addMessage(this.currentConversationId, "user", userInput);
    }

    // Emit event
    this.emit('user_message', { content: userInput });

    // Agent loop
    for (let i = 0; i < this.maxIterations; i++) {
      const startTime = Date.now();

      // Call LLM with current conversation and available tools
      const response = await this.provider.chat({
        messages: this.messages,
        tools: this.toolRegistry.getDefinitions(),
      });

      const duration = Date.now() - startTime;

      // Add assistant's response to history
      this.messages.push(response.message);

      // Log to database
      if (this.db && this.currentConversationId) {
        await this.db.addMessage(
          this.currentConversationId,
          "assistant",
          response.message.content,
          {
            toolCalls: response.message.tool_calls || undefined,
            metadata: {
              finish_reason: response.finish_reason,
            },
            durationMs: duration,
          }
        );
      }

      // Emit event
      this.emit('assistant_message', {
        content: response.message.content,
        tool_calls: response.message.tool_calls,
        duration,
      });

      // Check if there are tool calls to execute
      if (
        !response.message.tool_calls ||
        response.message.tool_calls.length === 0
      ) {
        // No tool calls, return the final response
        return response.message.content;
      }

      // Execute all tool calls
      for (const toolCall of response.message.tool_calls) {
        const toolStartTime = Date.now();

        // Emit tool call event
        this.emit('tool_call', {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        });

        const result = await this.toolRegistry.execute(toolCall, {
          workingDirectory: this.workingDirectory,
        });
        const toolDuration = Date.now() - toolStartTime;

        // Add tool result to conversation
        const toolMessage: ToolMessage = {
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: result,
        };
        this.messages.push(toolMessage);

        // Log to database
        if (this.db && this.currentConversationId) {
          await this.db.addMessage(
            this.currentConversationId,
            "tool",
            result,
            {
              metadata: {
                tool_name: toolCall.function.name,
                tool_arguments: toolCall.function.arguments,
              },
              durationMs: toolDuration,
            }
          );
        }

        // Emit tool result event
        this.emit('tool_result', {
          name: toolCall.function.name,
          result,
          duration: toolDuration,
        });
      }

      // Loop continues - send tool results back to LLM
    }

    // Max iterations reached
    throw new Error(
      `Max iterations (${this.maxIterations}) reached without final response`
    );
  }

  async *runStream(userInput: string): AsyncGenerator<StreamChunk, string, unknown> {
    // Add user message to history
    const userMessage: UserMessage = {
      role: "user",
      content: userInput,
    };
    this.messages.push(userMessage);

    // Log to database
    if (this.db && this.currentConversationId) {
      await this.db.addMessage(this.currentConversationId, "user", userInput);
    }

    // Emit event
    this.emit('user_message', { content: userInput });

    // Agent loop
    for (let i = 0; i < this.maxIterations; i++) {
      const startTime = Date.now();

      // Check if provider supports streaming
      if (!this.provider.chatStream) {
        // Fall back to non-streaming
        const response = await this.provider.chat({
          messages: this.messages,
          tools: this.toolRegistry.getDefinitions(),
        });

        const duration = Date.now() - startTime;
        this.messages.push(response.message);

        // Log to database
        if (this.db && this.currentConversationId) {
          await this.db.addMessage(
            this.currentConversationId,
            "assistant",
            response.message.content,
            {
              toolCalls: response.message.tool_calls || undefined,
              metadata: { finish_reason: response.finish_reason },
              durationMs: duration,
            }
          );
        }

        this.emit('assistant_message', {
          content: response.message.content,
          tool_calls: response.message.tool_calls,
          duration,
        });

        if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
          return response.message.content;
        }

        // Execute tool calls (same as run method)
        for (const toolCall of response.message.tool_calls) {
          const toolStartTime = Date.now();
          this.emit('tool_call', {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          });

          const result = await this.toolRegistry.execute(toolCall, {
          workingDirectory: this.workingDirectory,
        });
          const toolDuration = Date.now() - toolStartTime;

          const toolMessage: ToolMessage = {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: result,
          };
          this.messages.push(toolMessage);

          if (this.db && this.currentConversationId) {
            await this.db.addMessage(
              this.currentConversationId,
              "tool",
              result,
              {
                metadata: {
                  tool_name: toolCall.function.name,
                  tool_arguments: toolCall.function.arguments,
                },
                durationMs: toolDuration,
              }
            );
          }

          this.emit('tool_result', {
            name: toolCall.function.name,
            result,
            duration: toolDuration,
          });
        }

        continue;
      }

      // Use streaming
      const stream = this.provider.chatStream({
        messages: this.messages,
        tools: this.toolRegistry.getDefinitions(),
      });

      let fullContent = '';
      let receivedToolCalls: any[] = [];

      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.content) {
          fullContent += chunk.content;
          yield chunk;
          this.emit('stream_chunk', { content: chunk.content });
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          receivedToolCalls.push(chunk.toolCall);
          yield chunk;
          this.emit('stream_chunk', { toolCall: chunk.toolCall });
        }
      }

      const duration = Date.now() - startTime;

      // Stream is exhausted, we need to construct the final response from what we collected
      const finalResponse: ChatResponse = {
        message: {
          role: 'assistant',
          content: receivedToolCalls.length > 0 ? '' : fullContent,
          ...(receivedToolCalls.length > 0 && { tool_calls: receivedToolCalls }),
        },
        finish_reason: 'stop',
      };

      this.messages.push(finalResponse.message);

      // Log to database
      if (this.db && this.currentConversationId) {
        await this.db.addMessage(
          this.currentConversationId,
          "assistant",
          finalResponse.message.content,
          {
            toolCalls: finalResponse.message.tool_calls || undefined,
            metadata: { finish_reason: finalResponse.finish_reason },
            durationMs: duration,
          }
        );
      }

      this.emit('assistant_message', {
        content: finalResponse.message.content,
        tool_calls: finalResponse.message.tool_calls,
        duration,
      });

      if (
        !finalResponse.message.tool_calls ||
        finalResponse.message.tool_calls.length === 0
      ) {
        return finalResponse.message.content;
      }

      // Execute tool calls
      for (const toolCall of finalResponse.message.tool_calls) {
        const toolStartTime = Date.now();
        this.emit('tool_call', {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        });

        const result = await this.toolRegistry.execute(toolCall, {
          workingDirectory: this.workingDirectory,
        });
        const toolDuration = Date.now() - toolStartTime;

        const toolMessage: ToolMessage = {
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: result,
        };
        this.messages.push(toolMessage);

        if (this.db && this.currentConversationId) {
          await this.db.addMessage(
            this.currentConversationId,
            "tool",
            result,
            {
              metadata: {
                tool_name: toolCall.function.name,
                tool_arguments: toolCall.function.arguments,
              },
              durationMs: toolDuration,
            }
          );
        }

        this.emit('tool_result', {
          name: toolCall.function.name,
          result,
          duration: toolDuration,
        });
      }
    }

    throw new Error(
      `Max iterations (${this.maxIterations}) reached without final response`
    );
  }

  private emit(type: AgentEvent['type'], data: any): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit('agent_event', {
        type,
        data,
        conversationId: this.currentConversationId,
      });
    }
  }

  clearHistory(): void {
    this.messages = [];
  }

  getHistory(): Message[] {
    return [...this.messages];
  }

  setSystemPrompt(prompt: string): void {
    // Add or update system message at the beginning
    // Note: Some providers handle this differently (e.g., Anthropic)
    const systemMessage = {
      role: "system" as const,
      content: prompt,
    };

    if (this.messages.length > 0 && this.messages[0]?.role === "system") {
      this.messages[0] = systemMessage;
    } else {
      this.messages.unshift(systemMessage);
    }
  }
}
