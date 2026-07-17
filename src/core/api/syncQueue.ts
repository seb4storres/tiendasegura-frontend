import axios from 'axios';
import { apiClient } from './apiClient';
import { db } from '../db/dexieInstance';
import type { ClienteRow, MetodoPago } from '../db/tables';

interface VentaItemRequest {
  productoId: string;
  cantidad: number;
  precioUnitarioSnapshot: number;
}

// Shape real confirmado contra el backend: el arreglo de líneas se llama
// `items` (no `detalles`), y los pagos en EFECTIVO exigen `montoRecibido`
// para que el backend calcule el vuelto.
interface VentaRequest {
  id: string;
  fecha: string;
  metodoPago: MetodoPago;
  clienteId?: string;
  montoRecibido?: number;
  items: VentaItemRequest[];
}

// Debe coincidir con AbonoRequest.java del backend (fiado/infrastructure/dto).
interface AbonoRequest {
  id: string;
  clienteId: string;
  monto: number;
  fecha: string;
}

// Shape real confirmado contra el backend. A diferencia de ventas/abonos,
// /clientes no recibe un `id` — el backend siempre asigna el suyo.
interface ClienteRequest {
  nombre: string;
  telefono?: string;
  limiteCredito: number;
}

interface ClienteApiResponse {
  id: string;
  tiendaId: string;
  nombre: string;
  telefono?: string;
  limiteCredito: number;
  saldoActual: number;
  estado: string;
  version: number;
}

export interface ProcesarColaResultado {
  enviadas: number;
  fallidas: number;
}

// Envía cada item pendiente al backend y resuelve su estado según la
// respuesta. Compartido por ventas y abonos: ambos son colas append-only
// idempotentes por UUID, así que las 3 reglas son siempre las mismas —
// éxito o 409 (ya sincronizado antes) → 'synced'; rechazo real del
// servidor (4xx/5xx distinto de 409) → 'error', no tiene caso reintentarlo
// solo; sin `error.response` (sin conexión) → se deja 'pending'.
async function procesarCola<T>(
  pendientes: T[],
  enviar: (item: T) => Promise<unknown>,
  marcarSincronizado: (item: T) => Promise<unknown>,
  marcarError: (item: T) => Promise<unknown>,
): Promise<ProcesarColaResultado> {
  let enviadas = 0;
  let fallidas = 0;

  for (const item of pendientes) {
    try {
      await enviar(item);
      await marcarSincronizado(item);
      enviadas += 1;
      continue;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        await marcarSincronizado(item);
        enviadas += 1;
        continue;
      }

      if (axios.isAxiosError(error) && error.response) {
        await marcarError(item);
      }
      fallidas += 1;
    }
  }

  return { enviadas, fallidas };
}

// Sube al backend las ventas guardadas offline con syncStatus 'pending'.
// El id de la venta viaja tal cual se generó en el cliente: es la clave de
// idempotencia que usa RegistrarVentaUseCase para no duplicar cobro/stock si
// esta función corre más de una vez sobre la misma venta (reconexiones
// intermitentes, doble clic en "sincronizar", etc.).
export async function procesarVentasPendientes(): Promise<ProcesarColaResultado> {
  const pendientes = await db.ventas.where('syncStatus').equals('pending').toArray();

  return procesarCola(
    pendientes,
    async (venta) => {
      const detalles = await db.detalleVentas.where('ventaId').equals(venta.id).toArray();
      const payload: VentaRequest = {
        id: venta.id,
        fecha: venta.fecha,
        metodoPago: venta.metodoPago,
        clienteId: venta.clienteId,
        // Fallback a `total` (pago exacto) para ventas guardadas antes de
        // que el checkout empezara a capturar el monto recibido real.
        montoRecibido: venta.metodoPago === 'EFECTIVO' ? (venta.montoRecibido ?? venta.total) : undefined,
        items: detalles.map((detalle) => ({
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precioUnitarioSnapshot: detalle.precioUnitarioSnapshot,
        })),
      };
      await apiClient.post('/ventas', payload);
    },
    (venta) => db.ventas.update(venta.id, { syncStatus: 'synced' }),
    (venta) => db.ventas.update(venta.id, { syncStatus: 'error' }),
  );
}

// Mismo principio que procesarVentasPendientes, pero para los abonos que el
// cajero registra en el módulo de Cartera.
export async function procesarAbonosPendientes(): Promise<ProcesarColaResultado> {
  const pendientes = await db.abonos.where('syncStatus').equals('pending').toArray();

  return procesarCola(
    pendientes,
    async (abono) => {
      const payload: AbonoRequest = {
        id: abono.id,
        clienteId: abono.clienteId,
        monto: abono.monto,
        fecha: abono.fecha,
      };
      await apiClient.post('/abonos', payload);
    },
    (abono) => db.abonos.update(abono.id, { syncStatus: 'synced' }),
    (abono) => db.abonos.update(abono.id, { syncStatus: 'error' }),
  );
}

// Sube los clientes creados offline. No puede reusar procesarCola: a
// diferencia de ventas/abonos, el backend ignora cualquier id que le
// mandemos y siempre genera el suyo — así que cada cliente sincronizado
// necesita reemplazar su id temporal local por el real, en cascada sobre
// cualquier venta/abono que ya lo esté referenciando. Si no se hiciera esto,
// esos registros quedarían apuntando a un clienteId que no existe en
// ningún lado (ni local ni en el backend): exactamente la violación de
// llave foránea que este flujo previene.
export async function procesarClientesPendientes(): Promise<ProcesarColaResultado> {
  const pendientes = await db.clientes.where('syncStatus').equals('pending').toArray();

  let enviadas = 0;
  let fallidas = 0;

  for (const cliente of pendientes) {
    const payload: ClienteRequest = {
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      limiteCredito: cliente.limiteCredito,
    };

    try {
      const { data } = await apiClient.post<ClienteApiResponse>('/clientes', payload);
      await reemplazarIdClienteLocal(cliente, data);
      enviadas += 1;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        await db.clientes.update(cliente.id, { syncStatus: 'error' });
      }
      // Sin `error.response` (sin conexión) se deja 'pending' para reintentar.
      fallidas += 1;
    }
  }

  return { enviadas, fallidas };
}

// Recibe el cliente LOCAL (no solo su id): su `saldoActual` puede ya
// reflejar ventas fiadas que todavía no se sincronizaron (procesarVentasPendientes
// corre después), así que se preserva ese valor en vez de usar el
// `saldoActual` que trae la respuesta del backend (siempre 0 en un cliente
// recién creado, porque el backend todavía no vio esas ventas pendientes).
async function reemplazarIdClienteLocal(clienteLocal: ClienteRow, real: ClienteApiResponse): Promise<void> {
  await db.transaction('rw', db.clientes, db.ventas, db.abonos, async () => {
    await db.clientes.add({
      id: real.id,
      tiendaId: real.tiendaId,
      nombre: real.nombre,
      telefono: real.telefono,
      limiteCredito: real.limiteCredito,
      saldoActual: clienteLocal.saldoActual,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    });
    await db.clientes.delete(clienteLocal.id);

    await db.ventas.where('clienteId').equals(clienteLocal.id).modify({ clienteId: real.id });
    await db.abonos.where('clienteId').equals(clienteLocal.id).modify({ clienteId: real.id });
  });
}

// Punto de entrada único para useNetworkSync: clientes primero (para que
// cualquier venta/abono fiado a un cliente nuevo tenga ya el id real del
// backend antes de intentar subirse), después ventas, después abonos.
export async function procesarTodoPendiente(): Promise<void> {
  await procesarClientesPendientes();
  await procesarVentasPendientes();
  await procesarAbonosPendientes();
}

// "Eager sync": lo llaman los servicios de creación (ventaOfflineService,
// clienteService, fiadoService) justo después de que su transacción local
// termina con éxito. No se espera (fire-and-forget) para no retrasar la
// respuesta al cajero — la nube pasa a verde sola en cuanto termina, sin
// que nadie tenga que hacer clic. Si no hay conexión no hace nada; el
// evento 'online' de useNetworkSync se encarga de reintentar más tarde.
export function dispararSincronizacionSiHayConexion(): void {
  if (!navigator.onLine) return;

  procesarTodoPendiente().catch((error) => {
    console.error('Fallo la sincronización automática:', error);
  });
}
