import axios from 'axios';
import { apiClient } from './apiClient';
import { db } from '../db/dexieInstance';
import type { MetodoPago } from '../db/tables';

interface DetalleVentaRequest {
  productoId: string;
  cantidad: number;
  precioUnitarioSnapshot: number;
}

// Debe coincidir con VentaRequest.java del backend (venta/infrastructure/dto).
interface VentaRequest {
  id: string;
  fecha: string;
  metodoPago: MetodoPago;
  clienteId?: string;
  detalles: DetalleVentaRequest[];
}

export interface ProcesarVentasResultado {
  enviadas: number;
  fallidas: number;
}

// Sube al backend las ventas guardadas offline con syncStatus 'pending'.
// El id de la venta viaja tal cual se generó en el cliente: es la clave de
// idempotencia que usa RegistrarVentaUseCase para no duplicar cobro/stock si
// esta función corre más de una vez sobre la misma venta (reconexiones
// intermitentes, doble clic en "sincronizar", etc.).
export async function procesarVentasPendientes(): Promise<ProcesarVentasResultado> {
  const pendientes = await db.ventas.where('syncStatus').equals('pending').toArray();

  let enviadas = 0;
  let fallidas = 0;

  for (const venta of pendientes) {
    const detalles = await db.detalleVentas.where('ventaId').equals(venta.id).toArray();

    const payload: VentaRequest = {
      id: venta.id,
      fecha: venta.fecha,
      metodoPago: venta.metodoPago,
      clienteId: venta.clienteId,
      detalles: detalles.map((detalle) => ({
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
        precioUnitarioSnapshot: detalle.precioUnitarioSnapshot,
      })),
    };

    try {
      await apiClient.post('/ventas', payload);
      await db.ventas.update(venta.id, { syncStatus: 'synced' });
      enviadas += 1;
      continue;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        // La venta ya había sido registrada en un intento anterior: la
        // idempotencia por UUID hizo su trabajo, se da por sincronizada.
        await db.ventas.update(venta.id, { syncStatus: 'synced' });
        enviadas += 1;
        continue;
      }

      if (axios.isAxiosError(error) && error.response) {
        // El backend respondió pero rechazó la venta (4xx/5xx distinto de
        // 409): reintentarla sola no va a cambiar el resultado.
        await db.ventas.update(venta.id, { syncStatus: 'error' });
      }
      // Sin `error.response` = no hay conexión: se deja 'pending' para que
      // el próximo evento 'online' (o sincronización manual) la reintente.
      fallidas += 1;
    }
  }

  return { enviadas, fallidas };
}
