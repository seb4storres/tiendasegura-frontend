import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CreditCard, HandCoins, ScanBarcode, Trash2, XCircle } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { formatMoney } from '../../../core/utils/money';

// Catálogo de demostración temporal: se reemplaza por
// productoService.buscarPorCodigoBarras cuando el módulo de Inventario
// quede conectado al backend.
const CATALOGO_DEMO: Record<string, { nombre: string; precio: number }> = {
  '7702001001621': { nombre: 'Coca-Cola 400ml', precio: 3000 },
  '7701234567890': { nombre: 'Pan Tajado', precio: 6500 },
  '7700000000001': { nombre: 'Arroz Diana 500g', precio: 2800 },
  '7700000000002': { nombre: 'Leche Alqueria 1L', precio: 4200 },
  '7700000000003': { nombre: 'Huevos AA x12', precio: 11500 },
};

export default function PosTerminalPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  const cartItems = useCartStore((state) => state.cartItems);
  const total = useCartStore((state) => state.total);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  function handleBarcodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codigo = barcode.trim();
    if (!codigo) return;

    const producto = CATALOGO_DEMO[codigo];
    if (producto) {
      addItem({ productoId: codigo, nombre: producto.nombre, precio: producto.precio });
      setNotFoundCode(null);
    } else {
      setNotFoundCode(codigo);
    }

    setBarcode('');
    inputRef.current?.focus();
  }

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
                      <td className="px-4 py-3 text-center text-slate-600">{item.cantidad}</td>
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
              disabled={cartItems.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <CreditCard size={20} />
              Cobrar (F12)
            </button>
            <button
              type="button"
              disabled={cartItems.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <HandCoins size={20} />
              Fiado (F9)
            </button>
            <button
              type="button"
              onClick={clearCart}
              disabled={cartItems.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <XCircle size={18} />
              Cancelar venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
