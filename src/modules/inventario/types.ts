// Shape real confirmado contra el backend (GET /productos y POST /productos
// devuelven exactamente esto). No existe un campo `categoria` en la
// respuesta; `costo` de nuestro ProductoRow se llena desde `precioCompra`.
export interface ProductoApiResponse {
  id: string;
  tiendaId: string;
  codigoBarras: string;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  version: number;
}
