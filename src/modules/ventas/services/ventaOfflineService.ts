import { db } from '../../../core/db/dexieInstance';
import { generateUuid } from '../../../core/utils/uuid';
import type { CartItem } from '../store/useCartStore';
import type { MetodoPago } from '../../../core/db/tables';

interface RegistrarVentaParams {
  items: CartItem[];
  total: number;
  tiendaId: string;
  usuarioId: string;
  metodoPago: MetodoPago;
  // Solo se envía (y solo tiene sentido) cuando metodoPago === 'FIADO'.
  clienteId?: string;
}

// Guarda la venta de forma local (IndexedDB) con syncStatus 'pending', sin
// importar el método de pago. El id de la venta y de cada detalle se generan
// aquí mismo (UUID) y viajan tal cual al backend cuando la cola de
// sincronización los suba: esa es la clave de idempotencia que evita
// duplicar cobros/stock en la estrategia append-only.
export async function registrarVenta({
  items,
  total,
  tiendaId,
  usuarioId,
  metodoPago,
  clienteId,
}: RegistrarVentaParams): Promise<string> {
  const ventaId = generateUuid();
  const fecha = new Date().toISOString();

  await db.transaction('rw', db.ventas, db.detalleVentas, async () => {
    await db.ventas.add({
      id: ventaId,
      tiendaId,
      usuarioId,
      clienteId,
      fecha,
      total,
      metodoPago,
      estado: 'COMPLETADA',
      syncStatus: 'pending',
      createdAt: fecha,
    });

    await db.detalleVentas.bulkAdd(
      items.map((item) => ({
        id: generateUuid(),
        ventaId,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitarioSnapshot: item.precio,
        subtotal: item.subtotal,
      })),
    );
  });

  return ventaId;
}
