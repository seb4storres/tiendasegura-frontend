import { useState } from 'react';
import { toast } from 'sonner';
import { DownloadCloud, LogOut, Printer, ShoppingCart, Package, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { sincronizarCatalogoProductos } from '../../../modules/inventario/services/inventarioSyncService';
import { useNetworkSync } from '../../../core/hooks/useNetworkSync';
import { conectar as conectarImpresora } from '../../../core/printer/serialPrinter';
import OfflineBanner from '../OfflineBanner';
import SyncStatusIndicator from '../SyncStatusIndicator';

const NAV_ITEMS = [
  { to: '/', label: 'Ventas', icon: ShoppingCart },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/cartera', label: 'Cartera', icon: Users },
];

export default function PosLayout() {
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);
  const tiendaId = useAuthStore((state) => state.tiendaId);
  const logout = useAuthStore((state) => state.logout);
  const [isSyncingCatalogo, setIsSyncingCatalogo] = useState(false);
  const [impresoraConectada, setImpresoraConectada] = useState(false);

  const { isSyncing: isSyncingVentas, forceSync } = useNetworkSync();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleConectarImpresora() {
    const resultado = await conectarImpresora();
    setImpresoraConectada(resultado.conectado);
    if (resultado.error) {
      toast.error(resultado.error);
    }
  }

  // Botón temporal: hasta que exista una sincronización automática/background,
  // el cajero dispara la descarga del catálogo manualmente.
  async function handleSincronizarCatalogo() {
    if (!tiendaId || isSyncingCatalogo) return;

    setIsSyncingCatalogo(true);
    try {
      const total = await sincronizarCatalogoProductos(tiendaId);
      toast.success(`Catálogo actualizado: ${total} productos.`);
    } catch {
      toast.error('No se pudo descargar el catálogo. Verifica tu conexión.');
    } finally {
      setIsSyncingCatalogo(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <OfflineBanner />

      <div className="flex flex-1 overflow-hidden">
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
              <SyncStatusIndicator isSyncing={isSyncingVentas} onForceSync={forceSync} />
              <button
                type="button"
                onClick={handleConectarImpresora}
                title={impresoraConectada ? 'Impresora térmica conectada' : 'Conectar impresora térmica'}
                className="flex items-center justify-center rounded-lg p-2 transition hover:bg-slate-50"
              >
                <Printer size={20} className={impresoraConectada ? 'text-emerald-500' : 'text-slate-400'} />
              </button>
              <button
                type="button"
                onClick={handleSincronizarCatalogo}
                disabled={isSyncingCatalogo}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <DownloadCloud size={16} className={isSyncingCatalogo ? 'animate-spin' : undefined} />
                {isSyncingCatalogo ? 'Sincronizando…' : 'Descargar catálogo'}
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
    </div>
  );
}
