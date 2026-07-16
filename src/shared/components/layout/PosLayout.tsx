import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Cloud, DownloadCloud, LogOut, ShoppingCart, Package, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { sincronizarCatalogoProductos } from '../../../modules/inventario/services/inventarioSyncService';
import { useNetworkSync } from '../../../core/hooks/useNetworkSync';
import { db } from '../../../core/db/dexieInstance';

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
  const [isSyncingCatalogo, setIsSyncingCatalogo] = useState(false);

  const { isSyncing: isSyncingVentas, forceSync } = useNetworkSync();
  const ventasPendientes =
    useLiveQuery(() => db.ventas.where('syncStatus').equals('pending').count(), []) ?? 0;
  const ventasConError =
    useLiveQuery(() => db.ventas.where('syncStatus').equals('error').count(), []) ?? 0;

  // Seed temporal para poder probar el flujo de Fiados: el módulo de
  // clientes todavía no tiene su propia pantalla ni sincronización con el
  // backend, así que se precargan un par de clientes de ejemplo la primera
  // vez que se abre el POS para una tienda. IDs fijos + bulkPut (upsert) en
  // vez de UUIDs generados aquí: así el seed es idempotente sin importar
  // cuántas veces se ejecute el efecto (p. ej. el doble montaje de
  // React.StrictMode en desarrollo), sin necesitar un chequeo previo que
  // sería una condición de carrera entre dos ejecuciones concurrentes.
  useEffect(() => {
    if (!tiendaId) return;

    const ahora = new Date().toISOString();
    db.clientes.bulkPut([
      {
        id: '00000000-0000-4000-8000-000000000001',
        tiendaId,
        nombre: 'Don Juan',
        telefono: '3001234567',
        limiteCredito: 100000,
        saldoActual: 0,
        syncStatus: 'synced',
        updatedAt: ahora,
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        tiendaId,
        nombre: 'Doña María',
        telefono: '3007654321',
        limiteCredito: 150000,
        saldoActual: 0,
        syncStatus: 'synced',
        updatedAt: ahora,
      },
    ]);
  }, [tiendaId]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Botón temporal: hasta que exista una sincronización automática/background,
  // el cajero dispara la descarga del catálogo manualmente.
  async function handleSincronizarCatalogo() {
    if (!tiendaId || isSyncingCatalogo) return;

    setIsSyncingCatalogo(true);
    try {
      const total = await sincronizarCatalogoProductos(tiendaId);
      alert(`Catálogo actualizado: ${total} productos.`);
    } catch {
      alert('No se pudo descargar el catálogo. Verifica tu conexión.');
    } finally {
      setIsSyncingCatalogo(false);
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
              onClick={forceSync}
              disabled={isSyncingVentas}
              title={
                isSyncingVentas
                  ? 'Sincronizando ventas…'
                  : ventasConError > 0
                    ? `${ventasConError} venta(s) con error de sincronización: requieren atención`
                    : ventasPendientes > 0
                      ? `${ventasPendientes} venta(s) pendientes de sincronizar`
                      : 'Todas las ventas están sincronizadas'
              }
              className="relative flex items-center justify-center rounded-lg p-2 transition hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              <Cloud
                size={20}
                className={
                  isSyncingVentas
                    ? 'animate-spin text-blue-500'
                    : ventasConError > 0
                      ? 'text-red-500'
                      : ventasPendientes > 0
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                }
              />
              {!isSyncingVentas && (ventasConError > 0 || ventasPendientes > 0) && (
                <span
                  className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ${
                    ventasConError > 0 ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                >
                  {ventasConError > 0 ? ventasConError : ventasPendientes}
                </span>
              )}
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
  );
}
