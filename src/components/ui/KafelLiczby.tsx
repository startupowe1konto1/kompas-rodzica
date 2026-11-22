import type { ReactNode } from 'react';
import { polacz } from './klasy';

/**
 * 'bialy' – zwykły kafel bento na tle strony,
 * 'szary' – kafel wewnątrz białej karty (tło szary-kafel),
 * 'zielen-noc' – ciemnozielony kafel z główną kwotą (wynik, C4), biały tekst; jedyny ciemny element widoku,
 * 'bursztyn' – kafel obok kwoty głównej (np. „razem za cały urlop”), tekst granat,
 * 'zielen' / 'granat' – pełny kolor z białym tekstem.
 * Na widok najwyżej jeden kafel ciemny i jeden w bursztynie, reszta biała.
 */
export type KolorKafla = 'bialy' | 'szary' | 'zielen-noc' | 'bursztyn' | 'zielen' | 'granat';

export interface KafelLiczbyProps {
  /** Podpis nad liczbą, np. „Zasiłek macierzyński miesięcznie”. */
  etykieta: string;
  /** Liczba – najlepiej <Kwota />, <Data /> albo krótki tekst („20 tygodni”). */
  wartosc: ReactNode;
  /** Opcjonalny dopisek pod liczbą, np. „100% podstawy przez 20 tygodni”. */
  podpis?: ReactNode;
  kolor?: KolorKafla;
  /** Ikona w rogu (Tabler, 24 px), dekoracyjna. */
  ikona?: ReactNode;
  className?: string;
}

const KOLORY: Record<KolorKafla, { tlo: string; tekst: string; drugi: string }> = {
  bialy: { tlo: 'bg-white', tekst: 'text-tekst', drugi: 'text-tekst-drugi' },
  szary: { tlo: 'bg-szary-kafel', tekst: 'text-tekst', drugi: 'text-tekst-drugi' },
  'zielen-noc': { tlo: 'bg-zielen-noc', tekst: 'text-white', drugi: 'text-white' },
  bursztyn: { tlo: 'bg-bursztyn', tekst: 'text-granat', drugi: 'text-granat' },
  zielen: { tlo: 'bg-zielen', tekst: 'text-white', drugi: 'text-white' },
  granat: { tlo: 'bg-granat', tekst: 'text-white', drugi: 'text-white' },
};

/** Kafel liczby: podpis 14 px nad liczbą, liczba 900 (28 px telefon / 32 px komputer). */
export function KafelLiczby({ etykieta, wartosc, podpis, kolor = 'bialy', ikona, className }: KafelLiczbyProps) {
  const k = KOLORY[kolor];
  return (
    <div className={polacz('flex flex-col gap-1 rounded-karta p-4 lg:p-6', k.tlo, className)}>
      <div className="flex items-start justify-between gap-3">
        <p className={polacz('text-sm leading-snug', k.drugi)}>{etykieta}</p>
        {ikona && (
          <span aria-hidden className={polacz('shrink-0', k.tekst)}>
            {ikona}
          </span>
        )}
      </div>
      <p className={polacz('text-[1.75rem] font-black leading-tight tabular-nums lg:text-[2rem]', k.tekst)}>{wartosc}</p>
      {podpis && <p className={polacz('text-sm leading-snug', k.drugi)}>{podpis}</p>}
    </div>
  );
}
