/**
 * Czyste funkcje pomocnicze pól list i kilku umów (tor C, C3, T1.3b): bez Reacta, testowane w Vitest.
 */
import type { RodzajTytulu, Rodzina, TytulUbezpieczenia } from '../../engine/types';
import { zapiszWartosc } from './silnik-ankiety';
import type { BladPola } from './typy';

// ───────────────────────── Miesiące ─────────────────────────

const MIESIAC = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** '2026-01' → '2025-12'. Nieczytelny miesiąc → undefined. */
export function poprzedniMiesiac(miesiac: string): string | undefined {
  const m = MIESIAC.exec(miesiac);
  if (!m) return undefined;
  let rok = Number(m[1]);
  let nr = Number(m[2]) - 1;
  if (nr === 0) {
    nr = 12;
    rok -= 1;
  }
  return `${String(rok).padStart(4, '0')}-${String(nr).padStart(2, '0')}`;
}

/**
 * Miesiąc, który podpowiadamy w nowym wierszu: pierwszy wiersz to miesiąc przed miesiącem analizy,
 * kolejne idą wstecz, przed najwcześniejszym wpisanym miesiącem.
 */
export function miesiacDoDodania<T extends { miesiac: string }>(wiersze: T[] | undefined, dataAnalizy: string): string {
  const poprawne = (wiersze ?? []).map((w) => w.miesiac).filter((m) => MIESIAC.test(m));
  const najwczesniejszy = poprawne.sort()[0];
  const baza = najwczesniejszy ?? dataAnalizy.slice(0, 7);
  return poprzedniMiesiac(baza) ?? '';
}

// ───────────────────────── Tytuły ubezpieczenia ─────────────────────────

export const NAZWY_TYTULOW: Record<RodzajTytulu, string> = {
  umowa_o_prace: 'Umowa o pracę',
  zlecenie: 'Umowa zlecenia',
  dzialalnosc: 'Działalność gospodarcza',
  // Nie proponujemy jej w liście wyboru (RODZAJE_POZA_WYBOREM), ale zapisany profil może ją mieć.
  wspolpraca: 'Współpraca przy działalności gospodarczej',
  inny: 'Inne ubezpieczenie',
};

/**
 * Rodzaje, których nie pokazujemy w liście wyboru. „Współpraca przy działalności” myliła się na stoisku
 * z pracą na czarno, więc zniknęła z ankiety i kalkulatora. Typ w silniku zostaje, a profil, który już
 * ma taki tytuł, dalej go widzi (opcja wraca na listę tylko wtedy, gdy jest zaznaczona).
 */
export const RODZAJE_POZA_WYBOREM: readonly RodzajTytulu[] = ['wspolpraca'];

/** Opcje do pokazania: bez rodzajów spoza wyboru, chyba że profil już taki rodzaj ma (`obecne`). */
export function opcjeDoWyboru<T extends { wartosc: unknown }>(opcje: T[], obecne: readonly unknown[]): T[] {
  return opcje.filter((o) => !(RODZAJE_POZA_WYBOREM as readonly unknown[]).includes(o.wartosc) || obecne.includes(o.wartosc));
}

/**
 * Nazwa tytułu, np. „Umowa o pracę 2”. `zawszeNumer: false` – numer tylko wtedy, gdy tytułów
 * tego rodzaju jest więcej niż jeden (podpis nad pytaniem).
 */
export function nazwaTytulu(tytuly: TytulUbezpieczenia[], indeks: number, zawszeNumer = true): string {
  const t = tytuly[indeks];
  if (!t) return '';
  const takie = tytuly.filter((x) => x.rodzaj === t.rodzaj);
  const nazwa = NAZWY_TYTULOW[t.rodzaj];
  return zawszeNumer || takie.length > 1 ? `${nazwa} ${takie.indexOf(t) + 1}` : nazwa;
}

/** Rodzaj nowej umowy po „Dodaj kolejną umowę lub działalność”: taki jak ostatnio dodany, a bez tytułów – etat. */
export function rodzajNowejUmowy(tytuly: TytulUbezpieczenia[]): RodzajTytulu {
  return tytuly.at(-1)?.rodzaj ?? 'umowa_o_prace';
}

/**
 * Zmienia rodzaj tytułu. Chorobowe poprawiamy tylko przy przejściu na etat (obowiązkowe)
 * albo z etatu (brak, o dobrowolne zapytamy w ankiecie). Bez mutacji.
 */
export function zmienRodzajTytulu(rodzina: Rodzina, osoba: number, tytul: number, rodzaj: RodzajTytulu): Rodzina {
  const tytuly = rodzina.osoby[osoba]?.tytuly ?? [];
  const t = tytuly[tytul];
  if (!t || t.rodzaj === rodzaj) return rodzina;
  let chorobowe = t.chorobowe;
  if (rodzaj === 'umowa_o_prace') chorobowe = 'obowiazkowe';
  else if (t.rodzaj === 'umowa_o_prace') chorobowe = 'brak';
  return zapiszWartosc(
    rodzina,
    `osoby[${osoba}].tytuly`,
    tytuly.map((x, i) => (i === tytul ? { ...x, rodzaj, chorobowe } : x)),
  );
}

// ───────────────────────── Odpowiedzi do potwierdzenia ─────────────────────────

const lezyPod = (sciezka: string, przodek: string) => sciezka.startsWith(`${przodek}.`) || sciezka.startsWith(`${przodek}[`);

/**
 * Wpisy z listy „do potwierdzenia”, które dotyczą pytania o danej ścieżce: ten sam wpis, wpis nadrzędny
 * (np. 'zdarzenie' dla 'zdarzenie.data') albo wpis podrzędny (np. 'osoby[0].tytuly[0]' dla 'osoby[0].tytuly').
 */
export function pasujaceDoPotwierdzenia(sciezka: string, doPotwierdzenia: string[]): string[] {
  return doPotwierdzenia.filter((w) => w === sciezka || lezyPod(sciezka, w) || lezyPod(w, sciezka));
}

// ───────────────────────── Błędy wierszy list ─────────────────────────

/** Błędy jednego wiersza listy, po nazwie pola: `{ kwota: …, miesiac: … }`. Pierwszy błąd pola wygrywa. */
export function bledyWiersza(bledy: BladPola[], indeks: number): Record<string, BladPola> {
  const wynik: Record<string, BladPola> = {};
  const prefiks = `[${indeks}].`;
  for (const b of bledy) {
    if (b.pole?.startsWith(prefiks)) wynik[b.pole.slice(prefiks.length)] ??= b;
  }
  return wynik;
}
