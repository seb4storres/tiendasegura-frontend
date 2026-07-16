import Dexie, { type Table } from 'dexie';
import type {
  TiendaRow,
  UsuarioRow,
  ProductoRow,
  VentaRow,
  DetalleVentaRow,
  ClienteRow,
  AbonoRow,
} from './tables';

export class TiendaSeguraDB extends Dexie {
  tiendas!: Table<TiendaRow, string>;
  usuarios!: Table<UsuarioRow, string>;
  productos!: Table<ProductoRow, string>;
  ventas!: Table<VentaRow, string>;
  detalleVentas!: Table<DetalleVentaRow, string>;
  clientes!: Table<ClienteRow, string>;
  abonos!: Table<AbonoRow, string>;

  constructor() {
    super('tiendasegura');

    // PK siempre `id` (UUID generado con crypto.randomUUID(), ver core/utils/uuid.ts),
    // nunca '++id' autoincremental: el registro creado offline conserva el mismo id
    // al llegar al backend, que lo usa como clave de idempotencia (estrategia append-only).
    //
    // `syncStatus` indexado en las tablas que se escriben localmente (productos, ventas,
    // clientes, abonos) para poder consultar rápido lo pendiente de subir vía syncQueue.
    // `detalleVentas` no lleva syncStatus propio: viaja junto a su `venta` como un solo
    // payload atómico.
    this.version(1).stores({
      tiendas: 'id, nombre',
      usuarios: 'id, tiendaId, email',
      productos: 'id, tiendaId, codigoBarras, [tiendaId+codigoBarras], syncStatus',
      ventas: 'id, tiendaId, usuarioId, clienteId, fecha, estado, syncStatus',
      detalleVentas: 'id, ventaId, productoId',
      clientes: 'id, tiendaId, telefono, syncStatus',
      abonos: 'id, clienteId, ventaId, fecha, syncStatus',
    });
  }
}

export const db = new TiendaSeguraDB();
