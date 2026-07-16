import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, X } from 'lucide-react';
import { db } from '../../../core/db/dexieInstance';
import type { ClienteRow } from '../../../core/db/tables';
import { formatMoney } from '../../../core/utils/money';

interface ClientSelectionModalProps {
  isOpen: boolean;
  tiendaId: string;
  onClose: () => void;
  onSelect: (cliente: ClienteRow) => void;
}

export default function ClientSelectionModal({
  isOpen,
  tiendaId,
  onClose,
  onSelect,
}: ClientSelectionModalProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const clientes =
    useLiveQuery(async () => {
      const termino = search.trim().toLowerCase();
      const todos = await db.clientes.where('tiendaId').equals(tiendaId).toArray();
      return termino ? todos.filter((cliente) => cliente.nombre.toLowerCase().includes(termino)) : todos;
    }, [tiendaId, search]) ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (clientes[0]) {
      onSelect(clientes[0]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Seleccionar cliente</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              ref={inputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente por nombre..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </form>

        <ul className="flex-1 overflow-y-auto px-2 py-3">
          {clientes.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-slate-400">No se encontraron clientes.</li>
          ) : (
            clientes.map((cliente) => (
              <li key={cliente.id}>
                <button
                  type="button"
                  onClick={() => onSelect(cliente)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{cliente.nombre}</span>
                    {cliente.telefono && (
                      <span className="block text-xs text-slate-500">{cliente.telefono}</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">Saldo: {formatMoney(cliente.saldoActual)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
