'use client';

/**
 * Odcinek osi jako pigułka (design.md, „Jasny gantt z pigułkami”): kolor typu, promień 6 px, nazwa,
 * gdy się mieści (zapytanie kontenerowe), i znacznik liczby tygodni (`data-tygodnie`).
 * Paski = łączenie z pracą, ramka 3 px `blad` z ikoną = błąd w planie, ring `granat` = wybrany,
 * prosta krawędź z przerywaną kreską = odcinek wychodzi poza okno.
 * Wariant `duch` to pigułka wiersza „po zmianie”: jasna, z przerywanym obrysem, bez `data-odcinek`.
 */
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { polacz } from '../ui';
import { KLASY_TYPU, KOLOR_TYPU, KROTKIE_NAZWY, WZOR_PRACY, opisWymiaruPracy, proc, tygodnieKrotko } from './kolory';
import type { OdcinekNaOsi } from './uklad';

export const WYS_WIERSZA = 56;
export const WYS_PIGULKI = 44;

export interface OdcinekOsiProps {
  odcinek: OdcinekNaOsi;
  wybrany?: boolean;
  /** Bez tego pigułka jest tylko rysunkiem (np. podgląd). */
  onWybierz?: (id: string) => void;
  /** Wiersz „po zmianie”: półprzezroczysta, przerywana, nieklikalna. */
  duch?: boolean;
  /** Dopisek obok liczby tygodni (np. nowa stawka w podglądzie). */
  dopisek?: ReactNode;
}

/** Strzałki ←/→ (oraz Home/End) przesuwają fokus między pigułkami jednej ścieżki. */
function przesunFokus(e: KeyboardEvent<HTMLButtonElement>) {
  const klawisze = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!klawisze.includes(e.key)) return;
  const sciezka = e.currentTarget.closest('[data-sciezka]');
  if (!sciezka) return;
  const pigulki = Array.from(sciezka.querySelectorAll<HTMLButtonElement>('button[data-odcinek]'));
  const i = pigulki.indexOf(e.currentTarget);
  const cel =
    e.key === 'Home' ? 0 : e.key === 'End' ? pigulki.length - 1 : e.key === 'ArrowLeft' ? Math.max(0, i - 1) : Math.min(pigulki.length - 1, i + 1);
  e.preventDefault();
  pigulki[cel]?.focus();
  pigulki[cel]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function OdcinekOsi({ odcinek: o, wybrany, onWybierz, duch, dopisek }: OdcinekOsiProps) {
  const kolor = KOLOR_TYPU[o.typ];
  const styl: CSSProperties = {
    left: proc(o.start),
    width: proc(o.szerokosc),
    top: o.wiersz * WYS_WIERSZA + (WYS_WIERSZA - WYS_PIGULKI) / 2,
    height: WYS_PIGULKI,
    ...(o.wymiarPracy && !duch ? WZOR_PRACY : {}),
    // Podgląd: jasne tło w kolorze typu i ciemny tekst (biały na jasnym nie miałby kontrastu 4,5:1).
    ...(duch
      ? {
          outlineColor: kolor,
          backgroundColor: `color-mix(in srgb, ${kolor} 14%, white)`,
          backgroundImage: o.wymiarPracy
            ? `repeating-linear-gradient(135deg, color-mix(in srgb, ${kolor} 24%, transparent) 0 5px, transparent 5px 11px)`
            : undefined,
        }
      : {}),
  };

  const klasy = polacz(
    '@container absolute flex items-center gap-1.5 overflow-hidden rounded-odcinek px-2 text-left text-sm font-bold leading-none',
    duch ? 'pointer-events-none text-tekst outline-2 outline-offset-[-2px] outline-dashed' : KLASY_TYPU[o.typ],
    o.przyciety.lewy && 'rounded-l-none',
    o.przyciety.prawy && 'rounded-r-none',
    o.maBlad && !duch && 'border-[3px] border-blad',
    wybrany && 'z-10 ring-[3px] ring-granat ring-offset-2',
    onWybierz && !duch && 'cursor-pointer motion-safe:transition-[box-shadow,filter] motion-safe:duration-150 hover:brightness-110',
  );

  const tresc = (
    <>
      {o.przyciety.lewy && <span aria-hidden className="absolute inset-y-1 left-0.5 border-l-2 border-dashed border-current opacity-60" />}
      {o.przyciety.prawy && <span aria-hidden className="absolute inset-y-1 right-0.5 border-r-2 border-dashed border-current opacity-60" />}
      {o.maBlad && !duch && <IconAlertTriangle size={18} stroke={2.25} aria-hidden className="shrink-0" />}
      <span className="hidden min-w-0 truncate @[120px]:inline">
        {KROTKIE_NAZWY[o.typ]}
        {o.wymiarPracy ? <span className="hidden font-normal @[300px]:inline"> + praca {opisWymiaruPracy(o.wymiarPracy)}</span> : null}
      </span>
      <span className="ml-auto hidden shrink-0 items-center gap-1 @[44px]:inline-flex">
        <span data-tygodnie={Math.round(o.dni / 7)} className="rounded-full bg-white px-1.5 py-0.5 text-sm font-bold text-tekst tabular-nums">
          {o.dni % 7 ? (
            <>
              <span className="@[150px]:hidden">{Math.floor(o.dni / 7) ? `${Math.floor(o.dni / 7)}+ tyg.` : `${o.dni} d`}</span>
              <span className="hidden @[150px]:inline">{tygodnieKrotko(o.dni)}</span>
            </>
          ) : (
            tygodnieKrotko(o.dni)
          )}
        </span>
        {dopisek}
      </span>
    </>
  );

  if (duch) {
    // Podgląd nie powtarza `data-odcinek`, żeby testy i akcje widziały tylko odcinki planu.
    return (
      <div data-podglad-odcinek={o.id} data-typ={o.typ} role="img" aria-label={`Po zmianie: ${o.etykietaDostepna}`} className={klasy} style={styl}>
        {tresc}
      </div>
    );
  }
  if (!onWybierz) {
    return (
      <div data-odcinek={o.id} data-typ={o.typ} role="img" aria-label={o.etykietaDostepna} className={klasy} style={styl}>
        {tresc}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-odcinek={o.id}
      data-typ={o.typ}
      {...(wybrany ? { 'data-wybrany': 'true' } : {})}
      aria-label={o.etykietaDostepna}
      aria-pressed={!!wybrany}
      onClick={() => onWybierz(o.id)}
      onKeyDown={przesunFokus}
      className={klasy}
      style={styl}
    >
      {tresc}
    </button>
  );
}
