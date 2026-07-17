import { apiClient } from '../../../core/api/apiClient';
import { db } from '../../../core/db/dexieInstance';
import type { ProductoRow } from '../../../core/db/tables';
import type { ProductoApiResponse } from '../types';

// Shape real confirmado contra el backend: `precioVenta` y `stockInicial`,
// no `precio`/`stock` (esos son los nombres de campo en la RESPUESTA, no en
// lo que acepta la creación).
export interface CrearProductoData {
  codigoBarras: string;
  nombre: string;
  precioVenta: number;
  stockInicial: number;
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
    precio: producto.precioVenta,
    costo: producto.precioCompra,
    stock: producto.stock,
    version: producto.version,
    syncStatus: 'synced',
    updatedAt: new Date().toISOString(),
  };

  await db.productos.put(row);
  return row;
}
