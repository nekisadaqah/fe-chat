import React from 'react';
import type { Conversation } from '../types/conversation';
import { MessageSquare, Clock } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onConversationSelected: (conversation: Conversation) => void;
  onlineUsers: Record<string, boolean>;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversation,
  onConversationSelected,
  onlineUsers
}) => {
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
      <h3 style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        padding: '0 8px 8px 8px'
      }}>
        Active Chats
      </h3>

      {conversations.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}>
          <MessageSquare size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
          <div>No active conversations. Use search to start a chat.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {conversations.map((conv) => {
            const isSelected = selectedConversation?.id === conv.id;
            const peer = conv.otherUser;
            // Respect real-time online status updates from SignalR Hub
            const isPeerOnline = onlineUsers[peer.id] ?? peer.isOnline;

            return (
              <button
                key={conv.id}
                onClick={() => onConversationSelected(conv)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  gap: '12px',
                  outline: 'none',
                  borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent'
                }}
                className="conv-item"
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#fff'
                  }}>
                    {peer.email.charAt(0).toUpperCase()}
                  </div>
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isPeerOnline ? 'var(--status-online)' : 'var(--status-offline)',
                    border: '2px solid var(--bg-main)'
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {peer.email.split('@')[0]}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Clock size={10} />
                      {formatTime(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {conv.lastMessage ? conv.lastMessage.content : 'No messages yet'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      <style>{`
        .conv-item:hover {
          background: ${selectedConversation ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
        }
      `}</style>
    </div>
  );
};
