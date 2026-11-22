'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconCheck, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { KROKI, aktualnyKrok } from './kroki';

/**
 * Pasek kroków ścieżki rodzica. Na telefonie zwarty („Krok 3 z 6 · Wynik” z paskiem postępu
 * i strzałkami), od 768 px pełna lista kroków. Na trasach spoza ścieżki się nie pokazuje
 * (lista i przypisania w `kroki.ts`).
 */
export function PasekKrokow() {
  const pathname = usePathname();
  const biezacy = aktualnyKrok(pathname);
  if (biezacy === null) return null;

  const krok = KROKI[biezacy];
  const poprzedni = biezacy > 0 ? KROKI[biezacy - 1] : null;
  const nastepny = biezacy < KROKI.length - 1 ? KROKI[biezacy + 1] : null;
  const postep = ((biezacy + 1) / KROKI.length) * 100;

  return (
    <nav aria-label="Kroki" className="border-b border-szary-linia bg-white">
      {/* Telefon */}
      <div className="mx-auto w-full max-w-6xl px-4 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <StrzalkaKroku krok={poprzedni} kierunek="wstecz" />
          <p className="flex-1 text-center" aria-current="step">
            <span className="text-sm text-tekst-drugi">
              Krok {biezacy + 1} z {KROKI.length}
            </span>{' '}
            <span aria-hidden="true" className="text-tekst-drugi">
              ·
            </span>{' '}
            <span className="font-black text-granat">{krok.nazwa}</span>
          </p>
          <StrzalkaKroku krok={nastepny} kierunek="dalej" />
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-przycisk bg-szary-kafel" aria-hidden="true">
          <div className="h-full bg-zielen" style={{ width: `${postep}%` }} />
        </div>
      </div>

      {/* Komputer */}
      <ol className="mx-auto hidden w-full max-w-6xl px-4 md:flex">
        {KROKI.map((k, i) => {
          const zrobiony = i < biezacy;
          const aktualny = i === biezacy;
          const tresc = (
            <>
              <span
                aria-hidden="true"
                className={`flex size-7 shrink-0 items-center justify-center rounded-przycisk text-sm font-black ${
                  aktualny
                    ? 'bg-zielen text-white'
                    : zrobiony
                      ? 'bg-granat text-white'
                      : 'border-2 border-szary-ramka text-tekst-drugi'
                }`}
              >
                {zrobiony ? <IconCheck size={18} stroke={3} /> : i + 1}
              </span>
              <span>{k.nazwa}</span>
              {zrobiony && <span className="sr-only">(zrobione)</span>}
            </>
          );
          const wspolne = 'flex min-h-14 items-center justify-center gap-2 border-b-4 px-1 py-2 text-center lg:px-2';

          return (
            <li key={k.sciezka} className="flex flex-1 items-stretch">
              {aktualny ? (
                <span aria-current="step" className={`${wspolne} w-full border-zielen font-black text-granat`}>
                  {tresc}
                </span>
              ) : zrobiony ? (
                <Link
                  href={k.sciezka}
                  className={`${wspolne} w-full border-transparent font-bold text-zielen rounded-t-przycisk transition-colors duration-150 hover:bg-szary-kafel hover:text-zielen-ciemna`}
                >
                  {tresc}
                </Link>
              ) : (
                // Dalsze kroki też są linkami (uwaga Wojtka 21.11: z planu nie dało się przejść do kalendarza
                // ani dokumentów z paska). Ekrany bez profilu pokazują zachętę do startu.
                <Link
                  href={k.sciezka}
                  className={`${wspolne} w-full border-transparent text-tekst-drugi rounded-t-przycisk transition-colors duration-150 hover:bg-szary-kafel hover:text-tekst`}
                >
                  {tresc}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StrzalkaKroku({
  krok,
  kierunek,
}: {
  krok: { sciezka: string; nazwa: string } | null;
  kierunek: 'wstecz' | 'dalej';
}) {
  // Puste miejsce o tej samej szerokości, żeby napis „Krok n z 6” został na środku.
  if (!krok) return <span className="size-11 shrink-0" aria-hidden="true" />;

  const Ikona = kierunek === 'wstecz' ? IconChevronLeft : IconChevronRight;
  const opis = kierunek === 'wstecz' ? `Poprzedni krok: ${krok.nazwa}` : `Następny krok: ${krok.nazwa}`;

  return (
    <Link
      href={krok.sciezka}
      aria-label={opis}
      title={opis}
      className="flex size-11 shrink-0 items-center justify-center rounded-przycisk border-2 border-zielen text-zielen transition-colors duration-150 hover:bg-zielen hover:text-white"
    >
      <Ikona size={22} stroke={2.25} aria-hidden="true" />
    </Link>
  );
}
