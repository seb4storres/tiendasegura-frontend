import { db } from '../../../core/db/dexieInstance';
import { generateUuid } from '../../../core/utils/uuid';
import type { CartItem } from '../store/useCartStore';

interface RegistrarVentaEfectivoParams {
  items: CartItem[];
  total: number;
  tiendaId: string;
  usuarioId: string;
}

// Guarda la venta en efectivo de forma local (IndexedDB) con syncStatus 'pending'.
// El id de la venta y de cada detalle se generan aquí mismo (UUID) y viajan tal
// cual al backend cuando la cola de sincronización los suba: esa es la clave de
// idempotencia que evita duplicar cobros/stock en la estrategia append-only.
export async function registrarVentaEfectivo({
  items,
  total,
  tiendaId,
  usuarioId,
}: RegistrarVentaEfectivoParams): Promise<string> {
  const ventaId = generateUuid();
  const fecha = new Date().toISOString();

  await db.transaction('rw', db.ventas, db.detalleVentas, async () => {
    await db.ventas.add({
      id: ventaId,
      tiendaId,
      usuarioId,
      fecha,
      total,
      metodoPago: 'EFECTIVO',
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
