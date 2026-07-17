import axios from 'axios';
import { apiClient } from './apiClient';
import { db } from '../db/dexieInstance';
import type { MetodoPago } from '../db/tables';

interface VentaItemRequest {
  productoId: string;
  cantidad: number;
  precioUnitarioSnapshot: number;
}

// Shape real confirmado contra el backend: el arreglo de líneas se llama
// `items` (no `detalles`), y los pagos en EFECTIVO exigen `montoRecibido`
// para que el backend calcule el vuelto. La UI todavía no le pregunta al
// cajero cuánto efectivo recibió del cliente, así que por ahora se asume
// pago exacto (sin vuelto) — falta construir esa pantalla en el checkout.
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
        montoRecibido: venta.metodoPago === 'EFECTIVO' ? venta.total : undefined,
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

// Punto de entrada único para useNetworkSync: sube ventas primero y luego
// abonos (los abonos son pagos sobre ventas ya fiadas, tiene sentido que el
// backend vea primero la venta que originó la deuda).
export async function procesarTodoPendiente(): Promise<void> {
  await procesarVentasPendientes();
  await procesarAbonosPendientes();
}
