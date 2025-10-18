import { Message, ToolCall } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isAssistant = message.role === 'assistant';

  // Parse tool calls if present
  let toolCalls: ToolCall[] = [];
  if (message.tool_calls) {
    try {
      toolCalls = JSON.parse(message.tool_calls);
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Parse metadata if present
  let metadata: any = {};
  if (message.metadata) {
    try {
      metadata = JSON.parse(message.metadata);
    } catch (e) {
      // Ignore parse errors
    }
  }

  if (isTool) {
    return (
      <div style={{
        padding: '8px 16px',
        margin: '8px 0',
        fontStyle: 'italic',
        color: '#888',
        fontSize: '14px',
        borderLeft: '3px solid #6366f1',
        paddingLeft: '12px',
      }}>
        🔧 <strong>{metadata.tool_name || 'Tool'}:</strong> {message.content.substring(0, 100)}{message.content.length > 100 ? '...' : ''}
      </div>
    );
  }

  if (toolCalls.length > 0) {
    return (
      <div style={{
        padding: '8px 16px',
        margin: '8px 0',
        fontStyle: 'italic',
        color: '#888',
        fontSize: '14px',
      }}>
        {toolCalls.map((tc, idx) => (
          <div key={idx} style={{ marginBottom: '4px' }}>
            🔧 Calling <strong>{tc.function.name}</strong>...
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      margin: '16px 0',
    }}>
      <div style={{
        maxWidth: '70%',
        padding: '12px 16px',
        borderRadius: '12px',
        backgroundColor: isUser ? '#2563eb' : '#333',
        color: '#fff',
        fontSize: '15px',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
        {message.duration_ms && (
          <div style={{
            fontSize: '11px',
            color: '#888',
            marginTop: '8px',
            textAlign: 'right',
          }}>
            {(message.duration_ms / 1000).toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  );
}
