import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
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
// flujo de renovación/sesión-expirada.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/registro'];

function isAuthEndpoint(url?: string): boolean {
  return AUTH_ENDPOINTS.some((path) => url?.includes(path));
}

function limpiarSesionYRedirigir() {
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    toast.error('Tu sesión ha expirado, por favor ingresa de nuevo');
    window.location.href = '/login';
  }
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Renovación con axios "pelado", sin los interceptores de arriba: si pasara
// por apiClient y el refresh token también estuviera vencido, el 401 de esta
// misma llamada volvería a caer en este mismo interceptor de respuesta y
// dispararía un segundo intento de renovación.
async function renovarToken(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await axios.post<RefreshResponse>(`${apiClient.defaults.baseURL}/auth/refresh`, {
    refreshToken,
  });
  return data;
}

// Cuando varias peticiones fallan con 401 casi al mismo tiempo (p. ej. al
// cargar una pantalla que dispara 3 en paralelo), todas deben esperar la
// MISMA renovación en curso en lugar de disparar 3 refresh contra el backend.
// La asignación de abajo no cruza ningún `await`, así que no hay condición
// de carrera: la primera petición que entra dispara `renovarToken` y deja la
// promesa puesta antes de que la siguiente pueda leerla.
let refreshEnCurso: Promise<string> | null = null;

function obtenerTokenRenovado(refreshToken: string): Promise<string> {
  refreshEnCurso ??= renovarToken(refreshToken)
    .then(({ accessToken, refreshToken: nuevoRefreshToken }) => {
      useAuthStore.getState().setTokens(accessToken, nuevoRefreshToken);
      return accessToken;
    })
    .finally(() => {
      refreshEnCurso = null;
    });

  return refreshEnCurso;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status !== 401 || !originalRequest || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;

    // Ya reintentamos esta petición una vez (con un token "fresco") y volvió
    // a fallar, o no hay refresh token que usar: no hay nada más que intentar.
    if (originalRequest._retry || !refreshToken) {
      limpiarSesionYRedirigir();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const nuevoToken = await obtenerTokenRenovado(refreshToken);
      originalRequest.headers.Authorization = `Bearer ${nuevoToken}`;
      return apiClient(originalRequest);
    } catch {
      limpiarSesionYRedirigir();
      return Promise.reject(error);
    }
  },
);
