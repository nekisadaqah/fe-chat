import React, { useState } from 'react';
import apiClient from '../api/client';
import type { User } from '../types/user';
import type { Conversation } from '../types/conversation';
import { Search, Loader2, MessageSquare, AlertCircle } from 'lucide-react';

interface UserSearchProps {
  onConversationSelected: (conversation: Conversation) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onConversationSelected }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/Users/search`, {
        params: { query: query.trim() }
      });
      setResults(response.data || []);
      if (response.data.length === 0) {
        setError('No users found matching that query');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Search request failed');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (targetUser: User) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/api/Conversations`, {
        targetUserId: targetUser.id
      });
      onConversationSelected(response.data);
      setQuery('');
      setResults([]);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to initialize conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            id="user-search-input"
            type="text"
            className="input-field"
            placeholder="Search email/username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: '34px', height: '38px' }}
          />
        </div>
        <button id="user-search-submit" type="submit" className="btn-primary" style={{ padding: '8px 12px', height: '38px' }} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : 'Search'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={14} style={{ color: 'var(--error)', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="glass-panel" style={{
          marginTop: '10px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '4px',
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.3)'
        }}>
          {results.map((user) => (
            <div 
              key={user.id} 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '6px',
                gap: '8px'
              }}
              className="search-item-hover"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: user.isOnline ? 'var(--status-online)' : 'var(--status-offline)',
                    border: '1px solid var(--bg-main)'
                  }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => startChat(user)}
                style={{ padding: '6px 10px', fontSize: '12px' }}
              >
                <MessageSquare size={13} />
                Chat
              </button>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        .search-item-hover:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};
