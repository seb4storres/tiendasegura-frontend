// Puerto activo a nivel de módulo (singleton): tanto el botón de conexión en
// el Header como ventaOfflineService consultan el mismo estado sin acoplarse
// entre sí ni pasar la conexión como parámetro por toda la app.
let port: SerialPort | null = null;

export interface ConectarResultado {
  conectado: boolean;
  error?: string;
}

export async function conectar(): Promise<ConectarResultado> {
  if (!('serial' in navigator)) {
    return { conectado: false, error: 'Este navegador no soporta la Web Serial API (usa Chrome/Edge en Windows).' };
  }

  try {
    const nuevoPuerto = await navigator.serial.requestPort();
    await nuevoPuerto.open({ baudRate: 9600 });
    port = nuevoPuerto;
    return { conectado: true };
  } catch (error) {
    port = null;

    if (error instanceof DOMException && error.name === 'NotFoundError') {
      // El usuario cerró el selector de puertos sin elegir ninguno: no es un error real.
      return { conectado: false };
    }

    return { conectado: false, error: 'No se pudo conectar con la impresora.' };
  }
}

export async function desconectar(): Promise<void> {
  if (!port) return;

  await port.close();
  port = null;
}

export function estaConectada(): boolean {
  return port !== null;
}

export async function imprimir(data: Uint8Array): Promise<void> {
  if (!port || !port.writable) {
    throw new Error('La impresora no está conectada.');
  }

  const writer = port.writable.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}
