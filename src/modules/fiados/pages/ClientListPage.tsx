import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../core/db/dexieInstance';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { formatMoney } from '../../../core/utils/money';

export default function ClientListPage() {
  const navigate = useNavigate();
  const tiendaId = useAuthStore((state) => state.tiendaId);

  const clientes =
    useLiveQuery(
      () => (tiendaId ? db.clientes.where('tiendaId').equals(tiendaId).toArray() : []),
      [tiendaId],
    ) ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Cartera</h1>

      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {clientes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <p className="text-sm">Todavía no hay clientes registrados.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3 text-right">Deuda</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="text-sm">
                  <td className="px-4 py-3 font-medium text-slate-900">{cliente.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{cliente.telefono ?? '—'}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      cliente.saldoActual > 0 ? 'text-red-600' : 'text-slate-600'
                    }`}
                  >
                    {formatMoney(cliente.saldoActual)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/cartera/${cliente.id}`)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                      Ver / Cobrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
