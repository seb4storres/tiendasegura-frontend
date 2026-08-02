import { useCallback, useEffect, useRef, useState } from 'react';
import { procesarTodoPendiente } from '../api/syncQueue';

interface UseNetworkSyncResult {
  isSyncing: boolean;
  forceSync: () => Promise<void>;
}

const BACKOFF_INICIAL_MS = 10_000;
const BACKOFF_MAXIMO_MS = 5 * 60_000;

// Dispara la subida de ventas/abonos/clientes pendientes apenas el navegador
// recupera conexión, y la reintenta al montar por si ya había internet
// cuando se recargó la app (registros 'pending' de una sesión anterior).
// Además reintenta sola en segundo plano con backoff exponencial (10s, 20s,
// 40s... hasta un tope de 5min) mientras quede algo pendiente o con error,
// para no depender de que el cajero se acuerde de tocar el ícono de la nube.
export function useNetworkSync(): UseNetworkSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const backoffMsRef = useRef(BACKOFF_INICIAL_MS);
  const backoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ejecutarSync = useCallback(async (opts: { silencioso?: boolean } = {}) => {
    if (isSyncingRef.current) return;
    if (backoffTimeoutRef.current) {
      clearTimeout(backoffTimeoutRef.current);
      backoffTimeoutRef.current = null;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const { fallidas } = await procesarTodoPendiente(opts);
      if (fallidas > 0) {
        backoffTimeoutRef.current = setTimeout(() => ejecutarSync({ silencioso: true }), backoffMsRef.current);
        backoffMsRef.current = Math.min(backoffMsRef.current * 2, BACKOFF_MAXIMO_MS);
      } else {
        backoffMsRef.current = BACKOFF_INICIAL_MS;
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  const forceSync = useCallback(() => ejecutarSync(), [ejecutarSync]);

  useEffect(() => {
    function handleOnline() {
      // Volver a tener conexión es la señal más fuerte de que vale la pena
      // reintentar ya: resetea el backoff en vez de esperar el próximo tick.
      backoffMsRef.current = BACKOFF_INICIAL_MS;
      ejecutarSync();
    }

    if (navigator.onLine) {
      ejecutarSync();
    }

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      if (backoffTimeoutRef.current) clearTimeout(backoffTimeoutRef.current);
    };
  }, [ejecutarSync]);

  return { isSyncing, forceSync };
}
