import axios from 'axios';
import { csrfProtection, rateLimiter, tokenValidation } from '../utils/security';


const API_BASE_URL = 'http://10.80.49.110:10800';
// const API_BASE_URL = 'http://localhost:10800';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3600000, // 60 minutes (1 hour) timeout - เพื่อให้ AI วิเคราะห์ได้นานมาก
});

// Add token and security headers to requests
api.interceptors.request.use((config) => {
  // Rate limiting check
  const endpoint = config.url || '';
  if (!rateLimiter.checkLimit(`${config.method}-${endpoint}`, 30, 60000)) {
    return Promise.reject(new Error('ส่งคำขอบ่อยเกินไป กรุณารอสักครู่'));
  }

  // Add authorization token
  const token = localStorage.getItem('token');
  if (token) {
    // Check if token is expired before using it
    //consle.log('🔍 Checking token expiration for token:', token.substring(0, 50) + '...'); // Debug: show token
    const isExpired = tokenValidation.isTokenExpired(token);
    //consle.log('⏰ Token expired?', isExpired); // Debug: show expiration status

    if (isExpired) {
      //consle.log('❌ Token is expired, removing from storage'); // Debug: token expired
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      // Force reload to trigger React Router navigation to login
      window.location.reload();
      return Promise.reject(new Error('Token expired'));
    }

    //consle.log('✅ Token is valid, adding to request'); // Debug: token valid
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    //consle.log('ℹ️ No token found in localStorage'); // Debug: no token
  }

  // Add CSRF protection for state-changing operations
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    const csrfHeaders = csrfProtection.addToHeaders({});
    Object.assign(config.headers, csrfHeaders);
  }

  // Add security headers
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  config.headers['Cache-Control'] = 'no-cache';

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for error handling
// Refresh token logic
let isRefreshing = false;
let failedQueue: any[] = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // ถ้า endpoint เป็น login หรือ register ไม่ต้อง redirect ให้ handle ในหน้าเดิม
      if (originalRequest.url && (
        originalRequest.url.includes('/auth/token') ||
        originalRequest.url.includes('/auth/register') ||
        originalRequest.url.includes('/auth/reset-password')
      )) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !isRefreshing) {
        isRefreshing = true;
        try {
          const res = await api.post('/auth/token/refresh', { refresh_token: refreshToken });
          const newToken = res.data.access_token;
          localStorage.setItem('token', newToken);
          api.defaults.headers['Authorization'] = `Bearer ${newToken}`;
          processQueue(null, newToken);
          isRefreshing = false;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (err) {
          processQueue(err, null);
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          // ไม่ใช้ window.location.reload() แต่ให้ component handle error เอง
          isRefreshing = false;
          return Promise.reject(err);
        }
      } else if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        // ไม่ใช้ window.location.reload() ให้ component handle error เอง
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),

  login: async (data: { email: string; password: string }) => {
    try {
      //consle.log('🚀 Attempting login with:', { email: data.email }); // Debug log

      const res = await api.post('/auth/token', { username: data.email, password: data.password });

      //consle.log('📦 Backend response:', res.data); // Debug: ดู response จาก backend
      //consle.log('🔑 Access token:', res.data.access_token); // Debug: ดู token
      //consle.log('🔄 Refresh token:', res.data.refresh_token); // Debug: ดู refresh token

      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
        //consle.log('✅ Token saved to localStorage'); // Debug: confirm save
      } else {
        //consle.error('❌ No access_token in response!'); // Debug: missing token
        throw new Error('Backend did not return access_token');
      }

      if (res.data.refresh_token) {
        localStorage.setItem('refresh_token', res.data.refresh_token);
        //consle.log('✅ Refresh token saved to localStorage'); // Debug: confirm save
      } else {
        //consle.error('❌ No refresh_token in response!'); // Debug: missing refresh token
        //consle.warn('⚠️ No refresh token - auto-refresh will not work');
      }

      return res;
    } catch (error: any) {
      //consle.error('💥 Login error:', error); // Debug: show full error
      //consle.error('📡 Response data:', error.response?.data); // Debug: show backend error
      //consle.error('📡 Response status:', error.response?.status); // Debug: show status
      throw error; // Re-throw to let component handle it
    }
  },

  getMe: () => api.get('/auth/me'),
};

// Projects API (Enhanced)
export const projectsAPI = {
  create: (data: { name: string; description?: string; diagram_data?: any; tag_ids?: number[] }) => {
    // Convert diagram_data string to JSON if needed
    const payload = {
      ...data,
      diagram_data: typeof data.diagram_data === 'string'
        ? (data.diagram_data ? JSON.parse(data.diagram_data) : null)
        : data.diagram_data,
      tag_ids: data.tag_ids || []
    };
    return api.post('/api/projects', payload);
  },

  getAll: () => api.get('/api/projects'),

  getById: (id: number) => api.get(`/api/projects/${id}`),

  update: (id: number, data: { name?: string; description?: string; diagram_data?: any; is_favorite?: boolean; tag_ids?: number[] }) => {
    // Convert diagram_data string to JSON if needed
    const payload = {
      ...data,
      diagram_data: typeof data.diagram_data === 'string'
        ? (data.diagram_data ? JSON.parse(data.diagram_data) : null)
        : data.diagram_data
    };
    return api.put(`/api/projects/${id}`, payload);
  },

  delete: (id: number) => api.delete(`/api/projects/${id}`),
};

// AI API (Basic)
export const aiAPI = {
  checkHealth: () => api.get('/ai/health'),

  // Enhanced AI Analysis (recommended)
  analyzeEnhanced: (data: { nodes: any[]; edges: any[]; project_id?: number }, signal?: AbortSignal) =>
    api.post('/api/analyze', data, { signal }),
};

// Analysis History API (Enhanced)
export const analysisHistoryAPI = {
  getHistory: (params?: { skip?: number; limit?: number; project_id?: number }) =>
    api.get('/api/analysis-history', { params }),

  getById: (id: number) => api.get(`/api/analysis-history/${id}`),

  deleteById: (id: number) => api.delete(`/api/analysis-history/${id}`),

  clearAll: (project_id?: number) => api.delete('/api/analysis-history', { params: { project_id } }),
};

// Change Password API
export const changePasswordApi = (data: { email: string; current_password: string; new_password: string }) =>
  api.post('/auth/reset-password', data);

export default api;