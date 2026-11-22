'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { polacz } from '../ui';
import { NakladkaSekcji } from './NakladkaSekcji';

export interface DefinicjaSekcji {
  /** Stały identyfikator: `data-kafel-sekcji`, kotwica `#sekcja-<id>`. */
  id: string;
  tytul: string;
  /** Ikona Tabler 24 px, dekoracyjna. */
  ikona: ReactNode;
  /** Jedna linijka na kaflu; pusta, gdy dane jeszcze się ładują. */
  skrot: string;
  /** Stan danych sekcji: kafel pokazuje „Liczymy…” albo „Nie udało się wczytać”. */
  stan?: 'gotowe' | 'laduje' | 'blad';
  /** Treść widoczna po otwarciu na cały ekran. Renderowana dopiero po kliknięciu. */
  tresc: () => ReactNode;
}

const TEKST_STANU = { laduje: 'Liczymy…', blad: 'Nie udało się wczytać' } as const;

/** Prefiks kotwicy: `/wynik#sekcja-uprawnienia` otwiera nakładkę „Co przysługuje”. */
export const PREFIKS_KOTWICY = 'sekcja-';

/**
 * Siatka kafli sekcji wyniku (komputer 3 w rzędzie, tablet 2, telefon 1) i nakładka otwierana na cały ekran.
 * Po zamknięciu fokus wraca na kafel.
 */
export function SiatkaSekcji({ sekcje }: { sekcje: DefinicjaSekcji[] }) {
  const [otwarta, ustawOtwarta] = useState<{ id: string; poczatek: DOMRect } | null>(null);
  const kafle = useRef(new Map<string, HTMLButtonElement>());

  const otworz = useCallback((id: string) => {
    const kafel = kafle.current.get(id);
    if (!kafel) return;
    ustawOtwarta({ id, poczatek: kafel.getBoundingClientRect() });
  }, []);

  // Kotwica z innego miejsca (np. `#sekcja-wybory`) otwiera odpowiednią nakładkę.
  useEffect(() => {
    function zHasha() {
      const h = window.location.hash.replace(/^#/, '');
      if (h.startsWith(PREFIKS_KOTWICY)) otworz(h.slice(PREFIKS_KOTWICY.length));
    }
    zHasha();
    window.addEventListener('hashchange', zHasha);
    return () => window.removeEventListener('hashchange', zHasha);
  }, [otworz]);

  const def = otwarta ? sekcje.find((s) => s.id === otwarta.id) : undefined;
  const idOtwartej = otwarta?.id;
  const pobierzCel = useCallback(() => (idOtwartej ? (kafle.current.get(idOtwartej)?.getBoundingClientRect() ?? null) : null), [idOtwartej]);
  const poZamknieciu = useCallback(() => {
    const id = idOtwartej;
    ustawOtwarta(null);
    if (id) kafle.current.get(id)?.focus({ preventScroll: true });
  }, [idOtwartej]);

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sekcje.map((s) => {
          const opis = s.stan && s.stan !== 'gotowe' ? TEKST_STANU[s.stan] : s.skrot;
          return (
            <li key={s.id} className="flex">
              <button
                type="button"
                ref={(el) => {
                  if (el) kafle.current.set(s.id, el);
                  else kafle.current.delete(s.id);
                }}
                data-kafel-sekcji={s.id}
                aria-haspopup="dialog"
                onClick={() => otworz(s.id)}
                className={polacz(
                  'flex min-h-32 w-full flex-col justify-between gap-4 rounded-karta p-4 text-left transition-transform duration-200 active:scale-[0.98] motion-reduce:transition-none lg:p-6',
                  // Wszystkie kafle neutralne, bez wyróżnionego granatowego (decyzja Wojtka 22.11).
                  'border border-szary-linia bg-white text-tekst',
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-lg font-black leading-snug text-granat">{s.tytul}</span>
                  <span aria-hidden className="shrink-0 text-granat">
                    {s.ikona}
                  </span>
                </span>
                <span className="text-base leading-snug text-tekst-drugi">{opis}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {otwarta && def && (
        <NakladkaSekcji
          key={def.id}
          tytul={def.tytul}
          ikona={def.ikona}
          poczatek={otwarta.poczatek}
          pobierzCel={pobierzCel}
          onZamknieta={poZamknieciu}
        >
          {def.tresc()}
        </NakladkaSekcji>
      )}
    </>
  );
}
