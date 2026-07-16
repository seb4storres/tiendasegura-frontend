import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../core/db/dexieInstance';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { formatMoney } from '../../../core/utils/money';

export default function ProductListPage() {
  const navigate = useNavigate();
  const tiendaId = useAuthStore((state) => state.tiendaId);

  const productos =
    useLiveQuery(
      () => (tiendaId ? db.productos.where('tiendaId').equals(tiendaId).toArray() : []),
      [tiendaId],
    ) ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Inventario</h1>
        <button
          type="button"
          onClick={() => navigate('/inventario/nuevo')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Nuevo producto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {productos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <p className="text-sm">Todavía no hay productos en el catálogo.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código de barras</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map((producto) => (
                <tr key={producto.id} className="text-sm">
                  <td className="px-4 py-3 text-slate-600">{producto.codigoBarras}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{producto.nombre}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatMoney(producto.precio)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{producto.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
