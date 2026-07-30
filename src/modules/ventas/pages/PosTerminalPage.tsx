import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { CreditCard, HandCoins, Minus, Plus, ScanBarcode, Trash2, XCircle } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { registrarVenta } from '../services/ventaOfflineService';
import ClientSelectionModal from '../components/ClientSelectionModal';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import { formatMoney } from '../../../core/utils/money';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { db } from '../../../core/db/dexieInstance';
import type { ClienteRow } from '../../../core/db/tables';

// Ventana de gracia del botón "Cancelar venta": el primer toque solo arma
// la confirmación, hay que tocar de nuevo dentro de este margen para que
// realmente se borre el carrito.
const VENTANA_CONFIRMACION_MS = 3000;

export default function PosTerminalPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFiadoModalOpen, setIsFiadoModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const cancelarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartItems = useCartStore((state) => state.cartItems);
  const total = useCartStore((state) => state.total);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const actualizarCantidad = useCartStore((state) => state.actualizarCantidad);
  const clearCart = useCartStore((state) => state.clearCart);

  const tiendaId = useAuthStore((state) => state.tiendaId);
  const usuario = useAuthStore((state) => state.usuario);

  async function handleBarcodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codigo = barcode.trim();
    if (!codigo || !tiendaId) return;

    const producto = await db.productos
      .where('[tiendaId+codigoBarras]')
      .equals([tiendaId, codigo])
      .first();

    if (producto) {
      addItem({ productoId: producto.id, nombre: producto.nombre, precio: producto.precio });
      setNotFoundCode(null);
    } else {
      setNotFoundCode(codigo);
    }

    setBarcode('');
    inputRef.current?.focus();
  }

  function handleCobrar() {
    if (cartItems.length === 0 || isSubmitting || isFiadoModalOpen || isPaymentModalOpen) return;
    setIsPaymentModalOpen(true);
  }

  async function handleConfirmarPago(montoRecibido: number) {
    if (!tiendaId || !usuario) return;

    setIsSubmitting(true);
    try {
      await registrarVenta({
        items: cartItems,
        total,
        tiendaId,
        usuarioId: usuario.id,
        metodoPago: 'EFECTIVO',
        montoRecibido,
      });
      setIsPaymentModalOpen(false);
      clearCart();
      toast.success(`Venta registrada localmente. Vuelto: ${formatMoney(montoRecibido - total)}`);
    } catch {
      toast.error('No se pudo registrar la venta. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }

  function handleFiado() {
    if (cartItems.length === 0 || isPaymentModalOpen) return;
    setIsFiadoModalOpen(true);
  }

  async function handleSelectCliente(cliente: ClienteRow) {
    if (!tiendaId || !usuario) return;

    setIsFiadoModalOpen(false);
    try {
      await registrarVenta({
        items: cartItems,
        total,
        tiendaId,
        usuarioId: usuario.id,
        metodoPago: 'FIADO',
        clienteId: cliente.id,
      });
      clearCart();
      toast.success(`Venta fiada registrada para ${cliente.nombre}`);
    } catch {
      toast.error('No se pudo registrar la venta fiada. Intenta de nuevo.');
    } finally {
      inputRef.current?.focus();
    }
  }

  function handleCancelarVenta() {
    if (cartItems.length === 0) return;

    if (!confirmandoCancelar) {
      setConfirmandoCancelar(true);
      cancelarTimeoutRef.current = setTimeout(() => setConfirmandoCancelar(false), VENTANA_CONFIRMACION_MS);
      return;
    }

    if (cancelarTimeoutRef.current) clearTimeout(cancelarTimeoutRef.current);
    setConfirmandoCancelar(false);
    clearCart();
    toast('Venta cancelada');
  }

  useEffect(() => {
    return () => {
      if (cancelarTimeoutRef.current) clearTimeout(cancelarTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'F12') {
        event.preventDefault();
        handleCobrar();
      } else if (event.key === 'F9') {
        event.preventDefault();
        handleFiado();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, isSubmitting, isFiadoModalOpen, isPaymentModalOpen]);

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Terminal de Ventas</h1>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex w-[70%] flex-col gap-4">
          <form onSubmit={handleBarcodeSubmit}>
            <label htmlFor="barcode" className="mb-1 block text-sm font-medium text-slate-700">
              Código de barras
            </label>
            <div className="relative">
              <ScanBarcode
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={24}
              />
              <input
                id="barcode"
                ref={inputRef}
                autoFocus
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="Escanea o escribe el código..."
                className="w-full rounded-xl border border-slate-300 bg-white py-4 pl-12 pr-4 text-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            {notFoundCode && (
              <p className="mt-1 text-sm text-red-600">
                No se encontró ningún producto con el código "{notFoundCode}".
              </p>
            )}
          </form>

          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-slate-400">
                <ScanBarcode size={40} />
                <p className="text-sm">Escanea un producto para iniciar la venta</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 text-xs font-medium uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-center">Cant.</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.map((item) => (
                    <tr key={item.productoId} className="text-sm">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.nombre}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                            aria-label={`Reducir cantidad de ${item.nombre}`}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-slate-900">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                            aria-label={`Aumentar cantidad de ${item.nombre}`}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatMoney(item.precio)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatMoney(item.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productoId)}
                          aria-label={`Quitar ${item.nombre}`}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex w-[30%] flex-col rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total a pagar</p>
          <p className="mb-6 text-4xl font-bold text-slate-900">{formatMoney(total)}</p>

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCobrar}
              disabled={cartItems.length === 0 || isSubmitting || isPaymentModalOpen}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <CreditCard size={20} />
              Cobrar (F12)
            </button>
            <button
              type="button"
              onClick={handleFiado}
              disabled={cartItems.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <HandCoins size={20} />
              Fiado (F9)
            </button>
            <button
              type="button"
              onClick={handleCancelarVenta}
              disabled={cartItems.length === 0}
              className={
                confirmandoCancelar
                  ? 'flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700'
                  : 'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300'
              }
            >
              <XCircle size={18} />
              {confirmandoCancelar ? 'Confirmar borrado' : 'Cancelar venta'}
            </button>
          </div>
        </div>
      </div>

      {tiendaId && (
        <ClientSelectionModal
          isOpen={isFiadoModalOpen}
          tiendaId={tiendaId}
          onClose={() => setIsFiadoModalOpen(false)}
          onSelect={handleSelectCliente}
        />
      )}

      <PaymentConfirmationModal
        isOpen={isPaymentModalOpen}
        total={total}
        isSubmitting={isSubmitting}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmarPago}
      />
    </div>
  );
}
