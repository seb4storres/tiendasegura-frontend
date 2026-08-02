import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { Cloud, RotateCw } from 'lucide-react';
import { db } from '../../core/db/dexieInstance';
import { reintentarVenta } from '../../core/api/syncQueue';
import { formatMoney } from '../../core/utils/money';

interface SyncStatusIndicatorProps {
  isSyncing: boolean;
  onForceSync: () => void;
}

export default function SyncStatusIndicator({ isSyncing, onForceSync }: SyncStatusIndicatorProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [reintentandoId, setReintentandoId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Cuenta ventas + abonos + clientes juntos: la nube refleja el estado
  // global de todo lo que falta subir, sin importar el tipo de registro.
  const transaccionesPendientes =
    useLiveQuery(async () => {
      const [ventas, abonos, clientes] = await Promise.all([
        db.ventas.where('syncStatus').equals('pending').count(),
        db.abonos.where('syncStatus').equals('pending').count(),
        db.clientes.where('syncStatus').equals('pending').count(),
      ]);
      return ventas + abonos + clientes;
    }, []) ?? 0;
  const transaccionesConError =
    useLiveQuery(async () => {
      const [ventas, abonos, clientes] = await Promise.all([
        db.ventas.where('syncStatus').equals('error').count(),
        db.abonos.where('syncStatus').equals('error').count(),
        db.clientes.where('syncStatus').equals('error').count(),
      ]);
      return ventas + abonos + clientes;
    }, []) ?? 0;

  // El panel de reintento puntual solo lista ventas: es donde vive el botón
  // "Reintentar" por transacción que pidió el negocio.
  const ventasConError =
    useLiveQuery(async () => {
      const ventas = await db.ventas.where('syncStatus').equals('error').toArray();
      return ventas.sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, []) ?? [];

  useEffect(() => {
    if (!isPanelOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPanelOpen]);

  function handleCloudClick() {
    if (transaccionesConError > 0) {
      setIsPanelOpen((open) => !open);
    } else {
      onForceSync();
    }
  }

  async function handleReintentar(ventaId: string) {
    if (reintentandoId) return;

    setReintentandoId(ventaId);
    try {
      const exito = await reintentarVenta(ventaId);
      if (exito) {
        toast.success('Venta sincronizada correctamente.');
      } else {
        toast.error('El servidor volvió a rechazar la venta. Sigue pendiente de revisión.');
      }
    } finally {
      setReintentandoId(null);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleCloudClick}
        disabled={isSyncing}
        title={
          isSyncing
            ? 'Sincronizando…'
            : transaccionesConError > 0
              ? `${transaccionesConError} transacción(es) con error de sincronización: haz clic para ver y reintentar`
              : transaccionesPendientes > 0
                ? `${transaccionesPendientes} transacción(es) pendientes de sincronizar`
                : 'Todo está sincronizado'
        }
        className="relative flex items-center justify-center rounded-lg p-2 transition hover:bg-slate-50 disabled:cursor-not-allowed"
      >
        <Cloud
          size={20}
          className={
            isSyncing
              ? 'animate-spin text-blue-500'
              : transaccionesConError > 0
                ? 'text-red-500'
                : transaccionesPendientes > 0
                  ? 'text-amber-500'
                  : 'text-emerald-500'
          }
        />
        {!isSyncing && (transaccionesConError > 0 || transaccionesPendientes > 0) && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ${
              transaccionesConError > 0 ? 'bg-red-500' : 'bg-amber-500'
            }`}
          >
            {transaccionesConError > 0 ? transaccionesConError : transaccionesPendientes}
          </span>
        )}
      </button>

      {isPanelOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Ventas con error de sincronización</p>
            <button
              type="button"
              onClick={onForceSync}
              disabled={isSyncing}
              className="text-xs font-medium text-blue-600 transition hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Reintentar todo
            </button>
          </div>

          {ventasConError.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No hay ventas con error.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {ventasConError.map((venta) => (
                <li
                  key={venta.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{formatMoney(venta.total)}</p>
                    <p className="text-xs text-slate-500">{new Date(venta.fecha).toLocaleString('es-CO')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReintentar(venta.id)}
                    disabled={reintentandoId !== null}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCw size={14} className={reintentandoId === venta.id ? 'animate-spin' : undefined} />
                    Reintentar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
