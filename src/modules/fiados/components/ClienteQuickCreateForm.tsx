import { useState } from 'react';
import type { FormEvent } from 'react';
import { registrarCliente } from '../services/clienteService';
import type { ClienteRow } from '../../../core/db/tables';

interface ClienteQuickCreateFormProps {
  tiendaId: string;
  onCreated: (cliente: ClienteRow) => void;
  onCancel: () => void;
}

// Formulario mínimo reutilizado tanto en el modal de Fiado de la caja como
// en la página de Cartera: crea el cliente localmente (offline-first, vía
// clienteService) y avisa al padre apenas queda guardado, sin esperar a
// que se sincronice con el backend.
export default function ClienteQuickCreateForm({ tiendaId, onCreated, onCancel }: ClienteQuickCreateFormProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      setError('El nombre es obligatorio.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const cliente = await registrarCliente({
        tiendaId,
        nombre: nombreTrim,
        telefono: telefono.trim() || undefined,
        limiteCredito: Number(limiteCredito) || 0,
      });
      onCreated(cliente);
    } catch {
      setError('No se pudo guardar el cliente. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <label htmlFor="clienteNombre" className="mb-1 block text-sm font-medium text-slate-700">
          Nombre
        </label>
        <input
          id="clienteNombre"
          autoFocus
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
          placeholder="Nombre del cliente"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="clienteTelefono" className="mb-1 block text-sm font-medium text-slate-700">
            Teléfono
          </label>
          <input
            id="clienteTelefono"
            value={telefono}
            onChange={(event) => setTelefono(event.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            placeholder="Opcional"
          />
        </div>
        <div>
          <label htmlFor="clienteLimite" className="mb-1 block text-sm font-medium text-slate-700">
            Límite de crédito
          </label>
          <input
            id="clienteLimite"
            type="number"
            min="0"
            step="1"
            value={limiteCredito}
            onChange={(event) => setLimiteCredito(event.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            placeholder="0"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? 'Guardando…' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
