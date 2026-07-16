import { useState } from 'react';
import { DownloadCloud, LogOut, ShoppingCart, Package, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { sincronizarCatalogoProductos } from '../../../modules/inventario/services/inventarioSyncService';

const NAV_ITEMS = [
  { to: '/', label: 'Ventas', icon: ShoppingCart },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/fiados', label: 'Fiados', icon: Users },
];

export default function PosLayout() {
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);
  const tiendaId = useAuthStore((state) => state.tiendaId);
  const logout = useAuthStore((state) => state.logout);
  const [isSyncing, setIsSyncing] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Botón temporal: hasta que exista una sincronización automática/background,
  // el cajero dispara la descarga del catálogo manualmente.
  async function handleSincronizarCatalogo() {
    if (!tiendaId || isSyncing) return;

    setIsSyncing(true);
    try {
      const total = await sincronizarCatalogoProductos(tiendaId);
      alert(`Catálogo actualizado: ${total} productos.`);
    } catch {
      alert('No se pudo descargar el catálogo. Verifica tu conexión.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="flex w-20 flex-col items-center gap-1 border-r border-slate-200 bg-white py-4">
        <span className="mb-4 text-lg font-bold text-blue-600">TS</span>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm">
            <p className="font-medium text-slate-900">{usuario?.nombre ?? usuario?.email}</p>
            <p className="text-slate-500">{usuario?.rol}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSincronizarCatalogo}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <DownloadCloud size={16} className={isSyncing ? 'animate-spin' : undefined} />
              {isSyncing ? 'Sincronizando…' : 'Descargar catálogo'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
