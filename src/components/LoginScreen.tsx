import React, { useState } from 'react';
import type { AuthSession } from '../auth/authService';
import { authService } from '../auth/authService';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const session = await authService.login(email.trim(), password);
      onLoginSuccess(session);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.1), transparent), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent)'
    }}>
      <div className="glass-panel animate-fade" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px 30px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            be-chat test client
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Integration testing for real-time 1-to-1 chat flow
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                id="login-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="glass-panel" style={{
              display: 'flex',
              gap: '10px',
              padding: '12px',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              color: 'var(--error)',
              fontSize: '13px',
              alignItems: 'center'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button id="login-submit" type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', height: '46px', marginTop: '10px' }}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} style={{ color: 'var(--accent-secondary)' }} />
            Prepared Live Test Accounts
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Use these accounts in two separate browser contexts to test real-time chat sync. Both use password: <code style={{ color: 'var(--text-primary)' }}>Password123!</code>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'flex-start' }}
              onClick={() => { setEmail('user_a@test.com'); setPassword('Password123!'); }}
            >
              user_a@test.com
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'flex-start' }}
              onClick={() => { setEmail('user_b@test.com'); setPassword('Password123!'); }}
            >
              user_b@test.com
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
