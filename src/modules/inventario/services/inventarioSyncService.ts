import { apiClient } from '../../../core/api/apiClient';
import { db } from '../../../core/db/dexieInstance';
import type { ProductoRow } from '../../../core/db/tables';

// Debe coincidir con ProductoResponse.java del backend (inventario/infrastructure/dto).
interface ProductoApiResponse {
  id: string;
  codigoBarras: string;
  nombre: string;
  precio: number;
  costo?: number;
  stock: number;
  categoria?: string;
  version: number;
}

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
    precio: producto.precio,
    costo: producto.costo,
    stock: producto.stock,
    categoria: producto.categoria,
    version: producto.version,
    syncStatus: 'synced',
    updatedAt,
  }));

  await db.productos.bulkPut(rows);
  return rows.length;
}
