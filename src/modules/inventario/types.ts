// Debe coincidir con ProductoResponse.java del backend (inventario/infrastructure/dto).
// Compartido por inventarioSyncService (GET /productos) y productoService
// (POST /productos): ambos reciben el mismo shape desde el backend.
export interface ProductoApiResponse {
  id: string;
  codigoBarras: string;
  nombre: string;
  precio: number;
  costo?: number;
  stock: number;
  categoria?: string;
  version: number;
}
