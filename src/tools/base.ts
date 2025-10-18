import { ToolDefinition, ToolCall } from "../types";

export interface ToolContext {
  workingDirectory: string;
}

export interface Tool {
  definition: ToolDefinition;
  execute: (args: Record<string, any>, context: ToolContext) => Promise<string>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.definition.function.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  async execute(toolCall: ToolCall, context: ToolContext): Promise<string> {
    const tool = this.get(toolCall.function.name);
    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.function.name}`);
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      return await tool.execute(args, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error executing tool: ${message}`;
    }
  }
}
