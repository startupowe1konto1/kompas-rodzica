'use client';

/**
 * Pasek sekcji u góry każdego ekranu pytań: kolor sekcji, ikona, tytuł i (na komputerze) opis. Bez „Część X z N”:
 * postęp pokazuje licznik „Krok X z N” nad ankietą (decyzja Wojtka 22.11 – bez podwójnego liczenia).
 * Zastąpił osobne ekrany otwierające sekcje (wariant A po testach na stoisku 22.11: krótki kafel na przemian z długą
 * kartą pytań dawał „sinusoidę” wysokości). Na telefonie pasek jest zwarty: mniejsza ikona, bez opisu.
 *
 * Pasek stoi poza animowaną treścią ekranu: w obrębie sekcji się nie rusza, przy zmianie sekcji płynnie zmienia
 * kolor (przejście CSS), a nowa ikona i tekst wchodzą przenikaniem.
 */
import { forwardRef, useEffect, useRef, type ComponentType } from 'react';
import {
  IconBabyBottle,
  IconBabyCarriage,
  IconBriefcase,
  IconCoin,
  IconHeartbeat,
  IconListCheck,
  IconReceiptTax,
  IconUser,
  type IconProps,
} from '@tabler/icons-react';
import { polacz } from '../ui';
import { bezRuchu, KRZYWA_WEJSCIA } from './ruch';
import type { KrokAnkiety } from './typy';

/**
 * Kolory sekcji w jednym miejscu, po identyfikatorze sekcji (nie po kolejności, bo kolejność zależy od odpowiedzi).
 * Kontrasty (WCAG): biały na `zielen` 5,6:1, na `granat` 10,6:1, na `odc-ojcowski` 6,1:1, na `odc-chorobowy` 5,8:1,
 * na `granat-ciemny` 11,9:1; `granat` na `lawenda` (#e9e3f5) 8,5:1.
 */
export const KAFEL_ZIELONY = 'bg-zielen text-white';
export const KAFEL_KONCOWY = 'bg-zielen-noc text-white';
const KOLORY_SEKCJI: Record<string, string> = {
  kim_jestes: KAFEL_ZIELONY,
  dziecko: 'bg-granat text-white',
  ubezpieczenie: 'bg-odc-ojcowski text-white',
  zarobki: 'bg-lawenda text-granat', // delikatny fiolet z ciemnym tekstem (uwaga zespołu: poprzedni fiolet raził)
  ciaza: 'bg-odc-chorobowy text-white',
  po_porodzie: KAFEL_ZIELONY,
  podatek: 'bg-granat-ciemny text-white',
};

/** Kształt dużego kafla ekranu końcowego „Plan jest gotowy”. */
export const KSZTALT_KAFLA = 'flex flex-1 flex-col gap-4 rounded-karta p-6 md:flex-none md:p-10';

/** Wspólny układ paska sekcji i jego szkieletu (`SzkieletAnkiety`), żeby po wczytaniu nic nie skakało. */
export const UKLAD_PASKA = {
  zewnatrz: 'mx-auto w-full max-w-3xl px-4 pb-4',
  kafel: 'rounded-karta px-4 py-3 md:p-6',
  wiersz: 'flex items-center gap-3 md:gap-5',
  ikona: 'flex size-11 shrink-0 items-center justify-center rounded-przycisk md:size-16 md:rounded-karta',
} as const;

const IKONY: Record<string, ComponentType<IconProps>> = {
  kim_jestes: IconUser,
  dziecko: IconBabyCarriage,
  ubezpieczenie: IconBriefcase,
  zarobki: IconCoin,
  ciaza: IconHeartbeat,
  po_porodzie: IconBabyBottle,
  podatek: IconReceiptTax,
};

export interface PasekSekcjiProps {
  krok: KrokAnkiety;
}

/** Ref wskazuje nagłówek sekcji (h2): `Ankieta` przenosi na niego fokus po zmianie ekranu. */
export const PasekSekcji = forwardRef<HTMLHeadingElement, PasekSekcjiProps>(function PasekSekcji({ krok }, ref) {
  const Ikona = IKONY[krok.id] ?? IconListCheck;
  const kolory = KOLORY_SEKCJI[krok.id] ?? KAFEL_ZIELONY;
  const tresc = useRef<HTMLDivElement>(null);
  const poprzedniKrok = useRef(krok.id);

  // Nowa sekcja: ikona i tekst wchodzą przenikaniem (200 ms), w tym samym czasie co zmiana koloru tła.
  useEffect(() => {
    if (poprzedniKrok.current === krok.id) return;
    poprzedniKrok.current = krok.id;
    if (bezRuchu()) return;
    tresc.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: KRZYWA_WEJSCIA });
  }, [krok.id]);

  return (
    <div className={UKLAD_PASKA.zewnatrz} data-sekcja={krok.id}>
      <div className={polacz(UKLAD_PASKA.kafel, 'transition-[background-color,color] duration-200 ease-[ease]', kolory)}>
        <div ref={tresc} className={UKLAD_PASKA.wiersz}>
          <span aria-hidden className={polacz(UKLAD_PASKA.ikona, 'border-2 border-current')}>
            <Ikona stroke={1.75} className="size-6 md:size-9" />
          </span>
          <div className="min-w-0">
            <h2 id={`krok-${krok.id}`} ref={ref} tabIndex={-1} className="text-lg font-black leading-tight outline-none! md:text-2xl">
              {krok.tytul}
            </h2>
            {krok.opis && <p className="mt-1 hidden max-w-prose leading-normal md:block">{krok.opis}</p>}
          </div>
        </div>
      </div>
    </div>
  );
});
