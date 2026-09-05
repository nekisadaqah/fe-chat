import axios from 'axios';
import { debugLogger } from './debugLogger';

// Base URL configured for YARP Gateway /web route
// e.g. VITE_API_BASE_URL=http://89.116.20.215:7000/web or default '/web'
const baseURL = import.meta.env.VITE_API_BASE_URL || '/web';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor: logs outgoing requests
// Internal routing headers (X-Chat-Container, X-Auth-Container) and user identity (X-User-Id)
// are strictly handled server-side by YARP / Web BFF / be-auth — NEVER attached by frontend.
apiClient.interceptors.request.use(
  (config) => {
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

// Response interceptor: logs responses and handles 401 session expiry cleanly
apiClient.interceptors.response.use(
  (response) => {
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

    // If an unauthenticated 401 status is returned for protected endpoints,
    // clear local session state cleanly and notify the app to present login.
    if (error.response?.status === 401 && error.config && !error.config.url?.includes('/api/auth/')) {
      localStorage.removeItem('auth_session');
      window.dispatchEvent(new Event('auth_session_expired'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;

