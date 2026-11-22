import type { ReactNode } from 'react';
import { IconAlertCircle, IconInbox } from '@tabler/icons-react';
import { Przycisk } from './Przycisk';
import { polacz, KLASY_H3, type PoziomNaglowka } from './klasy';

// ───────────────────────── Ładowanie ─────────────────────────

export interface StanLadowaniaProps {
  /** Tekst widoczny i ogłaszany przez czytnik. */
  etykieta?: string;
  /** Ile szarych wierszy pokazać. */
  wiersze?: number;
  /** Pokazać duży kafel (np. w miejscu kwoty) nad wierszami. */
  kafel?: boolean;
  className?: string;
}

/** Biały kafel ze szkieletem treści (szare bloki) i komunikatem dla czytnika. Pulsowanie wyłączone przy ograniczonym ruchu. */
export function StanLadowania({ etykieta = 'Wczytujemy dane…', wiersze = 3, kafel = true, className }: StanLadowaniaProps) {
  const szerokosci = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4'];
  return (
    <div role="status" aria-live="polite" className={polacz('flex flex-col gap-3 rounded-karta bg-white p-4 lg:p-6', className)}>
      <p className="text-sm text-tekst-drugi">{etykieta}</p>
      <div aria-hidden className="flex flex-col gap-3 motion-safe:animate-pulse">
        {kafel && <div className="h-24 w-full rounded-karta bg-szary-kafel sm:w-1/2" />}
        {Array.from({ length: wiersze }, (_, i) => (
          <div key={i} className={polacz('h-4 rounded-przycisk bg-szary-kafel', szerokosci[i % szerokosci.length])} />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Błąd ─────────────────────────

export interface StanBleduProps {
  tytul?: string;
  /** Co się stało i co zrobić, prostym językiem. */
  opis?: ReactNode;
  /** Ponowienie – pokazuje przycisk „Spróbuj ponownie”. */
  onPonow?: () => void;
  etykietaPonow?: string;
  /** Trwa ponowna próba. */
  ponawia?: boolean;
  poziomNaglowka?: PoziomNaglowka;
  className?: string;
}

/**
 * Błąd wczytywania (np. API nie odpowiada). Czerwień zostaje dla błędów planu,
 * więc tu tylko ikona w kolorze błędu na białej karcie z cienką szarą ramką (bez czerwonego paska
 * po lewej: usunięty na prośbę Wojtka 21.11).
 */
export function StanBledu({
  tytul = 'Nie udało się wczytać danych',
  opis = 'Proszę sprawdzić połączenie z internetem i spróbować jeszcze raz. Odpowiedzi są zapisane.',
  onPonow,
  etykietaPonow = 'Spróbuj ponownie',
  ponawia,
  poziomNaglowka = 3,
  className,
}: StanBleduProps) {
  const Naglowek = `h${poziomNaglowka}` as const;
  return (
    <div role="alert" className={polacz('flex flex-col gap-4 rounded-komunikat border border-szary-linia bg-white p-4 lg:p-6', className)}>
      <div className="flex gap-3">
        <IconAlertCircle size={24} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-blad" />
        <div className="flex flex-col gap-1">
          <Naglowek className={polacz(KLASY_H3, 'text-tekst')}>{tytul}</Naglowek>
          <p className="max-w-prose leading-normal text-tekst-drugi">{opis}</p>
        </div>
      </div>
      {onPonow && (
        <div className="*:w-full sm:pl-9 sm:*:w-auto">
          <Przycisk wariant="drugi" onClick={onPonow} laduje={ponawia} etykietaLadowania="Ponawiamy próbę">
            {etykietaPonow}
          </Przycisk>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Pusto ─────────────────────────

export interface StanPustyProps {
  tytul: string;
  opis?: ReactNode;
  /** Np. <Przycisk href="/sytuacja">Uzupełnij dane</Przycisk>. */
  akcja?: ReactNode;
  /** Własna ikona (Tabler, 32 px); domyślnie skrzynka. */
  ikona?: ReactNode;
  poziomNaglowka?: PoziomNaglowka;
  className?: string;
}

/** Pusty stan: nic jeszcze nie ma (np. brak dokumentów do złożenia). */
export function StanPusty({ tytul, opis, akcja, ikona, poziomNaglowka = 3, className }: StanPustyProps) {
  const Naglowek = `h${poziomNaglowka}` as const;
  return (
    <div className={polacz('flex flex-col items-center gap-3 rounded-karta bg-white px-4 py-8 text-center lg:px-6', className)}>
      <span aria-hidden className="flex size-14 items-center justify-center rounded-komunikat bg-granat text-white">
        {ikona ?? <IconInbox size={32} stroke={1.75} />}
      </span>
      <Naglowek className={polacz(KLASY_H3, 'text-granat')}>{tytul}</Naglowek>
      {opis && <p className="max-w-prose leading-normal text-tekst-drugi">{opis}</p>}
      {akcja && <div className="mt-1 w-full *:w-full sm:w-auto sm:*:w-auto">{akcja}</div>}
    </div>
  );
}
