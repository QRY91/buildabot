import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../tools/base';
import type { Tool, ToolCall } from '../types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool', () => {
      const tool: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'test_tool',
            description: 'A test tool',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        },
        execute: async () => 'test result',
      };

      registry.register(tool);
      expect(registry.get('test_tool')).toBe(tool);
    });

    it('should overwrite existing tool with same name', () => {
      const tool1: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'duplicate',
            description: 'First version',
            parameters: { type: 'object', properties: {} },
          },
        },
        execute: async () => 'v1',
      };

      const tool2: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'duplicate',
            description: 'Second version',
            parameters: { type: 'object', properties: {} },
          },
        },
        execute: async () => 'v2',
      };

      registry.register(tool1);
      registry.register(tool2);

      expect(registry.get('duplicate')).toBe(tool2);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent tool', () => {
      expect(registry.get('non_existent')).toBeUndefined();
    });

    it('should return registered tool', () => {
      const tool: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'exists',
            description: 'Exists',
            parameters: { type: 'object', properties: {} },
          },
        },
        execute: async () => 'result',
      };

      registry.register(tool);
      expect(registry.get('exists')).toBe(tool);
    });
  });

  describe('getDefinitions', () => {
    it('should return empty array when no tools registered', () => {
      expect(registry.getDefinitions()).toEqual([]);
    });

    it('should return all tool definitions', () => {
      const tool1: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'tool1',
            description: 'First tool',
            parameters: { type: 'object', properties: {} },
          },
        },
        execute: async () => '1',
      };

      const tool2: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'tool2',
            description: 'Second tool',
            parameters: { type: 'object', properties: {} },
          },
        },
        execute: async () => '2',
      };

      registry.register(tool1);
      registry.register(tool2);

      const definitions = registry.getDefinitions();
      expect(definitions).toHaveLength(2);
      expect(definitions.map((d) => d.function.name)).toContain('tool1');
      expect(definitions.map((d) => d.function.name)).toContain('tool2');
    });
  });

  describe('execute', () => {
    it('should execute a tool with arguments', async () => {
      const tool: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'greet',
            description: 'Greet someone',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
              required: ['name'],
            },
          },
        },
        execute: async (args) => `Hello, ${args.name}!`,
      };

      registry.register(tool);

      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'greet',
          arguments: '{"name": "Alice"}',
        },
      };

      const result = await registry.execute(toolCall);
      expect(result).toBe('Hello, Alice!');
    });

    it('should return error for non-existent tool', async () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'non_existent',
          arguments: '{}',
        },
      };

      await expect(registry.execute(toolCall)).rejects.toThrow(
        'Tool not found: non_existent'
      );
    });

    it('should handle tool execution errors gracefully', async () => {
      const tool: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'fail',
            description: 'Fails on purpose',
            parameters: { type: 'object', properties: {} },
          },
        },
        execute: async () => {
          throw new Error('Tool failed!');
        },
      };

      registry.register(tool);

      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'fail',
          arguments: '{}',
        },
      };

      const result = await registry.execute(toolCall);
      expect(result).toContain('Error executing tool');
      expect(result).toContain('Tool failed!');
    });

    it('should handle invalid JSON arguments', async () => {
      const tool: Tool = {
        definition: {
          type: 'function',
          function: {
            name: 'test',
            description: 'Test',
            parameters: { type: 'object', properties: {} },
          },
        },
        execute: async () => 'success',
      };

      registry.register(tool);

      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'test',
          arguments: 'invalid json{',
        },
      };

      const result = await registry.execute(toolCall);
      expect(result).toContain('Error executing tool');
    });
  });
});
