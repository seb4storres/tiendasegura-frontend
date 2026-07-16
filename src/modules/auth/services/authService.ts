import { apiClient } from '../../../core/api/apiClient';
import type { AuthUsuario } from '../../../core/store/useAuthStore';

export interface LoginRequest {
  email: string;
  password: string;
}

// Debe coincidir con LoginResponse.java del backend (auth/infrastructure/dto).
export interface AuthResponse {
  token: string;
  tiendaId: string;
  usuario: AuthUsuario;
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return data;
}
