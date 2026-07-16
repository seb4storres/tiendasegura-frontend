// Comandos ESC/POS básicos como bytes crudos. El texto se codifica con
// TextEncoder (UTF-8): la mayoría de impresoras térmicas usan CP437/850 por
// defecto, así que tildes/ñ pueden no verse bien en hardware real hasta
// configurar la página de códigos — no hay forma de validar esto sin una
// impresora física a mano.
const ESC = 0x1b;
const GS = 0x1d;

const encoder = new TextEncoder();

export function init(): Uint8Array {
  return new Uint8Array([ESC, 0x40]);
}

export function text(content: string): Uint8Array {
  return encoder.encode(content);
}

export function bold(enabled: boolean): Uint8Array {
  return new Uint8Array([ESC, 0x45, enabled ? 1 : 0]);
}

export function alignCenter(): Uint8Array {
  return new Uint8Array([ESC, 0x61, 1]);
}

export function alignLeft(): Uint8Array {
  return new Uint8Array([ESC, 0x61, 0]);
}

export function feed(lines = 1): Uint8Array {
  return new Uint8Array([ESC, 0x64, lines]);
}

export function cut(mode: 'full' | 'partial' = 'partial'): Uint8Array {
  return new Uint8Array([GS, 0x56, mode === 'full' ? 0 : 1]);
}

export function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
