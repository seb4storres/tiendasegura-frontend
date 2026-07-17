import { db } from '../../../core/db/dexieInstance';
import { generateUuid } from '../../../core/utils/uuid';
import type { ClienteRow } from '../../../core/db/tables';

export interface RegistrarClienteParams {
  tiendaId: string;
  nombre: string;
  telefono?: string;
  limiteCredito: number;
}

// Guarda el cliente localmente con un id temporal y syncStatus 'pending':
// el cajero puede fiarle a un cliente nuevo aunque no haya conexión en ese
// momento. A diferencia de ventas/abonos/productos, el backend de
// /clientes NO acepta un id generado por el cliente — siempre asigna el
// suyo — así que este id temporal solo vive hasta que syncQueue.ts lo
// sincronice y lo reemplace por el real (ver procesarClientesPendientes).
export async function registrarCliente(params: RegistrarClienteParams): Promise<ClienteRow> {
  const cliente: ClienteRow = {
    id: generateUuid(),
    tiendaId: params.tiendaId,
    nombre: params.nombre,
    telefono: params.telefono,
    limiteCredito: params.limiteCredito,
    saldoActual: 0,
    syncStatus: 'pending',
    updatedAt: new Date().toISOString(),
  };

  await db.clientes.add(cliente);
  return cliente;
}
