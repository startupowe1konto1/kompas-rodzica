import type { CSSProperties, ReactNode } from 'react';
import { polacz } from './klasy';
import './Szkielet.css';

/**
 * Szkielet treści w kształcie tego, co się wczyta (uwaga Wojtka 21.11: sekcje „skaczą” przy przełączaniu).
 * Zasada: rama ekranu (nagłówki, przyciski) jest od razu, a w miejscu danych stoją szare bloki
 * o tych samych wymiarach co docelowe karty – po wczytaniu nic się nie przesuwa.
 * Wzorzec podpatrzony w loading-ui.com (Skeleton, Text shimmer); kod własny.
 */
export function Szkielet({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={polacz('szkielet-blok rounded-przycisk', className)} style={style} />;
}

/** Obszar ładowania: jeden komunikat dla czytnika ekranu, szkielet w środku jest dla niego niewidoczny. */
export function ObszarLadowania({ etykieta, children, className }: { etykieta: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" data-laduje className={className}>
      <span className="sr-only">{etykieta}</span>
      {children}
    </div>
  );
}

/** Opakowanie treści, która zastępuje szkielet: krótkie przenikanie (wyłączone przy ograniczonym ruchu). */
export function Wejscie({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={polacz('szkielet-wejscie', className)}>{children}</div>;
}
