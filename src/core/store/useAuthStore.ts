import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Rol } from '../db/tables';

export interface AuthUsuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

interface AuthData {
  token: string;
  refreshToken: string;
  tiendaId: string;
  usuario: AuthUsuario;
}

interface AuthState extends Partial<AuthData> {
  isAuthenticated: boolean;
  login: (data: AuthData) => void;
  // Usado por el interceptor 401 de apiClient tras una renovación silenciosa:
  // solo pisa los tokens, deja tiendaId/usuario intactos.
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
}

// Persistido en localStorage: al recargar la app el cajero sigue autenticado
// y el interceptor de apiClient puede seguir leyendo el token de inmediato.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      refreshToken: undefined,
      tiendaId: undefined,
      usuario: undefined,
      isAuthenticated: false,
      login: ({ token, refreshToken, tiendaId, usuario }) =>
        set({ token, refreshToken, tiendaId, usuario, isAuthenticated: true }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      logout: () =>
        set({
          token: undefined,
          refreshToken: undefined,
          tiendaId: undefined,
          usuario: undefined,
          isAuthenticated: false,
        }),
    }),
    { name: 'tiendasegura-auth' },
  ),
);
