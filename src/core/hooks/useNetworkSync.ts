import { useCallback, useEffect, useRef, useState } from 'react';
import { procesarVentasPendientes } from '../api/syncQueue';

interface UseNetworkSyncResult {
  isSyncing: boolean;
  forceSync: () => Promise<void>;
}

// Dispara la subida de ventas pendientes apenas el navegador recupera
// conexión, y la reintenta al montar por si ya había internet cuando se
// recargó la app (ventas 'pending' que quedaron de una sesión anterior).
export function useNetworkSync(): UseNetworkSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const forceSync = useCallback(async () => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await procesarVentasPendientes();
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (navigator.onLine) {
      forceSync();
    }

    window.addEventListener('online', forceSync);
    return () => window.removeEventListener('online', forceSync);
  }, [forceSync]);

  return { isSyncing, forceSync };
}
