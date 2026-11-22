'use client';

import type { BladZapytania } from '../../state/useZapytanie';
import { StanBledu } from '../ui';

/** Plan jest widoczny, ale sprawdzenie planu (POST /api/plan/validate) nie zadziałało. Jest ponowienie. */
export function WalidacjaNiedostepna({ blad, onPonow, laduje }: { blad: BladZapytania; onPonow: () => void; laduje?: boolean }) {
  return (
    <div data-stan="walidacja-niedostepna">
      <StanBledu
        poziomNaglowka={2}
        tytul="Nie udało się sprawdzić planu"
        opis={`${blad.komunikat} Plan poniżej jest pokazany bez sprawdzenia błędów.`}
        onPonow={onPonow}
        ponawia={laduje}
      />
    </div>
  );
}
