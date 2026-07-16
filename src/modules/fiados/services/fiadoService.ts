import { db } from '../../../core/db/dexieInstance';
import { generateUuid } from '../../../core/utils/uuid';

// Descuenta el abono del saldo del cliente y deja registro del movimiento en
// `abonos`, todo en una sola transacción: si algo falla, no queda un abono
// guardado sin haberse reflejado en el saldo (o viceversa).
export async function registrarAbono(clienteId: string, monto: number, usuarioId: string): Promise<void> {
  const fecha = new Date().toISOString();

  await db.transaction('rw', db.clientes, db.abonos, async () => {
    const cliente = await db.clientes.get(clienteId);
    if (!cliente) {
      throw new Error('Cliente no encontrado.');
    }

    await db.clientes.update(clienteId, {
      // Nunca queda en negativo por un abono mayor a la deuda registrada.
      saldoActual: Math.max(0, cliente.saldoActual - monto),
      updatedAt: fecha,
    });

    await db.abonos.add({
      id: generateUuid(),
      clienteId,
      monto,
      fecha,
      usuarioId,
      syncStatus: 'pending',
      createdAt: fecha,
    });
  });
}
