import type { ReactNode } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { polacz } from './klasy';

export interface RozwijaneProps {
  /** Tekst w nagłówku, np. „Jak to policzyliśmy”. */
  tytul: ReactNode;
  children: ReactNode;
  domyslnieOtwarte?: boolean;
  className?: string;
}

/** Sekcja rozwijana (details/summary), np. „ścieżka wyliczenia”. Działa bez JavaScriptu. */
export function Rozwijane({ tytul, children, domyslnieOtwarte, className }: RozwijaneProps) {
  return (
    <details open={domyslnieOtwarte} className={polacz('group rounded-karta border border-szary-linia bg-white', className)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-karta px-4 py-2 font-bold text-granat hover:bg-szary-kafel lg:px-6 [&::-webkit-details-marker]:hidden">
        <span>{tytul}</span>
        <IconChevronDown
          size={24}
          stroke={2}
          aria-hidden
          className="shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-szary-linia px-4 py-4 lg:px-6">{children}</div>
    </details>
  );
}
