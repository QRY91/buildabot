import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { GraphView } from './components/GraphView';
import type { Conversation } from './types';
import {
  fetchConversations,
  createConversation,
  fetchConversation,
  deleteConversation,
} from './api';

function App() {
  const [viewMode, setViewMode] = useState<'chat' | 'graph'>(() => {
    return (localStorage.getItem('viewMode') as 'chat' | 'graph') || 'chat';
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraft, setIsDraft] = useState(false); // Track if current conversation is a draft

  // Load conversations on mount and start in draft mode
  useEffect(() => {
    loadConversations();
    // Start with a draft conversation
    setIsDraft(true);
  }, []);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const loadConversations = async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    // Don't create in DB, just switch to draft mode
    setCurrentConversation(null);
    setIsDraft(true);
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const conv = await fetchConversation(id);
      setCurrentConversation(conv);
      setIsDraft(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      alert('Failed to load conversation');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const handleMessageSent = async (conversationId?: string) => {
    // If a conversation ID was returned (draft was created), update state
    if (conversationId && isDraft) {
      setIsDraft(false);
      await handleSelectConversation(conversationId);
      await loadConversations();
    } else if (currentConversation) {
      // Reload the current conversation to get the new messages
      await handleSelectConversation(currentConversation.id);
      await loadConversations(); // Update the sidebar timestamps
    }
  };

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f0f',
        color: '#fff',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0f0f0f',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        {viewMode === 'chat' ? (
          <ChatView
            conversation={currentConversation}
            isDraft={isDraft}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <GraphView conversation={currentConversation} />
        )}
      </div>
    </div>
  );
}

export default App
