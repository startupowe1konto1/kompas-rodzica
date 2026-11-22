import { IconCheck, IconHelp, IconX } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { Uprawnienie } from '../../engine/types';
import { polacz } from './klasy';

export interface ZnacznikUprawnieniaProps {
  /** Wartość `Uprawnienie.przysluguje`: true, false albo 'warunkowo'. */
  przysluguje: Uprawnienie['przysluguje'];
  className?: string;
}

const STYLE: Record<'tak' | 'nie' | 'warunkowo', { klasy: string; tekst: string; Ikona: Icon }> = {
  tak: { klasy: 'bg-zielen', tekst: 'Przysługuje', Ikona: IconCheck },
  nie: { klasy: 'bg-nie-przysluguje', tekst: 'Nie przysługuje', Ikona: IconX },
  warunkowo: { klasy: 'bg-info', tekst: 'Do potwierdzenia w ZUS', Ikona: IconHelp },
};

/** Znacznik uprawnienia: pełne tło, biały tekst 700, ikona + słowo. */
export function ZnacznikUprawnienia({ przysluguje, className }: ZnacznikUprawnieniaProps) {
  const klucz = przysluguje === 'warunkowo' ? 'warunkowo' : przysluguje ? 'tak' : 'nie';
  const { klasy, tekst, Ikona } = STYLE[klucz];
  return (
    <span
      className={polacz(
        'inline-flex items-center gap-1 rounded-przycisk px-2 py-1 text-sm font-bold leading-tight whitespace-nowrap text-white',
        klasy,
        className,
      )}
    >
      <Ikona size={18} stroke={2.5} aria-hidden className="shrink-0" />
      {tekst}
    </span>
  );
}
