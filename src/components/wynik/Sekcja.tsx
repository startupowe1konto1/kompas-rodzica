import { useId, type ReactNode } from 'react';
import type { Rodzina } from '../../engine/types';
import type { BladZapytania } from '../../state/useZapytanie';
import { StanBledu, polacz } from '../ui';
import { SzkieletTresciSekcji } from './SzkieletWyniku';

/** Wspólne propsy wszystkich sekcji ekranu wyniku. */
export interface SekcjaProps<T> {
  dane: T | null;
  laduje: boolean;
  blad: BladZapytania | null;
  odswiez: () => void;
  rodzina: Rodzina;
}

type StanProps<T> = Pick<SekcjaProps<T>, 'dane' | 'laduje' | 'blad' | 'odswiez'> & {
  /** `dzieci` dostaje dane dopiero wtedy, gdy są gotowe. */
  dzieci: (dane: T) => ReactNode;
  /** Szkielet w kształcie treści na czas ładowania (domyślnie kilka linijek tekstu). */
  szkielet?: ReactNode;
};

/** Stany ładowania i błędu bez własnego nagłówka (nagłówek daje nakładka albo `SekcjaOpakowanie`). */
export function StanSekcji<T>({ dane, laduje, blad, odswiez, dzieci, szkielet }: StanProps<T>) {
  if (blad) return <StanBledu opis={blad.komunikat} onPonow={odswiez} />;
  if (dane === null) return laduje ? (szkielet ?? <SzkieletTresciSekcji />) : null;
  return <>{dzieci(dane)}</>;
}

/**
 * Obudowa sekcji z własnym nagłówkiem: `<section aria-labelledby>`, `<h2>` oraz stany ładowania i błędu.
 * Używa jej kalkulator (`SekcjaUprawnien`); ekran wyniku pokazuje treść w nakładce.
 */
export function SekcjaOpakowanie<T>({
  tytul,
  className,
  ...stan
}: StanProps<T> & {
  tytul: string;
  className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={polacz('flex flex-col gap-3', className)}>
      <h2 id={id} className="text-xl font-black leading-snug text-granat lg:text-2xl">
        {tytul}
      </h2>
      <StanSekcji {...stan} />
    </section>
  );
}
