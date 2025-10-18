import { LLMProvider } from './providers/base';
import { ToolRegistry } from './tools/base';
import { Message, UserMessage, AssistantMessage, ToolMessage, ToolCall } from './types';

export class Agent {
  private provider: LLMProvider;
  private toolRegistry: ToolRegistry;
  private messages: Message[] = [];
  private maxIterations: number = 10;

  constructor(provider: LLMProvider, toolRegistry: ToolRegistry) {
    this.provider = provider;
    this.toolRegistry = toolRegistry;
  }

  async run(userInput: string): Promise<string> {
    // Add user message to history
    const userMessage: UserMessage = {
      role: 'user',
      content: userInput
    };
    this.messages.push(userMessage);

    // Agent loop
    for (let i = 0; i < this.maxIterations; i++) {
      // Call LLM with current conversation and available tools
      const response = await this.provider.chat({
        messages: this.messages,
        tools: this.toolRegistry.getDefinitions()
      });

      // Add assistant's response to history
      this.messages.push(response.message);

      // Check if there are tool calls to execute
      if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
        // No tool calls, return the final response
        return response.message.content;
      }

      // Execute all tool calls
      for (const toolCall of response.message.tool_calls) {
        const result = await this.toolRegistry.execute(toolCall);

        // Add tool result to conversation
        const toolMessage: ToolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: result
        };
        this.messages.push(toolMessage);
      }

      // Loop continues - send tool results back to LLM
    }

    // Max iterations reached
    throw new Error(`Max iterations (${this.maxIterations}) reached without final response`);
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
      role: 'system' as const,
      content: prompt
    };

    if (this.messages.length > 0 && this.messages[0].role === 'system') {
      this.messages[0] = systemMessage;
    } else {
      this.messages.unshift(systemMessage);
    }
  }
}