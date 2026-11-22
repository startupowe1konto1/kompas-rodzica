'use client';

import { useRouter } from 'next/navigation';
import { IconRefresh } from '@tabler/icons-react';
import { useProfil } from '@/src/state/profil';

/** Czyści profil zapisany w przeglądarce. Widoczny tylko, gdy jest co wyczyścić. */
export function ZacznijOdNowa() {
  const { gotowy, rodzina, plany, wyczyscProfil } = useProfil();
  const router = useRouter();

  if (!gotowy || (rodzina === null && plany.length === 0)) return null;

  const naKlik = () => {
    const zgoda = window.confirm(
      'Usunąć wszystkie wpisane dane i plany z tej przeglądarki i zacząć od nowa? Tego nie da się cofnąć.',
    );
    if (!zgoda) return;
    wyczyscProfil();
    router.push('/');
  };

  return (
    <button
      type="button"
      onClick={naKlik}
      aria-label="Zacznij od nowa"
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-przycisk border-2 border-zielen bg-white px-3 text-sm font-bold text-zielen transition-colors duration-150 hover:bg-zielen hover:text-white"
    >
      <IconRefresh size={18} stroke={2} aria-hidden="true" />
      {/* Na wąskim ekranie krótszy napis, żeby nazwa aplikacji mieściła się w jednej linii. */}
      <span className="sm:hidden">Od nowa</span>
      <span className="hidden sm:inline">Zacznij od nowa</span>
    </button>
  );
}
