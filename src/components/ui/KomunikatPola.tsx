import type { ReactNode } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';

/** Podpowiedź pod etykietą pola (14 px, tekst-drugi). */
export function PodpowiedzPola({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm leading-normal text-tekst-drugi">
      {children}
    </p>
  );
}

/** Błąd pola: ikona + tekst w kolorze błędu, powiązany z polem przez aria-describedby. */
export function BladPola({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-bold leading-normal text-blad">
      <IconAlertCircle size={20} stroke={2} aria-hidden className="mt-px shrink-0" />
      <span>
        <span className="sr-only">Błąd: </span>
        {children}
      </span>
    </p>
  );
}
