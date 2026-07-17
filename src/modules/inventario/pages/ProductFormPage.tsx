import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearProducto } from '../services/productoService';
import { useAuthStore } from '../../../core/store/useAuthStore';

export default function ProductFormPage() {
  const navigate = useNavigate();
  const tiendaId = useAuthStore((state) => state.tiendaId);

  const [codigoBarras, setCodigoBarras] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tiendaId || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await crearProducto(
        {
          codigoBarras: codigoBarras.trim(),
          nombre: nombre.trim(),
          precioVenta: Number(precio),
          stockInicial: Number(stock),
        },
        tiendaId,
      );
      alert('Producto creado correctamente');
      navigate('/inventario');
    } catch {
      setError('No se pudo crear el producto. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Nuevo producto</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label htmlFor="codigoBarras" className="mb-1 block text-sm font-medium text-slate-700">
            Código de barras
          </label>
          <input
            id="codigoBarras"
            autoFocus
            required
            value={codigoBarras}
            onChange={(event) => setCodigoBarras(event.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-slate-700">
            Nombre
          </label>
          <input
            id="nombre"
            required
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="precio" className="mb-1 block text-sm font-medium text-slate-700">
              Precio
            </label>
            <input
              id="precio"
              type="number"
              min="0"
              step="1"
              required
              value={precio}
              onChange={(event) => setPrecio(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="stock" className="mb-1 block text-sm font-medium text-slate-700">
              Stock inicial
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              step="1"
              required
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/inventario')}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  );
}
