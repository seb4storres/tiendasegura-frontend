import { apiClient } from '../../../core/api/apiClient';
import type { AuthUsuario } from '../../../core/store/useAuthStore';

export interface LoginRequest {
  email: string;
  password: string;
}

// Shape real confirmado contra el backend (auth/infrastructure/dto) — /auth/login
// y /auth/registro devuelven exactamente lo mismo. `tienda` viaja anidada,
// no como `tiendaId` plano, y el campo del access token es `accessToken`.
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  usuario: AuthUsuario;
  tienda: {
    id: string;
    nombre: string;
    plan: string;
  };
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return data;
}

// Traduce el shape del backend al shape interno que espera useAuthStore.login().
// Un solo lugar para este mapeo: lo usan tanto login como registro (ambos
// devuelven el mismo AuthResponse).
export function toAuthData(response: AuthResponse) {
  return {
    token: response.accessToken,
    refreshToken: response.refreshToken,
    tiendaId: response.tienda.id,
    usuario: response.usuario,
  };
}

// Shape real confirmado contra el backend: objeto plano, sin NIT (no forma
// parte de este endpoint — la respuesta de /auth/registro tampoco lo trae).
export interface RegistroTiendaRequest {
  nombreTienda: string;
  nombreAdmin: string;
  emailAdmin: string;
  passwordAdmin: string;
}

// /auth/registro responde con el mismo AuthResponse que /auth/login: el
// admin recién creado queda autenticado de una, sin pedirle que inicie
// sesión por separado.
export async function registrarTienda(data: RegistroTiendaRequest): Promise<AuthResponse> {
  const { data: auth } = await apiClient.post<AuthResponse>('/auth/registro', data);
  return auth;
}
