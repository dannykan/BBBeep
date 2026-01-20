import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    // 只有认证相关错误（如 token 过期）才跳转，不包括验证码相关错误
    const isAuthError = error.response?.status === 401 && 
                        error.config?.url?.includes('/auth/verify-phone') === false &&
                        error.config?.url?.includes('/auth/check-phone') === false &&
                        error.config?.url?.includes('/auth/reset-verify-count') === false &&
                        error.config?.url?.includes('/auth/login') === false &&
                        error.config?.url?.includes('/auth/set-password') === false &&
                        error.config?.url?.includes('/auth/reset-password') === false;
    
    if (isAuthError) {
      // Token 过期，清除并跳转到登录页
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
