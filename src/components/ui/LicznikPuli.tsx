import type { CSSProperties, ReactNode } from 'react';
import { polacz } from './klasy';

/** Kolor kresek = kolor typu odcinka z osi czasu (design.md). */
export type KolorPuli = 'macierzynski' | 'rodzicielski' | 'ojcowski' | 'uzupelniajacy' | 'wychowawczy';

const KOLORY: Record<KolorPuli, string> = {
  macierzynski: 'var(--color-odc-macierzynski)',
  rodzicielski: 'var(--color-odc-rodzicielski)',
  ojcowski: 'var(--color-odc-ojcowski)',
  uzupelniajacy: 'var(--color-odc-uzupelniajacy)',
  wychowawczy: 'var(--color-odc-wychowawczy)',
};

export type JednostkaPuli = 'tygodnie' | 'dni';

export interface LicznikPuliProps {
  /** Nazwa puli, np. „Urlop rodzicielski – rodzina”. */
  nazwa: string;
  kolor: KolorPuli;
  /** Cała pula (np. 41 tygodni). Jedna kreska = jedna jednostka. */
  pula: number;
  /** Ile z puli jest wykorzystane albo zaplanowane. */
  wykorzystane: number;
  /** Ile przepadnie przy tym planie (np. 9 nieprzenoszalnych tygodni drugiego rodzica). */
  przepadnie?: number;
  jednostka?: JednostkaPuli;
  className?: string;
  /**
   * Gotowe liczby kresek (wynik i planer liczą je w całych tygodniach, w górę). Bez tego kreski
   * wychodzą z `pula`, `wykorzystane` i `przepadnie`.
   */
  kreski?: { wykorzystane: number; wolne: number; przepadnie: number };
  /** Dokładne liczby do legendy (mogą być ułamkowe, np. 2,5 tygodnia). Domyślnie liczby kresek. */
  legenda?: { wykorzystane: number; wolne: number; przepadnie?: number };
  /** Zdanie nad paskiem zamiast domyślnego „Zostało X z Y …”. */
  zdanie?: string;
  /** Gdy podane, pasek jest jednym obrazkiem (`role="img"`) z tą etykietą; bez tego jest ukryty dla czytnika. */
  etykietaPaska?: string;
  /** Czy legenda ma wiersz „Przepadnie” (domyślnie tak, gdy coś przepada). */
  legendaPrzepadnie?: boolean;
}

function liczbaTekst(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString('pl-PL', { maximumFractionDigits: 1 });
}

/** Czy liczba bierze formę „2–4” (tygodnie, zostały): 2, 3, 4, 22, 23… ale nie 12–14. */
function formaDwaCztery(n: number): boolean {
  const d = n % 10;
  const s = n % 100;
  return Number.isInteger(n) && d >= 2 && d <= 4 && (s < 12 || s > 14);
}

/** „1 tydzień”, „3 tygodnie”, „12 tygodni”, „2,5 tygodnia”; „1 dzień”, „5 dni”. */
export function liczbaZJednostka(n: number, jednostka: JednostkaPuli): string {
  const t = liczbaTekst(n);
  if (jednostka === 'dni') return `${t} ${n === 1 ? 'dzień' : 'dni'}`;
  if (!Number.isInteger(n)) return `${t} tygodnia`;
  if (n === 1) return '1 tydzień';
  return `${t} ${formaDwaCztery(n) ? 'tygodnie' : 'tygodni'}`;
}

/** „Zostało 12 z 41 tygodni”, „Zostały 3 z 41 tygodni”, „Został 1 z 2 tygodni”, „Zostało 17 z 21 dni”. */
export function opisZostalo(zostalo: number, pula: number, jednostka: JednostkaPuli): string {
  const czasownik = zostalo === 1 ? 'Został' : formaDwaCztery(zostalo) ? 'Zostały' : 'Zostało';
  const dopelniacz =
    jednostka === 'dni' ? (pula === 1 ? 'dnia' : 'dni') : pula === 1 || !Number.isInteger(pula) ? 'tygodnia' : 'tygodni';
  return `${czasownik} ${liczbaTekst(zostalo)} z ${liczbaTekst(pula)} ${dopelniacz}`;
}

function Grupa({ stan, liczba, styl, klasy, podpis, gestosc }: { stan: 'wykorzystany' | 'wolny' | 'przepadnie'; liczba: number; styl?: CSSProperties; klasy?: string; podpis?: ReactNode; gestosc: string }) {
  if (liczba <= 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1" style={{ flex: `${liczba} 1 0%` }}>
      <div className={polacz('flex h-8', gestosc)}>
        {Array.from({ length: liczba }, (_, i) => (
          <span key={i} data-tydzien={stan} className={polacz('h-full min-w-px flex-1 rounded-[2px]', klasy)} style={styl} />
        ))}
      </div>
      {podpis}
    </div>
  );
}

/**
 * Licznik puli z design.md: pasek z kreskami, jedna kreska = jeden tydzień (albo dzień).
 * Wykorzystane/zaplanowane – pełne w kolorze typu, wolne – szare, przepadające – w paski
 * z napisem „przepadnie”. Nad paskiem liczba słownie, pod nim legenda z liczbami.
 * Kreski mają `data-tydzien` (wykorzystany, wolny, przepadnie). Bez `etykietaPaska` są dekoracją
 * dla czytnika (aria-hidden) – wszystko jest też w tekście; z nią pasek to jeden `role="img"`.
 */
export function LicznikPuli({
  nazwa,
  kolor,
  pula,
  wykorzystane,
  przepadnie = 0,
  jednostka = 'tygodnie',
  className,
  kreski,
  legenda,
  zdanie,
  etykietaPaska,
  legendaPrzepadnie = true,
}: LicznikPuliProps) {
  const calosc = Math.max(Math.round(pula), 0);
  const policzone = (() => {
    const u = Math.min(Math.max(Math.round(wykorzystane), 0), calosc);
    const st = Math.min(Math.max(Math.round(przepadnie), 0), calosc - u);
    return { wykorzystane: u, przepadnie: st, wolne: calosc - u - st };
  })();
  const k = kreski ?? policzone;
  const uzyte = k.wykorzystane;
  const strata = k.przepadnie;
  const wolne = k.wolne;
  const razem = uzyte + wolne + strata;
  const wLegendzie = {
    wykorzystane: legenda?.wykorzystane ?? uzyte,
    wolne: legenda?.wolne ?? wolne,
    przepadnie: legenda?.przepadnie ?? strata,
  };
  const c = KOLORY[kolor];
  const gestosc = razem > 60 ? 'gap-px' : 'gap-0.5';

  const stylPelny: CSSProperties = { backgroundColor: c };
  const stylPaski: CSSProperties = {
    backgroundColor: '#ffffff',
    backgroundImage: `repeating-linear-gradient(135deg, ${c} 0 2px, transparent 2px 5px)`,
    boxShadow: `inset 0 0 0 1px ${c}`,
  };

  return (
    <div className={polacz('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-bold text-tekst">{nazwa}</p>
        <p className="text-base font-black text-tekst tabular-nums">{zdanie ?? opisZostalo(wolne, calosc, jednostka)}</p>
      </div>
      <div
        {...(etykietaPaska ? { role: 'img', 'aria-label': etykietaPaska } : { 'aria-hidden': true })}
        className={polacz('flex w-full', gestosc)}
      >
        <Grupa stan="wykorzystany" liczba={uzyte} styl={stylPelny} gestosc={gestosc} />
        <Grupa stan="wolny" liczba={wolne} klasy="border border-szary-ramka bg-white" gestosc={gestosc} />
        <Grupa
          stan="przepadnie"
          liczba={strata}
          styl={stylPaski}
          gestosc={gestosc}
          podpis={<span className="self-end whitespace-nowrap text-sm font-bold text-tekst">przepadnie</span>}
        />
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-tekst tabular-nums">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-2 shrink-0 rounded-[2px]" style={stylPelny} />
          <span>
            Wykorzystane i zaplanowane: <strong>{liczbaZJednostka(wLegendzie.wykorzystane, jednostka)}</strong>
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-2 shrink-0 rounded-[2px] border border-szary-ramka bg-white" />
          <span>
            Wolne: <strong>{liczbaZJednostka(wLegendzie.wolne, jednostka)}</strong>
          </span>
        </li>
        {legendaPrzepadnie && wLegendzie.przepadnie > 0 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3.5 w-2 shrink-0 rounded-[2px]" style={stylPaski} />
            <span>
              Przepadnie: <strong>{liczbaZJednostka(wLegendzie.przepadnie, jednostka)}</strong>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
