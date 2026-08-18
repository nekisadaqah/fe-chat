import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { AuthSession } from '../auth/authService';
import type { Conversation } from '../types/conversation';
import type { Message } from '../types/message';
import { useChatHub } from '../signalr/useChatHub';
import { CurrentUserPanel } from '../components/CurrentUserPanel';
import { UserSearch } from '../components/UserSearch';
import { ConversationList } from '../components/ConversationList';
import { ActiveChatArea } from '../components/ActiveChatArea';
import { DebugPanel } from '../components/DebugPanel';
import { Terminal, MessageSquare, X } from 'lucide-react';

interface ChatPageProps {
  session: AuthSession;
  onLogout: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ session, onLogout }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDebug, setShowDebug] = useState(true);

  const { connectionState, onlineUsers, registerMessageListener } = useChatHub();

  const fetchConversations = async () => {
    try {
      const response = await apiClient.get('/api/Conversations');
      setConversations(response.data || []);
    } catch (err) {
      console.error('Failed to load conversations list', err);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Listen globally to incoming messages to update lastMessage previews in the list
  useEffect(() => {
    const unsubscribe = registerMessageListener((msg: Message) => {
      setConversations((prevList) => {
        const index = prevList.findIndex((c) => c.id === msg.conversationId);
        
        if (index !== -1) {
          // Update existing conversation lastMessage preview
          const updatedList = [...prevList];
          const updatedConv = {
            ...updatedList[index],
            lastMessage: msg,
            lastMessageAt: msg.createdAt
          };
          updatedList.splice(index, 1); // Remove from old position
          return [updatedConv, ...updatedList]; // Move to top of list
        } else {
          // If conversation is not in the list, trigger a reload to fetch new conversation metadata
          fetchConversations();
          return prevList;
        }
      });
    });

    return unsubscribe;
  }, [registerMessageListener]);

  const handleLastMessageUpdated = (conversationId: string, lastMessage: Message) => {
    setConversations((prevList) => {
      const index = prevList.findIndex((c) => c.id === conversationId);
      if (index === -1) return prevList;
      
      const updatedList = [...prevList];
      const updatedConv = {
        ...updatedList[index],
        lastMessage: lastMessage,
        lastMessageAt: lastMessage.createdAt
      };
      updatedList.splice(index, 1);
      return [updatedConv, ...updatedList];
    });
  };

  const handleConversationSelected = (conv: Conversation) => {
    setSelectedConversation(conv);
    // Add to conversations list if not present, otherwise select it
    setConversations((prev) => {
      if (prev.some((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `340px 1fr ${showDebug ? '380px' : '0px'}`,
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      transition: 'grid-template-columns 0.3s ease'
    }}>
      {/* Left Sidebar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-glass)',
        background: 'var(--bg-sidebar)',
        height: '100%',
        minWidth: 0
      }}>
        <CurrentUserPanel
          session={session}
          connectionState={connectionState}
          onLogout={onLogout}
        />
        
        <UserSearch onConversationSelected={handleConversationSelected} />
        
        <ConversationList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onConversationSelected={setSelectedConversation}
          onlineUsers={onlineUsers}
        />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
        minWidth: 0
      }}>
        {/* Workspace Toolbar */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="btn-secondary"
            title="Toggle Debugger"
            style={{
              padding: '10px',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              background: showDebug ? 'rgba(139,92,246,0.15)' : 'rgba(17,24,39,0.7)',
              borderColor: showDebug ? 'var(--accent-primary)' : 'var(--border-glass)'
            }}
          >
            {showDebug ? <X size={18} /> : <Terminal size={18} />}
          </button>
        </div>

        {selectedConversation ? (
          <ActiveChatArea
            key={selectedConversation.id}
            conversation={selectedConversation}
            currentUserId={session.userId}
            currentUserEmail={session.userEmail}
            onlineUsers={onlineUsers}
            onLastMessageUpdated={handleLastMessageUpdated}
          />
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.3 }} />
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Welcome to the Chat Test Client
            </h2>
            <p style={{ maxWidth: '400px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
              To test the integration, search for another user in the sidebar to initialize a chat, or select an existing conversation.
            </p>
          </div>
        )}
      </div>

      {/* Right Collapsible Debug Panel */}
      {showDebug && (
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <DebugPanel
            session={session}
            selectedConversation={selectedConversation}
          />
        </div>
      )}
    </div>
  );
};
