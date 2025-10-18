import { useState, useEffect, useRef } from 'react';
import { Conversation } from '../types';
import { MessageBubble } from './MessageBubble';
import { sendMessage } from '../api';

interface ChatViewProps {
  conversation: Conversation | null;
  onMessageSent: () => void;
}

export function ChatView({ conversation, onMessageSent }: ChatViewProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversation || isLoading) return;

    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      await sendMessage(conversation.id, userInput);
      onMessageSent();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  if (!conversation) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        fontSize: '18px',
      }}>
        Select a conversation or create a new one
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#0f0f0f',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #333',
        backgroundColor: '#1e1e1e',
        color: '#fff',
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          {conversation.title}
        </h2>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        {conversation.messages?.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && (
          <div style={{
            padding: '12px',
            color: '#888',
            fontStyle: 'italic',
          }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #333',
        backgroundColor: '#1e1e1e',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: '#0f0f0f',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '8px',
              fontSize: '15px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: input.trim() && !isLoading ? '#2563eb' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '500',
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
