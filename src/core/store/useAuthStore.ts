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
  // Todavía no hay lógica de refresh en apiClient (se agrega cuando el
  // access token empiece a expirar en producción); se persiste desde ya
  // para no tener que volver a tocar el shape del store en ese momento.
  refreshToken: string;
  tiendaId: string;
  usuario: AuthUsuario;
}

interface AuthState extends Partial<AuthData> {
  isAuthenticated: boolean;
  login: (data: AuthData) => void;
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
