import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { calcularIvaIncluido, formatMoney } from '../../../core/utils/money';
import type { MetodoPago } from '../../../core/db/tables';

// El checkout solo cobra por estos tres medios; FIADO tiene su propio flujo
// (ClientSelectionModal) y nunca pasa por este modal.
export type MetodoPagoCheckout = Extract<MetodoPago, 'EFECTIVO' | 'BANCOLOMBIA' | 'DAVIPLATA'>;

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  total: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (metodoPago: MetodoPagoCheckout, montoRecibido: number) => void;
}

const BILLETES_RAPIDOS = [10000, 20000, 50000];

const METODOS_PAGO: Array<{ value: MetodoPagoCheckout; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'BANCOLOMBIA', label: 'Bancolombia' },
  { value: 'DAVIPLATA', label: 'Daviplata' },
];

export default function PaymentConfirmationModal({
  isOpen,
  total,
  isSubmitting,
  onClose,
  onConfirm,
}: PaymentConfirmationModalProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPagoCheckout>('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMetodoPago('EFECTIVO');
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

  const esEfectivo = metodoPago === 'EFECTIVO';
  // Los métodos electrónicos siempre se cobran por el total exacto: no hay
  // "vuelto" que entregar en una transferencia.
  const montoNumerico = esEfectivo ? Number(montoRecibido) || 0 : total;
  const cambio = montoNumerico - total;
  const esSuficiente = montoNumerico >= total;
  const iva = calcularIvaIncluido(total);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!esSuficiente || isSubmitting) return;
    onConfirm(metodoPago, montoNumerico);
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

          <label htmlFor="metodoPago" className="mb-1 block text-sm font-medium text-slate-700">
            Método de pago
          </label>
          <select
            id="metodoPago"
            value={metodoPago}
            onChange={(event) => setMetodoPago(event.target.value as MetodoPagoCheckout)}
            disabled={isSubmitting}
            className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
          >
            {METODOS_PAGO.map((metodo) => (
              <option key={metodo.value} value={metodo.value}>
                {metodo.label}
              </option>
            ))}
          </select>

          {esEfectivo && (
            <>
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
            </>
          )}

          <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-500">IVA incluido (19%)</span>
            <span className="text-sm font-semibold text-slate-700">{formatMoney(iva)}</span>
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
