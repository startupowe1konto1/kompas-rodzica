'use client';

/**
 * „Dodaj osobę” (tor C, C4): wybór, kim jest druga osoba dla dziecka, krótka ankieta tylko o niej
 * i przejście do wyniku łącznego. Którą osobę wypełniamy, mówi adres (`?osoba=<id>`), dzięki czemu
 * odświeżenie strony w trakcie nie gubi miejsca. Ile osób i w jakich rolach liczy plan, rozstrzyga silnik.
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { IconPencil, IconTrash, IconUserPlus } from '@tabler/icons-react';
import type { Osoba, Rola } from '../../engine/types';
import { useProfil } from '../../state/profil';
import { Ankieta } from '../pytania/Ankieta';
import { Karta, Przycisk, StanLadowania, StanPusty, Wybor, type OpcjaWyboru } from '../ui';
import { dodajOsobe, przesunPochodzenie, przesunSciezki, usunOsobe } from './dodajOsobe';

const ROLE: { wartosc: Rola; etykieta: string; opis?: string }[] = [
  { wartosc: 'ojciec', etykieta: 'Tata' },
  { wartosc: 'matka', etykieta: 'Mama' },
  { wartosc: 'przyjmujacy', etykieta: 'Osoba przyjmująca dziecko', opis: 'Przysposobienie (adopcja) albo rodzina zastępcza.' },
  { wartosc: 'inny_czlonek_rodziny', etykieta: 'Inny członek najbliższej rodziny', opis: 'Np. babcia lub dziadek, gdy przejmują opiekę nad dzieckiem.' },
];
const OPCJE: OpcjaWyboru[] = ROLE.map((r) => ({ wartosc: r.wartosc, etykieta: r.etykieta, opis: r.opis }));

function nazwaOsoby(o: Osoba, nr: number): string {
  const rola = ROLE.find((r) => r.wartosc === o.rola)?.etykieta ?? 'Osoba';
  return o.dane?.imie ? `${o.dane.imie} (${rola})` : `${rola}, osoba ${nr}`;
}

const KLASA_STRONY = 'mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10';

export function EkranDodajOsobe() {
  const router = useRouter();
  const szukaj = useSearchParams();
  const idWypelnianej = szukaj.get('osoba');
  const { gotowy, rodzina, pochodzenie, doPotwierdzenia, ustawRodzine, ustawPlany, ustawPochodzenie, ustawDoPotwierdzenia } = useProfil();
  const [doUsuniecia, ustawDoUsuniecia] = useState<string | null>(null);

  if (!gotowy) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="text-2xl font-black text-granat lg:text-3xl">Dodaj osobę</h1>
        <StanLadowania />
      </main>
    );
  }
  if (!rodzina) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="sr-only">Dodaj osobę</h1>
        <StanPusty
          tytul="Nie mamy jeszcze danych"
          opis="Żeby dodać drugą osobę, potrzebujemy najpierw kilku informacji o Pani/Panu i dziecku."
          akcja={<Przycisk href="/">Zacznij od początku</Przycisk>}
        />
      </main>
    );
  }

  const indeksWypelnianej = idWypelnianej ? rodzina.osoby.findIndex((o, i) => i > 0 && o.id === idWypelnianej) : -1;

  function usun(id: string) {
    const i = rodzina!.osoby.findIndex((o) => o.id === id);
    if (i <= 0) return;
    ustawRodzine((r) => (r ? usunOsobe(r, id) : r));
    ustawPochodzenie(przesunPochodzenie(pochodzenie, i));
    ustawDoPotwierdzenia(przesunSciezki(doPotwierdzenia, i));
    ustawPlany([]);
    ustawDoUsuniecia(null);
    if (id === idWypelnianej) router.replace('/osoba');
  }

  // ───── Krótka ankieta tej osoby ─────
  if (indeksWypelnianej > 0) {
    return (
      <main className="flex flex-1 flex-col">
        <h1 className="sr-only">Dodaj osobę</h1>
        <div className="mx-auto flex w-full max-w-3xl justify-end px-4 pt-2">
          <button
            type="button"
            onClick={() => usun(rodzina.osoby[indeksWypelnianej].id)}
            className="inline-flex min-h-11 items-center gap-1 rounded-przycisk px-2 font-bold text-granat hover:bg-szary-kafel"
          >
            <IconTrash size={20} stroke={2} aria-hidden />
            Zrezygnuj z dodawania
          </button>
        </div>
        <Ankieta
          opcje={{ osoba: indeksWypelnianej, tylkoOsoba: true, pominPytania: ['rola'] }}
          etykietaZakonczenia="Zobacz wynik łączny"
          poZakonczeniu={() => router.push('/wynik')}
        />
      </main>
    );
  }

  // ───── Wybór osoby i lista już dodanych ─────
  const dodane = rodzina.osoby.map((o, i) => ({ o, i })).filter(({ i }) => i > 0);

  function wybierz(rola: string) {
    const w = dodajOsobe(rodzina!, rola as Rola);
    ustawRodzine(w.rodzina);
    ustawPlany([]);
    router.replace(`/osoba?osoba=${encodeURIComponent(w.rodzina.osoby[w.indeks].id)}`);
  }

  return (
    <main className={KLASA_STRONY}>
      <h1 className="text-2xl font-black text-granat lg:text-3xl">Dodaj osobę</h1>
      <p className="max-w-prose text-lg leading-normal">
        Drugi rodzic, osoba przyjmująca dziecko albo ktoś z rodziny może mieć własne uprawnienia. Po dodaniu tej osoby policzymy plan dla wszystkich razem.
      </p>

      {dodane.length > 0 && (
        <Karta jako="section" aria-labelledby="dodane-tytul" className="flex flex-col gap-3" data-sekcja="dodane-osoby">
          <h2 id="dodane-tytul" className="text-xl font-black text-granat">
            Dodane osoby
          </h2>
          <ul className="flex flex-col divide-y divide-szary-linia">
            {dodane.map(({ o, i }) => (
              <li key={o.id} data-osoba-id={o.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold">{nazwaOsoby(o, i + 1)}</p>
                {doUsuniecia === o.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Przycisk wariant="drugi" onClick={() => ustawDoUsuniecia(null)}>
                      Zostaw
                    </Przycisk>
                    <Przycisk onClick={() => usun(o.id)}>Tak, usuń osobę</Przycisk>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Przycisk
                      href={`/osoba?osoba=${encodeURIComponent(o.id)}`}
                      wariant="drugi"
                      ikona={<IconPencil size={20} />}
                      aria-label={`Popraw odpowiedzi: ${nazwaOsoby(o, i + 1)}`}
                    >
                      Popraw odpowiedzi
                    </Przycisk>
                    <Przycisk wariant="drugi" ikona={<IconTrash size={20} />} onClick={() => ustawDoUsuniecia(o.id)} aria-label={`Usuń: ${nazwaOsoby(o, i + 1)}`}>
                      Usuń
                    </Przycisk>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Karta>
      )}

      <Karta className="flex flex-col gap-4">
        <Wybor legenda="Kim ta osoba jest dla dziecka?" opcje={OPCJE} name="rola-nowej-osoby" onZmiana={wybierz} />
        <p className="flex items-center gap-2 text-sm text-tekst-drugi">
          <IconUserPlus size={18} aria-hidden />
          Po wyborze zadamy tylko pytania o tę osobę.
        </p>
      </Karta>

      {dodane.length > 0 && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-szary-linia bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Przycisk
            pelnaSzerokosc
            className="md:w-auto md:min-w-56"
            onClick={() => {
              ustawPlany([]);
              router.push('/wynik');
            }}
          >
            Zobacz wynik łączny
          </Przycisk>
        </div>
      )}
    </main>
  );
}
