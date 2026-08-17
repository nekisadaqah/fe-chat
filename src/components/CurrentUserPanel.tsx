import React from 'react';
import type { AuthSession } from '../auth/authService';
import { LogOut, User as UserIcon } from 'lucide-react';

interface CurrentUserPanelProps {
  session: AuthSession;
  connectionState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';
  onLogout: () => void;
}

export const CurrentUserPanel: React.FC<CurrentUserPanelProps> = ({ session, connectionState, onLogout }) => {
  const getStatusColor = () => {
    switch (connectionState) {
      case 'CONNECTED': return 'var(--status-online)';
      case 'CONNECTING':
      case 'RECONNECTING': return 'var(--status-typing)';
      default: return 'var(--status-offline)';
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      borderBottom: '1px solid var(--border-glass)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <UserIcon size={18} style={{ color: '#fff' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: 'var(--text-primary)' 
          }}>
            {session.userEmail.split('@')[0]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {connectionState.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={onLogout} 
          className="btn-secondary" 
          title="Sign Out"
          style={{ padding: '8px', minWidth: '36px', height: '36px', borderRadius: '50%' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
};
