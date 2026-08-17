import { useState, useEffect } from 'react';
import type { AuthSession } from './auth/authService';
import { authService } from './auth/authService';
import { ChatHubProvider } from './signalr/useChatHub';
import { LoginScreen } from './components/LoginScreen';
import { ChatPage } from './pages/ChatPage';
import { Loader2 } from 'lucide-react';

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // 1. Instantly check localStorage for instant load
      const local = authService.getLocalSession();
      if (local) {
        setSession(local);
      }
      
      // 2. Validate with API (/api/auth/me) in the background to ensure session is active
      const active = await authService.getSession();
      setSession(active);
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
  };

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
  };

  if (loading && !session) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="spin" size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)', marginBottom: '12px' }} />
          <div style={{ fontSize: '14px' }}>Loading session context...</div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {session ? (
        <ChatHubProvider userId={session.userId}>
          <ChatPage session={session} onLogout={handleLogout} />
        </ChatHubProvider>
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
