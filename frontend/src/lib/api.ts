import axios from 'axios';

// 确保 API URL 有协议前缀
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // 如果没有协议，自动添加 https://
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器，自动添加 token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 添加响应拦截器，处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 只有在 token 明確過期或無效時才清除登入狀態
    // 不要在網路錯誤或其他錯誤時清除
    const isTokenExpiredError =
      error.response?.status === 401 &&
      error.response?.data?.message?.includes('expired') ||
      error.response?.data?.message?.includes('invalid') ||
      error.response?.data?.message?.includes('Unauthorized');

    // 排除登入相關的 API（這些本來就不需要 token）
    const isAuthEndpoint =
      error.config?.url?.includes('/auth/verify-phone') ||
      error.config?.url?.includes('/auth/check-phone') ||
      error.config?.url?.includes('/auth/reset-verify-count') ||
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/set-password') ||
      error.config?.url?.includes('/auth/reset-password') ||
      error.config?.url?.includes('/auth/line');

    if (isTokenExpiredError && !isAuthEndpoint) {
      // Token 過期，清除並跳轉到登入頁
      if (typeof window !== 'undefined') {
        console.log('Token expired, clearing auth state');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
