import { apiClient } from '../../../core/api/apiClient';
import { db } from '../../../core/db/dexieInstance';
import type { ProductoRow } from '../../../core/db/tables';
import type { ProductoApiResponse } from '../types';

// Debe coincidir con ProductoRequest.java del backend (inventario/infrastructure/dto).
export interface CrearProductoData {
  codigoBarras: string;
  nombre: string;
  precio: number;
  stock: number;
}

// Crea el producto en el backend y, apenas responde 201, lo guarda en Dexie
// de inmediato: la caja puede venderlo al toque sin esperar una
// sincronización completa del catálogo.
export async function crearProducto(data: CrearProductoData, tiendaId: string): Promise<ProductoRow> {
  const { data: producto } = await apiClient.post<ProductoApiResponse>('/productos', data);

  const row: ProductoRow = {
    id: producto.id,
    tiendaId,
    codigoBarras: producto.codigoBarras,
    nombre: producto.nombre,
    precio: producto.precio,
    costo: producto.costo,
    stock: producto.stock,
    categoria: producto.categoria,
    version: producto.version,
    syncStatus: 'synced',
    updatedAt: new Date().toISOString(),
  };

  await db.productos.put(row);
  return row;
}
