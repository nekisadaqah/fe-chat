import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import type { Conversation } from '../types/conversation';
import type { Message } from '../types/message';
import { useChatHub } from '../signalr/useChatHub';
import { Send, Loader2, CheckCheck, Check } from 'lucide-react';
import { debugLogger } from '../api/debugLogger';

interface ActiveChatAreaProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserEmail: string;
  onlineUsers: Record<string, boolean>;
  onLastMessageUpdated: (conversationId: string, lastMessage: Message) => void;
}

export const ActiveChatArea: React.FC<ActiveChatAreaProps> = ({
  conversation,
  currentUserId,
  currentUserEmail,
  onlineUsers,
  onLastMessageUpdated
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  
  const { registerMessageListener, sendTyping, sendStopTyping, typingUsers } = useChatHub();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const peer = conversation?.otherUser;
  const isPeerOnline = peer ? (onlineUsers[peer.id] ?? peer.isOnline) : false;
  const isPeerTyping = peer
    ? (typingUsers[peer.username] || (peer.email ? typingUsers[peer.email.split('@')[0]] : false))
    : false;

  // Load message history
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/api/Conversations/${conversation.id}/messages`, {
          params: { page: 1, pageSize: 50 }
        });
        
        // PaginatedResponse shape contains .items
        const loadedMessages: Message[] = response.data.items || [];
        
        // Sort chronologically (oldest first)
        const sorted = [...loadedMessages].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setMessages(sorted);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load message history');
      } finally {
        setLoading(false);
      }
    };

    if (conversation?.id) {
      fetchMessages();
    }
  }, [conversation?.id]);

  // Listen for real-time messages from SignalR
  useEffect(() => {
    if (!conversation?.id) return;

    const unsubscribe = registerMessageListener((newMsg: Message) => {
      // Check if message belongs to this conversation
      if (newMsg.conversationId === conversation.id) {
        setMessages((prev) => {
          // Avoid duplicate messages using backend message ID
          if (prev.some((m) => m.id === newMsg.id)) {
            // Update the existing message if needed (e.g. read receipts)
            return prev.map((m) => m.id === newMsg.id ? newMsg : m);
          }
          return [...prev, newMsg];
        });
      }
    });

    return unsubscribe;
  }, [conversation?.id, registerMessageListener]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPeerTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing status to hub
    if (peer && !isTypingRef.current) {
      isTypingRef.current = true;
      const myUsername = currentUserEmail ? currentUserEmail.split('@')[0] : '';
      sendTyping(peer.id, myUsername);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      const myUsername = currentUserEmail ? currentUserEmail.split('@')[0] : '';
      if (peer) {
        sendStopTyping(peer.id, myUsername);
      }
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputValue.trim();
    
    // 1. Validate active conversation and content
    if (!conversation?.id) {
      setError('No active conversation selected');
      return;
    }
    if (!content) return;
    if (sending) return;

    try {
      setSending(true);
      setError(null);

      // Log: MESSAGE_SEND_STARTED
      debugLogger.addLog('API', 'OUT', 'MESSAGE_SEND_STARTED', {
        conversationId: conversation.id,
        currentUserId,
        content,
        timestamp: new Date().toISOString()
      });

      // Instantly stop typing indicator
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      isTypingRef.current = false;
      const myUsername = currentUserEmail ? currentUserEmail.split('@')[0] : '';
      if (peer) {
        sendStopTyping(peer.id, myUsername);
      }

      // POST message
      const response = await apiClient.post('/api/Messages', {
        content: content,
        conversationId: conversation.id
      });
      
      const sentMessage: Message = response.data;
      
      // Clear the input on success
      setInputValue('');

      // Deduplicate using message ID to prevent duplicate UI messages
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id)) {
          return prev.map((m) => m.id === sentMessage.id ? sentMessage : m);
        }
        return [...prev, sentMessage];
      });

      // Log: MESSAGE_SEND_SUCCESS
      debugLogger.addLog('API', 'IN', 'MESSAGE_SEND_SUCCESS', {
        conversationId: conversation.id,
        currentUserId,
        timestamp: new Date().toISOString(),
        status: response.status,
        response: sentMessage
      });

      onLastMessageUpdated(conversation.id, sentMessage);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to send message';
      setError(errMsg);

      // Log: MESSAGE_SEND_FAILED
      debugLogger.addLog('API', 'IN', 'MESSAGE_SEND_FAILED', {
        conversationId: conversation.id,
        currentUserId,
        timestamp: new Date().toISOString(),
        status: err.response?.status || 'NET_ERROR',
        errorResponse: err.response?.data || err.message
      });
    } finally {
      // ALWAYS reset sending state in finally to prevent UI freezing
      setSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* Chat Header */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderRadius: '12px 12px 0 0',
        borderBottom: '1px solid var(--border-glass)',
        flexShrink: 0
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '16px',
            color: '#fff'
          }}>
            {peer ? peer.email.charAt(0).toUpperCase() : '?'}
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
        
        {peer && (
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{peer.email.split('@')[0]}</div>
            <div style={{ fontSize: '12px', color: isPeerTyping ? 'var(--status-typing)' : 'var(--text-secondary)' }}>
              {isPeerTyping ? 'typing...' : isPeerOnline ? 'online' : 'offline'}
            </div>
          </div>
        )}
      </div>

      {/* Messages List Area */}
      <div 
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.1)'
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          </div>
        ) : error ? (
          <div style={{ color: 'var(--error)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px', fontSize: '13px' }}>
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div 
                key={msg.id} 
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: isMe ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    boxShadow: isMe ? 'var(--accent-glow)' : 'none',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '10px', 
                    color: 'var(--text-muted)', 
                    marginTop: '4px' 
                  }}>
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isMe && (
                      msg.readReceipts && msg.readReceipts.length > 0 ? (
                        <CheckCheck size={12} style={{ color: 'var(--accent-secondary)' }} />
                      ) : (
                        <Check size={12} />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Real-time Typing Bubble indicator */}
        {isPeerTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              padding: '10px 16px',
              borderRadius: '14px 14px 14px 2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.4s infinite both' }} />
              <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.4s infinite both' }} />
              <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.4s infinite both' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSend}
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          borderRadius: '0 0 12px 12px',
          flexShrink: 0
        }}
      >
        <input
          id="message-input"
          type="text"
          className="input-field"
          placeholder="Type your message..."
          value={inputValue}
          onChange={handleInputChange}
          style={{ height: '42px' }}
          disabled={sending}
        />
        <button 
          id="message-send-btn"
          type="submit" 
          className="btn-primary" 
          style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
          disabled={!inputValue.trim() || sending}
        >
          {sending ? (
            <Loader2 className="spin" size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
      
      <style>{`
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .dot {
          animation: blink 1.4s infinite both;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
};
