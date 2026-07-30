import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../../core/db/dexieInstance';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { formatMoney } from '../../../core/utils/money';
import { registrarAbono } from '../services/fiadoService';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);

  const cliente = useLiveQuery(() => (id ? db.clientes.get(id) : undefined), [id]);

  const [monto, setMonto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !usuario || isSubmitting) return;

    const montoNumerico = Number(monto);
    if (!montoNumerico || montoNumerico <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await registrarAbono(id, montoNumerico, usuario.id);
      setMonto('');
      toast.success('Abono registrado correctamente');
    } catch {
      setError('No se pudo registrar el abono. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!cliente) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
        <p>Cliente no encontrado.</p>
        <button type="button" onClick={() => navigate('/cartera')} className="text-blue-600 hover:underline">
          Volver a Cartera
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        type="button"
        onClick={() => navigate('/cartera')}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Volver a Cartera
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">{cliente.nombre}</h1>
        <p className="text-sm text-slate-500">{cliente.telefono ?? 'Sin teléfono registrado'}</p>

        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-center">
          <p className="text-sm font-medium text-slate-500">Deuda actual</p>
          <p className={`text-4xl font-bold ${cliente.saldoActual > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatMoney(cliente.saldoActual)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label htmlFor="monto" className="block text-sm font-medium text-slate-700">
            Registrar abono
          </label>
          <div className="flex gap-2">
            <input
              id="monto"
              type="number"
              min="1"
              step="1"
              autoFocus
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              disabled={isSubmitting}
              placeholder="Monto a abonar"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              {isSubmitting ? 'Guardando…' : 'Registrar abono'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}
