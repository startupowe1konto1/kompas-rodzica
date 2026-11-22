import type { Rodzina, WykorzystaniePuli, WynikUprawnien, WynikWalidacji } from '../../engine/types';
import { licznikiPul, type LicznikPuliDane } from '../pule/liczniki';
import { LicznikPuliWynik, NAZWY_PUL } from '../pule/LicznikiPul';
import { tygodnie } from '../pule/opisy';
import { useSyncExternalStore } from 'react';
import { Rozwijane } from '../ui';
import { etykietaOsoby } from './etykiety';

/** Gdy walidacja planu zawodzi: ile tygodni przysługuje w ogóle (nic jeszcze nie zaplanowano). */
function pulaZUprawnien(p: WynikUprawnien['pule'], rodzina: Rodzina): WykorzystaniePuli[] {
  const dni = (t: number) => t * 7;
  const wpisy: WykorzystaniePuli[] = [{ pula: 'macierzynski', wykorzystaneDni: 0, dostepneDni: dni(p.macierzynskiTyg) }];
  if (p.uzupelniajacyTyg > 0) wpisy.push({ pula: 'uzupelniajacy', wykorzystaneDni: 0, dostepneDni: dni(p.uzupelniajacyTyg) });
  if (p.rodzicielskiTyg > 0) wpisy.push({ pula: 'rodzicielski', wykorzystaneDni: 0, dostepneDni: dni(p.rodzicielskiTyg) });
  if (p.ojcowskiTyg > 0 && rodzina.osoby.some((o) => o.rola === 'ojciec')) {
    wpisy.push({ pula: 'ojcowski', wykorzystaneDni: 0, dostepneDni: dni(p.ojcowskiTyg) });
  }
  return wpisy;
}

export interface PuleWyniku {
  /** Pule z walidacji planu albo, gdy ta zawodzi, z uprawnień (bez zaplanowanych tygodni). */
  wykorzystanie: WykorzystaniePuli[] | null;
  /** True, gdy pokazujemy pule z uprawnień zamiast z walidacji. */
  zapasowe: boolean;
  /** Czekamy na pule zapasowe (walidacja zawiodła, uprawnienia jeszcze się ładują). */
  czeka: boolean;
}

/** Wybiera źródło pul: walidacja planu, a gdy zawodzi – uprawnienia. */
const ZAPYTANIE_KOMPUTERA = '(min-width: 1024px)';
function subskrybujKomputer(zmiana: () => void) {
  const m = window.matchMedia(ZAPYTANIE_KOMPUTERA);
  m.addEventListener('change', zmiana);
  return () => m.removeEventListener('change', zmiana);
}
const czyKomputer = () => window.matchMedia(ZAPYTANIE_KOMPUTERA).matches;

export function pulaWyniku(
  walidacja: { dane: WynikWalidacji | null; blad: unknown },
  uprawnienia: { dane: WynikUprawnien | null; laduje: boolean },
  rodzina: Rodzina,
): PuleWyniku {
  const zapasoweDane = walidacja.blad && !walidacja.dane && uprawnienia.dane ? pulaZUprawnien(uprawnienia.dane.pule, rodzina) : null;
  return {
    wykorzystanie: walidacja.dane?.wykorzystanie ?? zapasoweDane,
    zapasowe: zapasoweDane !== null,
    czeka: walidacja.blad !== null && !walidacja.dane && uprawnienia.laduje,
  };
}

/**
 * Wyjaśnienie dla puli rodzicielskiej. Stan prawny: ZUS-BRIEF.md, sekcja 8 (tabela świadczeń, wiersz „Rodzicielski”)
 * i EC-59: 9 tygodni tylko dla każdego rodzica, nie przechodzi na drugiego (KP art. 182¹a § 4);
 * urlop rodzicielski najpóźniej do końca roku, w którym dziecko kończy 6 lat (KP art. 182¹c).
 */
function WyjasnieniePrzepadania() {
  return (
    <Rozwijane tytul="Dlaczego przepadają i jak ich użyć?">
      <div className="flex max-w-prose flex-col gap-2 leading-normal">
        <p>Każdy rodzic ma 9 tygodni urlopu rodzicielskiego tylko dla siebie. Nie można ich przekazać drugiemu rodzicowi (KP art. 182¹a § 4).</p>
        <p>Żeby nie przepadły, rodzic, któremu przysługują, musi je wykorzystać. Najpóźniej do końca roku, w którym dziecko kończy 6 lat (KP art. 182¹c).</p>
      </div>
    </Rozwijane>
  );
}

function tytulPuli(l: LicznikPuliDane, rodzina: Rodzina): string {
  const kto = l.osobaId ? etykietaOsoby(rodzina, l.osobaId) : undefined;
  return `${NAZWY_PUL[l.pula]}${kto ? ` (${kto})` : ''}`;
}

/**
 * Pule urlopów: każdy rodzaj urlopu to zwinięty wiersz „Urlop rodzicielski – 41 tygodni”;
 * po rozwinięciu licznik z paskiem (1 kreska = 1 tydzień) i, gdy coś przepada, wyjaśnienie.
 */
export function TrescPul({
  wykorzystanie,
  zapasowe,
  odswiez,
  rodzina,
}: {
  wykorzystanie: WykorzystaniePuli[];
  zapasowe: boolean;
  odswiez: () => void;
  rodzina: Rodzina;
}) {
  // Komputer: rodzaje urlopu od razu rozwinięte (jest miejsce); telefon: zwinięte (uwaga zespołu 21.11).
  const komputer = useSyncExternalStore(subskrybujKomputer, czyKomputer, () => false);
  const liczniki = licznikiPul(wykorzystanie);
  return (
    <div className="flex flex-col gap-3">
      {zapasowe && (
        <div role="status" data-stan="pule-zapasowe" className="flex flex-col items-start gap-1">
          <p className="text-tekst-drugi">Nie udało się jeszcze sprawdzić planu, więc pokazujemy, ile tygodni w ogóle przysługuje.</p>
          <button type="button" onClick={odswiez} className="min-h-11 font-bold text-granat underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </div>
      )}
      {liczniki.length === 0 && <p className="text-tekst-drugi">Nie ma jeszcze czego liczyć.</p>}
      {liczniki.map((l) => {
        const nazwa = tytulPuli(l, rodzina);
        const kto = l.osobaId ? etykietaOsoby(rodzina, l.osobaId) : undefined;
        return (
          <div key={`${l.pula}-${l.osobaId ?? ''}`} data-pula={l.pula} data-osoba={l.osobaId} data-przepadnie-tyg={l.przepadnieTyg}>
            <Rozwijane tytul={`${nazwa} – ${tygodnie(l.dostepneTyg)}`} domyslnieOtwarte={komputer}>
              <div className="flex flex-col gap-4">
                <LicznikPuliWynik dane={l} nazwa={nazwa} kto={kto} />
                {l.przepadnieTyg > 0 && l.pula.startsWith('rodzicielski') && <WyjasnieniePrzepadania />}
              </div>
            </Rozwijane>
          </div>
        );
      })}
    </div>
  );
}
