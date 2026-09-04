import axios from 'axios';
import { debugLogger } from './debugLogger';

const apiClient = axios.create({
  timeout: 10000,
});

// Interceptor to inject User ID header for Chat service endpoints
apiClient.interceptors.request.use(
  (config) => {
    // Only send the X-User-Id header if we have a session stored and the endpoint is not auth
    const sessionStr = localStorage.getItem('auth_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session && session.userId) {
          // Add X-User-Id for Chat Service endpoints
          if (config.url && !config.url.includes('/api/auth/')) {
            config.headers['X-User-Id'] = session.userId;
          }
        }
      } catch (err) {
        console.error('Failed to parse auth session in interceptor', err);
      }
    }

    // Add routing headers required by Web BFF DynamicRoutingHandler
    if (config.url) {
      if (!config.url.includes('/api/auth/')) {
        if (!config.headers['X-Chat-Container']) {
          config.headers['X-Chat-Container'] = import.meta.env.VITE_CHAT_CONTAINER || 'be-chat';
        }
      } else {
        if (!config.headers['X-Auth-Container']) {
          config.headers['X-Auth-Container'] = import.meta.env.VITE_AUTH_CONTAINER || 'be-auth';
        }
      }
    }

    // Log the outgoing request
    debugLogger.addLog(
      'API',
      'OUT',
      `${config.method?.toUpperCase()} ${config.url}`,
      {
        headers: { ...config.headers },
        params: config.params,
        data: config.data,
      }
    );

    return config;
  },
  (error) => {
    debugLogger.addLog('API', 'OUT', 'REQUEST_ERROR', error);
    return Promise.reject(error);
  }
);

// Interceptor to log incoming responses and handle unauthorized states
apiClient.interceptors.response.use(
  (response) => {
    // Log the successful response
    debugLogger.addLog(
      'API',
      'IN',
      `200 OK | ${response.config.method?.toUpperCase()} ${response.config.url}`,
      {
        status: response.status,
        data: response.data,
      }
    );
    return response;
  },
  (error) => {
    // Extract error details
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    };

    debugLogger.addLog(
      'API',
      'IN',
      `ERROR ${error.response?.status || 'NET'} | ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      errorDetails
    );

    // If we get an Unauthorized response for non-auth requests, it might mean the session is invalid
    if (error.response?.status === 401 && error.config && !error.config.url?.includes('/api/auth/')) {
      // We don't automatically wipe session here to allow testing/debugging unauthorized states,
      // but we can bubble it up to the UI.
    }

    return Promise.reject(error);
  }
);

export default apiClient;
