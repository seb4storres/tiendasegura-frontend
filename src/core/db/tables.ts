// Tipos de las filas persistidas en IndexedDB (una por tabla local).
// Todas usan `id: string` (UUID v4 generado en el cliente) como PK,
// nunca autoincremental: es la base de la estrategia append-only.

export type SyncStatus = 'pending' | 'synced' | 'error';

export type Rol = 'ADMIN' | 'CAJERO';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'FIADO';
export type EstadoVenta = 'COMPLETADA' | 'ANULADA';

export interface TiendaRow {
  id: string;
  nombre: string;
  nit: string;
  plan: string;
  activa: boolean;
  updatedAt: string;
}

export interface UsuarioRow {
  id: string;
  tiendaId: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  // No se persiste passwordHash ni ningún secreto en el cliente.
  updatedAt: string;
}

export interface ProductoRow {
  id: string;
  tiendaId: string;
  codigoBarras: string;
  nombre: string;
  precio: number;
  costo?: number;
  stock: number;
  categoria?: string;
  // Espeja la columna `version` del backend (Control de Concurrencia Optimista)
  // para poder detectar conflictos de stock al sincronizar.
  version: number;
  syncStatus: SyncStatus;
  updatedAt: string;
  deleted?: boolean;
}

export interface VentaRow {
  id: string;
  tiendaId: string;
  usuarioId: string;
  // Solo presente cuando metodoPago === 'FIADO'.
  clienteId?: string;
  fecha: string;
  total: number;
  metodoPago: MetodoPago;
  estado: EstadoVenta;
  // `id` es también la clave de idempotencia enviada al backend.
  syncStatus: SyncStatus;
  createdAt: string;
}

export interface DetalleVentaRow {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  // Snapshot inmutable del precio al momento de la venta.
  precioUnitarioSnapshot: number;
  subtotal: number;
}

export interface ClienteRow {
  id: string;
  tiendaId: string;
  nombre: string;
  telefono?: string;
  limiteCredito: number;
  saldoActual: number;
  syncStatus: SyncStatus;
  updatedAt: string;
}

export interface AbonoRow {
  id: string;
  clienteId: string;
  // Referencia opcional a la venta fiada que se está abonando.
  ventaId?: string;
  monto: number;
  fecha: string;
  usuarioId: string;
  syncStatus: SyncStatus;
  createdAt: string;
}
