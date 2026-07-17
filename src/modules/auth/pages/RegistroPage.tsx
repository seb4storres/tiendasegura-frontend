import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registrarTienda, toAuthData } from '../services/authService';
import { useAuthStore } from '../../../core/store/useAuthStore';

export default function RegistroPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.login);

  const [tiendaNombre, setTiendaNombre] = useState('');
  const [usuarioNombre, setUsuarioNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const auth = await registrarTienda({
        nombreTienda: tiendaNombre,
        nombreAdmin: usuarioNombre,
        emailAdmin: email,
        passwordAdmin: password,
      });
      // El backend ya devuelve tokens listos para usar: se entra directo,
      // sin pedirle al tendero que vuelva a loguearse con lo que acaba de escribir.
      setAuth(toAuthData(auth));
      navigate('/', { replace: true });
    } catch {
      setError('No se pudo crear la tienda. Verifica los datos e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Crea tu tienda</h1>
          <p className="mt-1 text-sm text-slate-500">Registra tu minimercado en TiendaSegura</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tiendaNombre" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de la tienda
            </label>
            <input
              id="tiendaNombre"
              autoFocus
              required
              value={tiendaNombre}
              onChange={(event) => setTiendaNombre(event.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              placeholder="Minimercado Don Pepe"
            />
          </div>

          <hr className="border-slate-200" />

          <div>
            <label htmlFor="usuarioNombre" className="mb-1 block text-sm font-medium text-slate-700">
              Tu nombre
            </label>
            <input
              id="usuarioNombre"
              required
              value={usuarioNombre}
              onChange={(event) => setUsuarioNombre(event.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              placeholder="Sebastian Torres"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              placeholder="tucorreo@tienda.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creando…' : 'Crear tienda'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
