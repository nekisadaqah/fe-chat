import React, { useState, useEffect } from 'react';
import type { DebugLog } from '../api/debugLogger';
import { debugLogger } from '../api/debugLogger';
import { useChatHub } from '../signalr/useChatHub';
import type { AuthSession } from '../auth/authService';
import type { Conversation } from '../types/conversation';
import { Terminal, Trash2, ChevronDown, ChevronRight, Shield, Radio, MessageSquare, Send } from 'lucide-react';

interface DebugPanelProps {
  session: AuthSession;
  selectedConversation: Conversation | null;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ session, selectedConversation }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const {
    connectionState,
    hubUrl,
    connectionId,
    lastConnectedTime,
    lastReconnectTime,
    lastDisconnectTime,
    lastSignalRError
  } = useChatHub();

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return unsubscribe;
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  // Find the last message send request in the log stream
  const lastSendLog = logs.find(log => 
    log.name === 'MESSAGE_SEND_STARTED' || 
    log.name === 'MESSAGE_SEND_SUCCESS' || 
    log.name === 'MESSAGE_SEND_FAILED'
  );

  const getSignalRStateColor = () => {
    switch (connectionState) {
      case 'CONNECTED': return 'var(--status-online)';
      case 'CONNECTING':
      case 'RECONNECTING': return 'var(--status-typing)';
      default: return 'var(--status-offline)';
    }
  };

  const getDirectionBadge = (dir: 'IN' | 'OUT' | 'EVENT') => {
    let bg = 'rgba(255, 255, 255, 0.1)';
    let color = 'var(--text-primary)';
    
    if (dir === 'IN') {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = 'var(--status-online)';
    } else if (dir === 'OUT') {
      bg = 'rgba(139, 92, 246, 0.15)';
      color = 'var(--accent-primary)';
    } else if (dir === 'EVENT') {
      bg = 'rgba(6, 182, 212, 0.15)';
      color = 'var(--accent-secondary)';
    }
    
    return (
      <span style={{
        padding: '2px 6px',
        borderRadius: '4px',
        background: bg,
        color: color,
        fontSize: '10px',
        fontWeight: 600
      }}>
        {dir}
      </span>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid var(--border-glass)',
      background: 'rgba(17, 24, 39, 0.8)',
      minWidth: 0,
      userSelect: 'text'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} style={{ color: 'var(--accent-secondary)' }} />
          <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Developer debug</h2>
        </div>
        <button 
          onClick={() => debugLogger.clear()} 
          className="btn-secondary" 
          style={{ padding: '6px', borderRadius: '4px' }}
          title="Clear logs"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Panels container */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px' 
      }}>
        
        {/* AUTH SECTION */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auth Session</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span style={{ color: 'var(--status-online)', fontWeight: 600 }}>Authenticated</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>User ID:</span>
              <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                {session?.userId}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <span style={{ color: 'var(--text-primary)' }}>{session?.userEmail}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Username:</span>
              <span style={{ color: 'var(--text-primary)' }}>{session?.userEmail?.split('@')[0]}</span>
            </div>
          </div>
        </div>

        {/* SIGNALR SECTION */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            <Radio size={14} style={{ color: 'var(--accent-secondary)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SignalR Connection</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>State:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getSignalRStateColor() }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{connectionState}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Connection ID:</span>
              <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                {connectionId || 'None'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hub URL:</span>
              <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', wordBreak: 'break-all', fontSize: '10px', color: 'var(--text-muted)' }}>
                {hubUrl || 'None'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Connected at:</span>
              <span style={{ color: 'var(--text-primary)' }}>{lastConnectedTime ? new Date(lastConnectedTime).toLocaleTimeString() : 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Reconnect:</span>
              <span style={{ color: 'var(--text-primary)' }}>{lastReconnectTime ? new Date(lastReconnectTime).toLocaleTimeString() : 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Disconnect:</span>
              <span style={{ color: 'var(--text-primary)' }}>{lastDisconnectTime ? new Date(lastDisconnectTime).toLocaleTimeString() : 'N/A'}</span>
            </div>
            {lastSignalRError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--error)' }}>
                <span>Last Error:</span>
                <span style={{ background: 'rgba(239,68,68,0.1)', padding: '4px', borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                  {lastSignalRError}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CHAT PANEL */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            <MessageSquare size={14} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Chat context</span>
          </div>
          {selectedConversation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Conversation ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                  {selectedConversation.id}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current User ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', wordBreak: 'break-all', color: 'var(--text-muted)' }}>
                  {session?.userId}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Other User ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                  {selectedConversation.otherUser?.id}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Other User Email:</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedConversation.otherUser?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Other User Status:</span>
                <span style={{ color: selectedConversation.otherUser?.isOnline ? 'var(--status-online)' : 'var(--text-muted)' }}>
                  {selectedConversation.otherUser?.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No conversation selected</span>
          )}
        </div>

        {/* LAST MESSAGE REQUEST */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            <Send size={14} style={{ color: 'var(--accent-secondary)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Message Request</span>
          </div>
          {lastSendLog ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Event name:</span>
                <span style={{ 
                  fontWeight: 600, 
                  color: lastSendLog.name === 'MESSAGE_SEND_SUCCESS' ? 'var(--status-online)' : 
                         lastSendLog.name === 'MESSAGE_SEND_FAILED' ? 'var(--error)' : 'var(--accent-secondary)'
                }}>{lastSendLog.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Method:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>POST</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>URL:</span>
                <span style={{ color: 'var(--text-primary)' }}>/api/Messages</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>HTTP Status:</span>
                <span style={{ color: lastSendLog.details?.status === 200 ? 'var(--status-online)' : 'var(--text-primary)' }}>
                  {lastSendLog.details?.status || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Conversation ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', wordBreak: 'break-all' }}>
                  {lastSendLog.details?.conversationId}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Content:</span>
                <span style={{ background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', fontStyle: 'italic' }}>
                  {lastSendLog.details?.content || lastSendLog.details?.response?.content || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Logged Time:</span>
                <span>{new Date(lastSendLog.timestamp).toLocaleTimeString()}</span>
              </div>
              {lastSendLog.details?.response?.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Response Msg ID:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px', color: 'var(--accent-secondary)' }}>
                    {lastSendLog.details?.response?.id}
                  </span>
                </div>
              )}
              {lastSendLog.details?.errorResponse && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--error)' }}>
                  <span>Error Response:</span>
                  <span style={{ background: 'rgba(239,68,68,0.1)', padding: '6px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                    {typeof lastSendLog.details?.errorResponse === 'object' 
                      ? JSON.stringify(lastSendLog.details.errorResponse) 
                      : lastSendLog.details.errorResponse}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No messages sent yet this session</span>
          )}
        </div>

        {/* EVENT LOG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3 style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            Chronological Event Log
          </h3>

          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '10px' }}>
              No network or hub events logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                
                return (
                  <div 
                    key={log.id} 
                    className="glass-panel"
                    style={{
                      padding: '8px 10px',
                      borderColor: log.type === 'API' ? 'rgba(255,255,255,0.06)' : 'rgba(6,182,212,0.15)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                        {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                        <span style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontWeight: 600,
                          color: log.type === 'API' ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.name}
                        </span>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {getDirectionBadge(log.direction)}
                      </div>
                    </div>
                    
                    <div style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-muted)', 
                      marginTop: '4px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{log.type}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {isExpanded && (
                      <pre style={{
                        marginTop: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '8px',
                        borderRadius: '6px',
                        overflowX: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: '#a7f3d0',
                        border: '1px solid rgba(255,255,255,0.04)'
                      }} onClick={(e) => e.stopPropagation()}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
