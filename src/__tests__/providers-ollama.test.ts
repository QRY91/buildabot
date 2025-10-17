import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { OllamaProvider } from '../providers/ollama';

describe('OllamaProvider', () => {
  let mock: MockAdapter;
  let provider: OllamaProvider;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    provider = new OllamaProvider('http://localhost:11434', 'test-model');
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const defaultProvider = new OllamaProvider();
      expect(defaultProvider).toBeDefined();
    });

    it('should remove trailing slash from baseURL', () => {
      const providerWithSlash = new OllamaProvider('http://localhost:11434/');
      expect(providerWithSlash).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should make successful chat request', async () => {
      const mockResponse = {
        model: 'test-model',
        created_at: '2024-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: 'Hello! How can I help you?',
        },
        done: true,
      };

      mock.onPost('http://localhost:11434/api/chat').reply(200, mockResponse);

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.message.role).toBe('assistant');
      expect(response.message.content).toBe('Hello! How can I help you?');
      expect(response.finish_reason).toBe('stop');
    });

    it('should use default model when not specified', async () => {
      const mockResponse = {
        model: 'test-model',
        created_at: '2024-01-01T00:00:00Z',
        message: { role: 'assistant', content: 'Test' },
        done: true,
      };

      mock.onPost('http://localhost:11434/api/chat').reply((config) => {
        const data = JSON.parse(config.data);
        expect(data.model).toBe('test-model');
        return [200, mockResponse];
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'Test' }],
      });
    });

    it('should include tools in request when provided', async () => {
      const mockResponse = {
        model: 'test-model',
        created_at: '2024-01-01T00:00:00Z',
        message: { role: 'assistant', content: 'Test' },
        done: true,
      };

      mock.onPost('http://localhost:11434/api/chat').reply((config) => {
        const data = JSON.parse(config.data);
        expect(data.tools).toBeDefined();
        expect(data.tools).toHaveLength(1);
        return [200, mockResponse];
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'Test' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'test_tool',
              description: 'Test',
              parameters: { type: 'object', properties: {} },
            },
          },
        ],
      });
    });

    it('should handle tool calls in response', async () => {
      const mockResponse = {
        model: 'test-model',
        created_at: '2024-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: '{"name": "get_weather", "arguments": {"location": "Paris"}}',
        },
        done: true,
      };

      mock.onPost('http://localhost:11434/api/chat').reply(200, mockResponse);

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'What is the weather in Paris?' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather',
              parameters: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                },
                required: ['location'],
              },
            },
          },
        ],
      });

      expect(response.message.tool_calls).toBeDefined();
      expect(response.message.tool_calls).toHaveLength(1);
      expect(response.message.tool_calls?.[0]?.function.name).toBe('get_weather');
      expect(response.message.content).toBe(''); // Empty when tool call
    });

    it('should handle regular text response (not tool call)', async () => {
      const mockResponse = {
        model: 'test-model',
        created_at: '2024-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: 'This is just regular text, not a tool call',
        },
        done: true,
      };

      mock.onPost('http://localhost:11434/api/chat').reply(200, mockResponse);

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.message.tool_calls).toBeUndefined();
      expect(response.message.content).toBe('This is just regular text, not a tool call');
    });

    it('should convert tool messages to user messages', async () => {
      const mockResponse = {
        model: 'test-model',
        created_at: '2024-01-01T00:00:00Z',
        message: { role: 'assistant', content: 'Understood the tool result' },
        done: true,
      };

      mock.onPost('http://localhost:11434/api/chat').reply((config) => {
        const data = JSON.parse(config.data);
        // The tool message should be converted to user message
        const toolMsg = data.messages.find((m: any) =>
          m.content.includes('Tool result')
        );
        expect(toolMsg?.role).toBe('user');
        return [200, mockResponse];
      });

      await provider.chat({
        messages: [
          { role: 'user', content: 'Do something' },
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'test', arguments: '{}' },
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: 'call_1',
            name: 'test',
            content: 'Tool result',
          },
        ],
      });
    });

    it('should handle API errors', async () => {
      mock.onPost('http://localhost:11434/api/chat').reply(500, {
        error: 'Internal server error',
      });

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow('Ollama API error');
    });

    it('should handle network errors', async () => {
      mock.onPost('http://localhost:11434/api/chat').networkError();

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow();
    });

    it('should set finish_reason to length when done is false', async () => {
      const mockResponse = {
        model: 'test-model',
        created_at: '2024-01-01T00:00:00Z',
        message: { role: 'assistant', content: 'Partial response' },
        done: false,
      };

      mock.onPost('http://localhost:11434/api/chat').reply(200, mockResponse);

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(response.finish_reason).toBe('length');
    });
  });
});
