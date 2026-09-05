import axios from 'axios';
import { debugLogger } from './debugLogger';

// Base URL configured for YARP Gateway /web route
// e.g. VITE_API_BASE_URL=http://<gateway-origin>/web or default '/web'
const baseURL = import.meta.env.VITE_API_BASE_URL || '/web';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor: logs outgoing requests with full resolved URL (/web/api/...)
// Internal routing headers (X-Chat-Container, X-Auth-Container) and user identity (X-User-Id)
// are strictly handled server-side by YARP / Web BFF / be-auth — NEVER attached by frontend.
apiClient.interceptors.request.use(
  (config) => {
    const fullUrl = config.baseURL
      ? `${config.baseURL.replace(/\/$/, '')}${config.url}`
      : config.url;

    debugLogger.addLog(
      'API',
      'OUT',
      `${config.method?.toUpperCase()} ${fullUrl}`,
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
    const fullUrl = response.config.baseURL
      ? `${response.config.baseURL.replace(/\/$/, '')}${response.config.url}`
      : response.config.url;

    debugLogger.addLog(
      'API',
      'IN',
      `200 OK | ${response.config.method?.toUpperCase()} ${fullUrl}`,
      {
        status: response.status,
        data: response.data,
      }
    );
    return response;
  },
  (error) => {
    const fullUrl = error.config?.baseURL
      ? `${error.config.baseURL.replace(/\/$/, '')}${error.config.url}`
      : error.config?.url;

    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    };

    debugLogger.addLog(
      'API',
      'IN',
      `ERROR ${error.response?.status || 'NET'} | ${error.config?.method?.toUpperCase()} ${fullUrl}`,
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


