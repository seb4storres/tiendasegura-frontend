import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { formatMoney } from '../../../core/utils/money';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  total: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (montoRecibido: number) => void;
}

const BILLETES_RAPIDOS = [10000, 20000, 50000];

export default function PaymentConfirmationModal({
  isOpen,
  total,
  isSubmitting,
  onClose,
  onConfirm,
}: PaymentConfirmationModalProps) {
  const [montoRecibido, setMontoRecibido] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Precargado con el total exacto y seleccionado: Enter de una cobra el
    // pago exacto, o el cajero escribe encima si el cliente pagó con otro billete.
    setMontoRecibido(String(total));
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, total]);

  if (!isOpen) return null;

  const montoNumerico = Number(montoRecibido) || 0;
  const cambio = montoNumerico - total;
  const esSuficiente = montoNumerico >= total;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!esSuficiente || isSubmitting) return;
    onConfirm(montoNumerico);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Confirmar pago</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-5 text-center">
            <p className="text-sm font-medium text-slate-500">Total a pagar</p>
            <p className="text-4xl font-bold text-slate-900">{formatMoney(total)}</p>
          </div>

          <label htmlFor="montoRecibido" className="mb-1 block text-sm font-medium text-slate-700">
            Monto recibido
          </label>
          <input
            id="montoRecibido"
            ref={inputRef}
            type="number"
            min="0"
            step="1"
            value={montoRecibido}
            onChange={(event) => setMontoRecibido(event.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMontoRecibido(String(total))}
              disabled={isSubmitting}
              className="min-h-11 rounded-lg border border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Pago exacto
            </button>
            {BILLETES_RAPIDOS.map((billete) => (
              <button
                key={billete}
                type="button"
                onClick={() => setMontoRecibido(String(billete))}
                disabled={isSubmitting}
                className="min-h-11 rounded-lg border border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed"
              >
                {formatMoney(billete)}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-sm font-medium text-slate-500">Cambio a entregar</p>
            <p className={`text-3xl font-bold ${esSuficiente ? 'text-emerald-600' : 'text-red-600'}`}>
              {esSuficiente ? formatMoney(cambio) : 'Monto insuficiente'}
            </p>
          </div>

          <button
            type="submit"
            disabled={!esSuficiente || isSubmitting}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isSubmitting ? 'Guardando…' : 'Confirmar pago (Enter)'}
          </button>
        </form>
      </div>
    </div>
  );
}
