import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// /auth/login y /auth/registro también responden 401 ante credenciales
// inválidas; ese caso lo maneja el propio formulario y no debe disparar el
// flujo de "sesión expirada" (redirigiría al usuario a /login sobre /login).
const AUTH_ENDPOINTS = ['/auth/login', '/auth/registro'];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path));

    if (error.response?.status === 401 && !isAuthEndpoint) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        toast.error('Tu sesión ha expirado, por favor ingresa de nuevo');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
