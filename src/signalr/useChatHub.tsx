import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { debugLogger } from '../api/debugLogger';
import type { Message } from '../types/message';

type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

interface ChatHubContextType {
  connectionState: ConnectionState;
  onlineUsers: Record<string, boolean>;
  typingUsers: Record<string, boolean>;
  registerMessageListener: (cb: (message: Message) => void) => () => void;
  sendTyping: (recipientUserId: string, senderUsername: string) => Promise<void>;
  sendStopTyping: (recipientUserId: string, senderUsername: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, clientMessageId?: string) => Promise<Message>;
  
  // Diagnostic parameters for debugging
  hubUrl: string | null;
  connectionId: string | null;
  lastConnectedTime: string | null;
  lastReconnectTime: string | null;
  lastSignalRError: string | null;
  previousConnectionId: string | null;
  lastReconnectingTime: string | null;
  lastClosedTime: string | null;
  initialConnectionError: string | null;
  reconnectCycles: number;
  reconnectSucceeded: boolean | null;
  finalCloseReason: string | null;
}

const ChatHubContext = createContext<ChatHubContextType | null>(null);

export const useChatHub = () => {
  const context = useContext(ChatHubContext);
  if (!context) {
    throw new Error('useChatHub must be used within a ChatHubProvider');
  }
  return context;
};

interface ChatHubProviderProps {
  userId: string | null;
  children: React.ReactNode;
}

export const ChatHubProvider: React.FC<ChatHubProviderProps> = ({ userId, children }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  
  // Diagnostic state variables
  const [hubUrl, setHubUrl] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastConnectedTime, setLastConnectedTime] = useState<string | null>(null);
  const [lastReconnectTime, setLastReconnectTime] = useState<string | null>(null);
  const [lastSignalRError, setLastSignalRError] = useState<string | null>(null);
  const [previousConnectionId, setPreviousConnectionId] = useState<string | null>(null);
  const [lastReconnectingTime, setLastReconnectingTime] = useState<string | null>(null);
  const [lastClosedTime, setLastClosedTime] = useState<string | null>(null);
  const [initialConnectionError, setInitialConnectionError] = useState<string | null>(null);
  const [reconnectCycles, setReconnectCycles] = useState<number>(0);
  const [reconnectSucceeded, setReconnectSucceeded] = useState<boolean | null>(null);
  const [finalCloseReason, setFinalCloseReason] = useState<string | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const messageListenersRef = useRef<Set<(message: Message) => void>>(new Set());
  
  // Refs to serialize starts and stops across React lifecycle runs (e.g. StrictMode mounts/unmounts)
  const previousStopPromiseRef = useRef<Promise<void> | null>(null);
  const activeInstanceIdRef = useRef<string | null>(null);

  const registerMessageListener = (cb: (message: Message) => void) => {
    messageListenersRef.current.add(cb);
    return () => {
      messageListenersRef.current.delete(cb);
    };
  };

  useEffect(() => {
    if (!userId) {
      const stopCurrent = async () => {
        // Wait for any ongoing stop operation before executing this logout stop
        if (previousStopPromiseRef.current) {
          await previousStopPromiseRef.current;
        }
        
        const conn = connectionRef.current;
        if (conn) {
          connectionRef.current = null;
          setConnectionState('DISCONNECTED');
          setConnectionId(null);
          setHubUrl(null);
          debugLogger.addLog('SignalR', 'EVENT', 'DISCONNECTED', { reason: 'No authenticated user session' });
          try {
            await conn.stop();
          } catch (err: any) {
            console.error('Error stopping connection on logout:', err);
          }
        }
      };
      
      previousStopPromiseRef.current = stopCurrent();
      return;
    }

    // Capture unique identifier for this effect run instance
    const connectionInstanceId = Math.random().toString(36).substring(2, 9);
    activeInstanceIdRef.current = connectionInstanceId;

    const getSignalRBaseUrl = (): string => {
      if (import.meta.env.VITE_SIGNALR_URL) {
        return import.meta.env.VITE_SIGNALR_URL;
      }
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      if (apiBaseUrl && (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://'))) {
        const gatewayOrigin = apiBaseUrl.replace(/\/web\/?$/, '');
        return `${gatewayOrigin}/chathub`;
      }
      return `${window.location.origin}/chathub`;
    };

    const baseUrl = getSignalRBaseUrl();
    const url = baseUrl.includes('?') 
      ? `${baseUrl}&userId=${encodeURIComponent(userId)}` 
      : `${baseUrl}?userId=${encodeURIComponent(userId)}`;
    setHubUrl(url);
    debugLogger.addLog('SignalR', 'EVENT', 'SIGNALR_CREATE', {
      timestamp: new Date().toISOString(),
      userId,
      hubUrl: url,
      connectionInstanceId,
      connectionStateBeforeStart: 'DISCONNECTED'
    });
    debugLogger.addLog('SignalR', 'EVENT', 'CONNECTING', { url, instanceId: connectionInstanceId });
    setConnectionState('CONNECTING');

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: true
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000]) // Reconnect delays: immediate, 2s, 5s, 10s
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register incoming event handlers exactly once
    newConnection.on('ReceiveMessage', (message: Message) => {
      debugLogger.addLog('SignalR', 'IN', 'ReceiveMessage', message);
      messageListenersRef.current.forEach(cb => cb(message));
    });

    newConnection.on('InitialOnlineUsers', (userIds: string[]) => {
      debugLogger.addLog('SignalR', 'IN', 'InitialOnlineUsers', userIds);
      setOnlineUsers(prev => {
        const updated = { ...prev };
        userIds.forEach(id => {
          updated[id] = true;
        });
        return updated;
      });
    });

    newConnection.on('UserOnline', (onlineUserId: string) => {
      debugLogger.addLog('SignalR', 'IN', 'UserOnline', { userId: onlineUserId });
      setOnlineUsers(prev => ({ ...prev, [onlineUserId]: true }));
    });

    newConnection.on('UserOffline', (onlineUserId: string) => {
      debugLogger.addLog('SignalR', 'IN', 'UserOffline', { userId: onlineUserId });
      setOnlineUsers(prev => ({ ...prev, [onlineUserId]: false }));
      // Robustly clear typing status for this user if they disconnect/go offline
      setTypingUsers(prev => ({ ...prev, [onlineUserId]: false }));
    });

    newConnection.on('UserTyping', (userId: string) => {
      debugLogger.addLog('SignalR', 'IN', 'UserTyping', { userId });
      setTypingUsers(prev => ({ ...prev, [userId]: true }));
    });

    newConnection.on('UserStoppedTyping', (userId: string) => {
      debugLogger.addLog('SignalR', 'IN', 'UserStoppedTyping', { userId });
      setTypingUsers(prev => ({ ...prev, [userId]: false }));
    });

    newConnection.onreconnecting((error) => {
      if (activeInstanceIdRef.current === connectionInstanceId) {
        setConnectionState('RECONNECTING');
        setPreviousConnectionId(newConnection.connectionId || connectionId);
        setConnectionId(null);
        setLastReconnectingTime(new Date().toISOString());
        setLastSignalRError(error?.message || 'Connection lost, reconnecting...');
        setReconnectCycles(prev => prev + 1);
        setReconnectSucceeded(null);
        debugLogger.addLog('SignalR', 'EVENT', 'SIGNALR_RECONNECTING', {
          timestamp: new Date().toISOString(),
          error: error?.message || error?.toString(),
          userId,
          previousConnectionId: newConnection.connectionId || connectionId,
          hubUrl: url,
          currentConnectionState: 'RECONNECTING',
          connectionInstanceId
        });
      }
    });

    newConnection.onreconnected((connId) => {
      if (activeInstanceIdRef.current === connectionInstanceId) {
        setConnectionState('CONNECTED');
        setConnectionId(connId || null);
        setLastReconnectTime(new Date().toISOString());
        setLastSignalRError(null);
        setReconnectSucceeded(true);
        debugLogger.addLog('SignalR', 'EVENT', 'SIGNALR_RECONNECTED', {
          timestamp: new Date().toISOString(),
          newConnectionId: connId,
          userId,
          hubUrl: url,
          connectionInstanceId
        });
      }
    });

    newConnection.onclose((error) => {
      if (activeInstanceIdRef.current === connectionInstanceId) {
        setConnectionState('DISCONNECTED');
        setConnectionId(null);
        setLastClosedTime(new Date().toISOString());
        setFinalCloseReason(error?.message || 'Clean exit or normal stop');
        if (error) {
          setLastSignalRError(error.message);
          setReconnectSucceeded(false);
        } else {
          setReconnectSucceeded(prev => prev === null ? false : prev);
        }
        debugLogger.addLog('SignalR', 'EVENT', 'SIGNALR_CLOSED', {
          timestamp: new Date().toISOString(),
          error: error?.message || 'Clean or normal stop',
          userId,
          hubUrl: url,
          finalConnectionState: 'DISCONNECTED',
          connectionInstanceId
        });
      }
    });

    let startPromise: Promise<void> | null = null;
    let isStopped = false;

    const startConnection = async () => {
      try {
        // Wait for any previous connection to finish stopping first to serialize start/stop
        if (previousStopPromiseRef.current) {
          await previousStopPromiseRef.current;
        }

        if (isStopped) {
          debugLogger.addLog('SignalR', 'EVENT', 'START_ABORTED', { reason: 'Unmounted before startup' });
          return;
        }

        connectionRef.current = newConnection;
        debugLogger.addLog('SignalR', 'EVENT', 'SIGNALR_START_ATTEMPT', {
          timestamp: new Date().toISOString(),
          userId,
          hubUrl: url,
          connectionInstanceId
        });
        await newConnection.start();

        if (isStopped) {
          debugLogger.addLog('SignalR', 'EVENT', 'START_RESOLVED_BUT_STALE', { reason: 'Unmounted during handshake' });
          await newConnection.stop();
          return;
        }

        if (activeInstanceIdRef.current === connectionInstanceId) {
          setConnectionState('CONNECTED');
          setConnectionId(newConnection.connectionId);
          setLastConnectedTime(new Date().toISOString());
          setLastSignalRError(null);
          debugLogger.addLog('SignalR', 'EVENT', 'SIGNALR_CONNECTED', {
            timestamp: new Date().toISOString(),
            userId,
            connectionId: newConnection.connectionId,
            hubUrl: url,
            connectionInstanceId
          });
        }
      } catch (error: any) {
        if (isStopped) return;
        if (activeInstanceIdRef.current === connectionInstanceId) {
          setConnectionState('DISCONNECTED');
          setConnectionId(null);
          setLastClosedTime(new Date().toISOString());
          setInitialConnectionError(error?.message || error?.toString() || 'Start failed');
          setLastSignalRError(error?.message || 'Connection failed');
          debugLogger.addLog('SignalR', 'EVENT', 'SIGNALR_INITIAL_CONNECTION_FAILED', {
            timestamp: new Date().toISOString(),
            error: error?.message || error?.toString(),
            userId,
            hubUrl: url,
            connectionInstanceId
          });
        }
      }
    };

    startPromise = startConnection();

    return () => {
      isStopped = true;
      debugLogger.addLog('SignalR', 'EVENT', 'CLEANUP_TRIGGERED', { instanceId: connectionInstanceId });

      const stopConnection = async () => {
        // Wait for the startup promise to resolve before shutting down to prevent HttpConnection errors
        if (startPromise) {
          await startPromise;
        }

        // Clean up listeners exactly once
        newConnection.off('ReceiveMessage');
        newConnection.off('UserOnline');
        newConnection.off('UserOffline');
        newConnection.off('UserTyping');
        newConnection.off('UserStoppedTyping');

        try {
          await newConnection.stop();
          debugLogger.addLog('SignalR', 'EVENT', 'CLEANUP_STOP_SUCCESS', { instanceId: connectionInstanceId });
        } catch (err: any) {
          console.error('Error in cleanup connection stop:', err);
        }

        if (connectionRef.current === newConnection) {
          connectionRef.current = null;
        }
        if (activeInstanceIdRef.current === connectionInstanceId) {
          setConnectionState('DISCONNECTED');
          setConnectionId(null);
        }
      };

      previousStopPromiseRef.current = stopConnection();
    };
  }, [userId]);

  const sendTyping = async (recipientUserId: string, senderUsername: string) => {
    if (connectionRef.current && connectionState === 'CONNECTED') {
      try {
        debugLogger.addLog('SignalR', 'OUT', 'SendTypingIndicator', { recipientUserId, senderUsername });
        await connectionRef.current.invoke('SendTypingIndicator', recipientUserId, senderUsername);
      } catch (err) {
        console.error('Failed to send typing indicator', err);
      }
    }
  };

  const sendStopTyping = async (recipientUserId: string, senderUsername: string) => {
    if (connectionRef.current && connectionState === 'CONNECTED') {
      try {
        debugLogger.addLog('SignalR', 'OUT', 'StopTypingIndicator', { recipientUserId, senderUsername });
        await connectionRef.current.invoke('StopTypingIndicator', recipientUserId, senderUsername);
      } catch (err) {
        console.error('Failed to send stop typing indicator', err);
      }
    }
  };

  const sendMessage = async (conversationId: string, content: string, clientMessageId?: string): Promise<Message> => {
    if (connectionRef.current && connectionState === 'CONNECTED') {
      try {
        debugLogger.addLog('SignalR', 'OUT', 'SendMessage', { conversationId, content, clientMessageId });
        const result = await connectionRef.current.invoke('SendMessage', {
          conversationId,
          content,
          clientMessageId
        });
        return result as Message;
      } catch (err) {
        console.error('Failed to send message via SignalR', err);
        throw err;
      }
    } else {
      throw new Error('SignalR connection is not established');
    }
  };

  return (
    <ChatHubContext.Provider
      value={{
        connectionState,
        onlineUsers,
        typingUsers,
        registerMessageListener,
        sendTyping,
        sendStopTyping,
        sendMessage,
        hubUrl,
        connectionId,
        lastConnectedTime,
        lastReconnectTime,
        lastSignalRError,
        previousConnectionId,
        lastReconnectingTime,
        lastClosedTime,
        initialConnectionError,
        reconnectCycles,
        reconnectSucceeded,
        finalCloseReason
      }}
    >
      {children}
    </ChatHubContext.Provider>
  );
};
