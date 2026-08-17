import apiClient from '../api/client';

export interface AuthSession {
  userId: string;
  userEmail: string;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
      rememberMe: false,
    });

    const data = response.data;
    if (data.success && data.userId && data.userEmail) {
      const session: AuthSession = {
        userId: data.userId,
        userEmail: data.userEmail,
      };
      localStorage.setItem('auth_session', JSON.stringify(session));
      return session;
    }

    throw new Error(data.message || 'Login failed');
  },

  async getSession(): Promise<AuthSession | null> {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return null;

    try {
      // Call /api/auth/me to verify the session with the server
      const response = await apiClient.get('/api/auth/me');
      const data = response.data;
      if (data.isAuthenticated && data.user) {
        const session: AuthSession = {
          userId: data.user.userId,
          userEmail: data.user.email,
        };
        // Update storage
        localStorage.setItem('auth_session', JSON.stringify(session));
        return session;
      }
    } catch (err) {
      console.warn('Session verification failed, clearing local session', err);
      localStorage.removeItem('auth_session');
      return null;
    }

    return null;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      localStorage.removeItem('auth_session');
    }
  },

  getLocalSession(): AuthSession | null {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }
};
