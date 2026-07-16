// Punto único para generar los UUIDs locales que sostienen la estrategia
// append-only (misma id desde que se crea offline hasta que se sincroniza).
export function generateUuid(): string {
  return crypto.randomUUID();
}
