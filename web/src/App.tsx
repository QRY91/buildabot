import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { GraphView } from './components/GraphView';
import { Conversation } from './types';
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

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
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

  const handleNewConversation = async () => {
    const title = prompt('Enter conversation title:');
    if (!title) return;

    try {
      const newConv = await createConversation(title);
      setConversations((prev) => [newConv, ...prev]);
      handleSelectConversation(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to create conversation');
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const conv = await fetchConversation(id);
      setCurrentConversation(conv);
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

  const handleMessageSent = () => {
    // Reload the current conversation to get the new messages
    if (currentConversation) {
      handleSelectConversation(currentConversation.id);
      loadConversations(); // Update the sidebar timestamps
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
