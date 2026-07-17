import { init, text, bold, alignCenter, alignLeft, feed, cut, concatBytes } from './escpos';
import { formatMoney } from '../utils/money';

export interface ReciboItem {
  nombre: string;
  cantidad: number;
  subtotal: number;
}

export interface ReciboVenta {
  tiendaNombre: string;
  fecha: string;
  items: ReciboItem[];
  total: number;
  metodoPago: string;
  // Solo presente en pagos EFECTIVO; el cambio se calcula a partir de este.
  montoRecibido?: number;
}

// Ancho aproximado para papel de 58mm con la fuente por defecto de la
// impresora; ajustar cuando se pruebe contra hardware real.
const ANCHO_LINEA = 32;

function lineaItem(item: ReciboItem): string {
  const izquierda = `${item.cantidad}x ${item.nombre}`;
  const derecha = formatMoney(item.subtotal);
  const espacios = Math.max(1, ANCHO_LINEA - izquierda.length - derecha.length);
  return `${izquierda}${' '.repeat(espacios)}${derecha}\n`;
}

// Función pura: transforma los datos de una venta ya guardada en los bytes
// ESC/POS listos para `serialPrinter.imprimir()`. No toca Dexie ni el puerto
// serie, así que es trivial de probar sin hardware.
export function construirRecibo(venta: ReciboVenta): Uint8Array {
  const partes: Uint8Array[] = [
    init(),
    alignCenter(),
    bold(true),
    text(`${venta.tiendaNombre}\n`),
    bold(false),
    text(`${new Date(venta.fecha).toLocaleString('es-CO')}\n`),
    feed(1),
    alignLeft(),
  ];

  for (const item of venta.items) {
    partes.push(text(lineaItem(item)));
  }

  partes.push(feed(1));
  partes.push(alignCenter());
  partes.push(bold(true));
  partes.push(text(`TOTAL: ${formatMoney(venta.total)}\n`));
  partes.push(bold(false));
  partes.push(text(`Metodo de pago: ${venta.metodoPago}\n`));

  if (venta.montoRecibido !== undefined) {
    const cambio = venta.montoRecibido - venta.total;
    partes.push(text(`Efectivo recibido: ${formatMoney(venta.montoRecibido)}\n`));
    partes.push(text(`Cambio: ${formatMoney(cambio)}\n`));
  }

  partes.push(feed(1));
  partes.push(text('Gracias por su compra!\n'));
  partes.push(feed(3));
  partes.push(cut('partial'));

  return concatBytes(partes);
}
