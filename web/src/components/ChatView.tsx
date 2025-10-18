import { useState, useEffect, useRef } from 'react';
import type { Conversation } from '../types';
import { MessageBubble } from './MessageBubble';
import { sendMessage, createConversation } from '../api';

interface ChatViewProps {
  conversation: Conversation | null;
  isDraft: boolean;
  onMessageSent: (conversationId?: string) => void;
}

export function ChatView({ conversation, isDraft, onMessageSent }: ChatViewProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change or pending message is set
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, pendingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    setInput('');
    setPendingMessage(userInput); // Show message immediately
    setIsLoading(true);

    try {
      let conversationId: string;

      // If this is a draft, create the conversation first
      if (isDraft) {
        const title = userInput.length > 50 ? userInput.substring(0, 50) + '...' : userInput;
        const newConv = await createConversation(title);
        conversationId = newConv.id;
      } else if (conversation) {
        conversationId = conversation.id;
      } else {
        throw new Error('No conversation selected');
      }

      await sendMessage(conversationId, userInput);
      setPendingMessage(null); // Clear pending message once sent
      onMessageSent(isDraft ? conversationId : undefined);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
      setPendingMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Show draft mode UI when no conversation is loaded
  const showDraftUI = !conversation || isDraft;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
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
          {showDraftUI ? 'New Chat' : conversation?.title}
        </h2>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        {!showDraftUI && conversation?.messages?.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {showDraftUI && !pendingMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666',
            fontSize: '16px',
          }}>
            Start a new conversation...
          </div>
        )}
        {pendingMessage && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            margin: '16px 0',
          }}>
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontSize: '15px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {pendingMessage}
            </div>
          </div>
        )}
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
