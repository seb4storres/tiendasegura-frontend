import { apiClient } from '../../../core/api/apiClient';
import { db } from '../../../core/db/dexieInstance';
import type { ProductoRow } from '../../../core/db/tables';
import type { ProductoApiResponse } from '../types';

// Descarga el catálogo completo del backend (ya viene filtrado por tienda vía
// el JWT + RLS) y lo vuelca en Dexie con `bulkPut`: inserta lo nuevo y
// sobreescribe lo existente por `id`, dejando la lectura del escáner 100% local.
export async function sincronizarCatalogoProductos(tiendaId: string): Promise<number> {
  const { data } = await apiClient.get<ProductoApiResponse[]>('/productos');
  const updatedAt = new Date().toISOString();

  const rows: ProductoRow[] = data.map((producto) => ({
    id: producto.id,
    tiendaId,
    codigoBarras: producto.codigoBarras,
    nombre: producto.nombre,
    precio: producto.precioVenta,
    costo: producto.precioCompra,
    stock: producto.stock,
    version: producto.version,
    syncStatus: 'synced',
    updatedAt,
  }));

  await db.productos.bulkPut(rows);
  return rows.length;
}
