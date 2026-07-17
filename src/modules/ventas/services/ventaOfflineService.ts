import { db } from '../../../core/db/dexieInstance';
import { generateUuid } from '../../../core/utils/uuid';
import type { CartItem } from '../store/useCartStore';
import type { MetodoPago } from '../../../core/db/tables';
import { estaConectada, imprimir } from '../../../core/printer/serialPrinter';
import { construirRecibo } from '../../../core/printer/receiptBuilder';

interface RegistrarVentaParams {
  items: CartItem[];
  total: number;
  tiendaId: string;
  usuarioId: string;
  metodoPago: MetodoPago;
  // Solo se envía (y solo tiene sentido) cuando metodoPago === 'FIADO'.
  clienteId?: string;
  // Solo se envía (y solo tiene sentido) cuando metodoPago === 'EFECTIVO'.
  montoRecibido?: number;
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
  montoRecibido,
}: RegistrarVentaParams): Promise<string> {
  const ventaId = generateUuid();
  const fecha = new Date().toISOString();

  await db.transaction('rw', db.ventas, db.detalleVentas, db.clientes, async () => {
    await db.ventas.add({
      id: ventaId,
      tiendaId,
      usuarioId,
      clienteId,
      fecha,
      total,
      metodoPago,
      montoRecibido,
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

    // Una venta FIADO es deuda nueva: sin esto, la "Deuda actual" de Cartera
    // nunca subiría con las compras, solo bajaría con los abonos.
    if (clienteId) {
      const cliente = await db.clientes.get(clienteId);
      if (cliente) {
        await db.clientes.update(clienteId, {
          saldoActual: cliente.saldoActual + total,
          updatedAt: fecha,
        });
      }
    }
  });

  await imprimirReciboSiHayImpresora({ items, total, tiendaId, fecha, metodoPago, montoRecibido });

  return ventaId;
}

// La impresión es un efecto secundario "best effort": la venta ya quedó
// guardada en Dexie, así que un jam de papel, una impresora sin conectar o
// cualquier falla de imprimir() nunca debe hacer parecer que la venta se
// perdió. Se atrapa cualquier error y solo se deja constancia en consola.
async function imprimirReciboSiHayImpresora(params: {
  items: CartItem[];
  total: number;
  tiendaId: string;
  fecha: string;
  metodoPago: MetodoPago;
  montoRecibido?: number;
}): Promise<void> {
  if (!estaConectada()) return;

  try {
    const tienda = await db.tiendas.get(params.tiendaId);
    const recibo = construirRecibo({
      tiendaNombre: tienda?.nombre ?? 'TiendaSegura POS',
      fecha: params.fecha,
      metodoPago: params.metodoPago,
      total: params.total,
      montoRecibido: params.montoRecibido,
      items: params.items.map((item) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
      })),
    });
    await imprimir(recibo);
  } catch (error) {
    console.error('No se pudo imprimir el recibo:', error);
  }
}
