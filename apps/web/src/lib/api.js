import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  async register(data) {
    const response = await api.post('/auth/register', data);
    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { token, user };
  },

  async login(data) {
    const response = await api.post('/auth/login', data);
    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { token, user };
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  }
};

export const projects = {
  async list() {
    const response = await api.get('/projects');
    return response.data;
  },

  async get(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async addAsset(projectId, data) {
    const response = await api.post(`/projects/${projectId}/assets`, data);
    return response.data;
  },

  async runCompliance(projectId, data) {
    const response = await api.post(`/projects/${projectId}/compliance`, data);
    return response.data;
  }
};

export const cerProducts = {
  async search(params) {
    const response = await api.get('/cer-products', { params });
    return response.data;
  }
};

export default api;