'use client';

/**
 * Przyciski okna osi: „Wcześniej”, „Później”, „Przybliż”, „Oddal”, „Pokaż całość”.
 * Na telefonie same ikony (nazwa zostaje dla czytnika ekranu), cele dotykowe 44 px.
 */
import type { ReactNode } from 'react';
import { IconArrowsHorizontal, IconChevronLeft, IconChevronRight, IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import { polacz } from '../ui';

export interface NawigacjaOsiProps {
  onWczesniej: () => void;
  onPozniej: () => void;
  onPrzybliz: () => void;
  onOddal: () => void;
  onCalosc: () => void;
  moznaWczesniej: boolean;
  moznaPozniej: boolean;
  moznaPrzyblizyc: boolean;
  moznaOddalic: boolean;
  /** Np. „luty 2026 – styczeń 2028”. */
  opisOkna: string;
}

function PrzyciskOsi({ onClick, wlaczony, ikona, children, zawszeTekst }: { onClick: () => void; wlaczony: boolean; ikona: ReactNode; children: string; zawszeTekst?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!wlaczony}
      className={polacz(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-przycisk border-2 px-2.5 text-base font-bold motion-safe:transition-colors motion-safe:duration-150',
        wlaczony ? 'border-zielen bg-white text-zielen hover:bg-szary-kafel active:bg-szary-kafel' : 'cursor-not-allowed border-szary-linia bg-white text-szary-ramka',
        'sm:px-3',
      )}
    >
      {ikona}
      <span className={zawszeTekst ? undefined : 'sr-only sm:not-sr-only'}>{children}</span>
    </button>
  );
}

export function NawigacjaOsi(p: NawigacjaOsiProps) {
  const r = { size: 20, stroke: 2, 'aria-hidden': true } as const;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div role="group" aria-label="Przesuwanie osi" className="flex gap-2">
        <PrzyciskOsi onClick={p.onWczesniej} wlaczony={p.moznaWczesniej} ikona={<IconChevronLeft {...r} />}>
          Wcześniej
        </PrzyciskOsi>
        <PrzyciskOsi onClick={p.onPozniej} wlaczony={p.moznaPozniej} ikona={<IconChevronRight {...r} />}>
          Później
        </PrzyciskOsi>
      </div>
      <p aria-live="polite" className="order-last w-full text-sm text-tekst-drugi tabular-nums sm:order-none sm:w-auto">
        Widać: {p.opisOkna}
      </p>
      <div role="group" aria-label="Przybliżanie osi" className="flex gap-2">
        <PrzyciskOsi onClick={p.onPrzybliz} wlaczony={p.moznaPrzyblizyc} ikona={<IconZoomIn {...r} />}>
          Przybliż
        </PrzyciskOsi>
        <PrzyciskOsi onClick={p.onOddal} wlaczony={p.moznaOddalic} ikona={<IconZoomOut {...r} />}>
          Oddal
        </PrzyciskOsi>
        <PrzyciskOsi onClick={p.onCalosc} wlaczony={p.moznaOddalic} ikona={<IconArrowsHorizontal {...r} />}>
          Pokaż całość
        </PrzyciskOsi>
      </div>
    </div>
  );
}
