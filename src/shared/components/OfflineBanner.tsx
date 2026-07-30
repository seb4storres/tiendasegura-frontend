import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../core/hooks/useOnlineStatus';

// Señal persistente y proactiva de que no hay conexión: el ícono de la
// nube en el Header exige que el cajero lo note por color, esto no —
// aparece solo mientras estás offline y desaparece solo al reconectar.
export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
      <WifiOff size={16} />
      Sin conexión — tus ventas se guardarán localmente
    </div>
  );
}
