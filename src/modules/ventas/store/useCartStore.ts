import { create } from 'zustand';

export interface CartItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

interface CartState {
  cartItems: CartItem[];
  total: number;
  addItem: (producto: { productoId: string; nombre: string; precio: number }, cantidad?: number) => void;
  removeItem: (productoId: string) => void;
  clearCart: () => void;
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

// Sin persist: el carrito es efímero, vive solo mientras dura la venta en curso.
export const useCartStore = create<CartState>()((set) => ({
  cartItems: [],
  total: 0,
  addItem: ({ productoId, nombre, precio }, cantidad = 1) =>
    set((state) => {
      const existing = state.cartItems.find((item) => item.productoId === productoId);
      const cartItems = existing
        ? state.cartItems.map((item) =>
            item.productoId === productoId
              ? {
                  ...item,
                  cantidad: item.cantidad + cantidad,
                  subtotal: (item.cantidad + cantidad) * item.precio,
                }
              : item,
          )
        : [...state.cartItems, { productoId, nombre, precio, cantidad, subtotal: precio * cantidad }];

      return { cartItems, total: calculateTotal(cartItems) };
    }),
  removeItem: (productoId) =>
    set((state) => {
      const cartItems = state.cartItems.filter((item) => item.productoId !== productoId);
      return { cartItems, total: calculateTotal(cartItems) };
    }),
  clearCart: () => set({ cartItems: [], total: 0 }),
}));
