import { describe, it, expect } from 'vitest';
import type {
  UserMessage,
  AssistantMessage,
  ToolMessage,
  SystemMessage,
  ToolCall,
  ToolDefinition,
} from '../types';

describe('Type Definitions', () => {
  describe('Messages', () => {
    it('should create a valid UserMessage', () => {
      const message: UserMessage = {
        role: 'user',
        content: 'Hello, bot!',
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, bot!');
    });

    it('should create a valid AssistantMessage without tools', () => {
      const message: AssistantMessage = {
        role: 'assistant',
        content: 'Hello, human!',
      };

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Hello, human!');
      expect(message.tool_calls).toBeUndefined();
    });

    it('should create a valid AssistantMessage with tool calls', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        type: 'function',
        function: {
          name: 'test_function',
          arguments: '{"arg": "value"}',
        },
      };

      const message: AssistantMessage = {
        role: 'assistant',
        content: '',
        tool_calls: [toolCall],
      };

      expect(message.tool_calls).toHaveLength(1);
      expect(message.tool_calls?.[0]?.function.name).toBe('test_function');
    });

    it('should create a valid ToolMessage', () => {
      const message: ToolMessage = {
        role: 'tool',
        tool_call_id: 'call_123',
        name: 'test_function',
        content: 'Tool result',
      };

      expect(message.role).toBe('tool');
      expect(message.tool_call_id).toBe('call_123');
      expect(message.name).toBe('test_function');
    });

    it('should create a valid SystemMessage', () => {
      const message: SystemMessage = {
        role: 'system',
        content: 'You are a helpful assistant',
      };

      expect(message.role).toBe('system');
      expect(message.content).toBe('You are a helpful assistant');
    });
  });

  describe('Tool Definitions', () => {
    it('should create a valid ToolDefinition', () => {
      const tool: ToolDefinition = {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city name',
              },
            },
            required: ['location'],
          },
        },
      };

      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('get_weather');
      expect(tool.function.parameters.required).toContain('location');
    });
  });
});
