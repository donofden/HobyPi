import { API_BASE } from '../constants';

// Token management utilities
export const tokenManager = {
  getToken: () => localStorage.getItem('access_token'),
  getTokenType: () => localStorage.getItem('token_type') || 'Bearer',
  getUserInfo: () => {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  },
  setAuthData: (tokenData) => {
    localStorage.setItem('access_token', tokenData.access_token);
    localStorage.setItem('token_type', tokenData.token_type);
    if (tokenData.user) {
      localStorage.setItem('user_info', JSON.stringify(tokenData.user));
    }
  },
  clearAuthData: () => {
    console.log('clearAuthData: Removing tokens from localStorage');
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_info');
    console.log('clearAuthData: Tokens removed');
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  }
};

// Create authorization headers for API calls
export const getAuthHeaders = () => {
  const token = tokenManager.getToken();
  const tokenType = tokenManager.getTokenType();
  
  if (!token) {
    return {};
  }
  
  return {
    'Authorization': `${tokenType} ${token}`,
    'Content-Type': 'application/json'
  };
};

// Authenticated fetch wrapper
export const authenticatedFetch = async (url, options = {}) => {
  const authHeaders = getAuthHeaders();
  
  const config = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  };
  
  const response = await fetch(url, config);
  
  // If we get a 401, clear the stored auth data
  if (response.status === 401) {
    tokenManager.clearAuthData();
    // Optionally redirect to login or trigger re-authentication
    window.location.reload();
  }
  
  return response;
};

// API endpoints
export const apiEndpoints = {
  login: `${API_BASE}/auth/login`,
  systemMetrics: `${API_BASE}/system/metrics`,
  users: `${API_BASE}/users/`,
  userMe: `${API_BASE}/auth/me`
};