/**
 * Okres i miesięczne wynagrodzenia składające się na podstawę wymiaru zasiłku pracownika.
 *
 * Uproszczenie: ZUS uznaje miesiąc za pełny także wtedy, gdy ubezpieczenie zaczęło się w pierwszym
 * dniu roboczym miesiąca. Silnik nie ma kalendarza świąt, więc wymaga 1. dnia miesiąca.
 */
import { miesiac, pierwszyDzienMiesiaca, przesunMiesiac } from '../daty';
import type { DataISO, KrokWyliczenia, MiesiacISO, MiesiacPodstawy, TytulUbezpieczenia } from '../types';

/** UZ art. 36 ust. 1: okres 12 miesięcy kalendarzowych poprzedzających miesiąc powstania prawa. */
export const MIESIECY_OKRESU_PODSTAWY = 12;

/**
 * Pierwszy pełny miesiąc kalendarzowy ubezpieczenia chorobowego z tytułu.
 * UZ art. 36 ust. 2 i art. 37 ust. 1: liczą się tylko pełne miesiące ubezpieczenia, więc miesiąc rozpoczęty
 * w trakcie (po 1. dniu) odpada.
 */
function pierwszyPelnyMiesiac(tytul: TytulUbezpieczenia): MiesiacISO {
  const poczatek = tytul.chorobowoOd ?? tytul.od;
  return poczatek === pierwszyDzienMiesiaca(miesiac(poczatek)) ? miesiac(poczatek) : przesunMiesiac(miesiac(poczatek), 1);
}

/**
 * Pełne miesiące kalendarzowe ubezpieczenia chorobowego przed miesiącem powstania prawa, najwyżej 12, rosnąco.
 * UZ art. 36 ust. 1–2.
 */
export function okresPodstawy(tytul: TytulUbezpieczenia, dataPowstaniaPrawa: DataISO): MiesiacISO[] {
  const pierwszyPelny = pierwszyPelnyMiesiac(tytul);
  const miesiacPrawa = miesiac(dataPowstaniaPrawa);
  const najwczesniejszy = przesunMiesiac(miesiacPrawa, -MIESIECY_OKRESU_PODSTAWY);
  const koniec = przesunMiesiac(miesiacPrawa, -1); // UZ art. 36 ust. 1: miesiąca powstania prawa nie liczymy
  const wynik: MiesiacISO[] = [];
  for (let m = pierwszyPelny > najwczesniejszy ? pierwszyPelny : najwczesniejszy; m <= koniec; m = przesunMiesiac(m, 1)) {
    wynik.push(m);
  }
  return wynik;
}

const WZORZEC_MIESIACA = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Czy klucz to poprawny `MiesiacISO` ('RRRR-MM', miesiąc 01–12). '2025-9' przechodzi porównanie tekstowe, więc sprawdzamy go tutaj. */
export const czyPoprawnyMiesiac = (m: string): boolean => WZORZEC_MIESIACA.test(m);

/** Kwota miesiąca nadająca się do liczenia: skończona i nieujemna (undefined i NaN odpadają). */
const kwotaMiesiacaPoprawna = (kwota: number): boolean => Number.isFinite(kwota) && kwota >= 0;

/**
 * Wpisy listy `podstawaSkladek` do liczenia: tylko z poprawnym kluczem miesiąca (`czyPoprawnyMiesiac`), jeden wpis na miesiąc.
 * Przy dwóch wpisach tego samego miesiąca wygrywa ostatni na liście (późniejszy wpis traktujemy jak korektę),
 * żeby miesiąc nie liczył się do średniej dwa razy. Wspólne dla wyboru okresu, średniej i szacunku.
 */
export function wpisyListy<T extends { miesiac: MiesiacISO }>(lista: readonly T[] | undefined): T[] {
  const poMiesiacu = new Map<MiesiacISO, T>();
  for (const wpis of lista ?? []) if (czyPoprawnyMiesiac(wpis.miesiac)) poMiesiacu.set(wpis.miesiac, wpis);
  return [...poMiesiacu.values()];
}

/**
 * Miesiące do szacunku podstawy, gdy lista `podstawaSkladek` nie ma żadnego miesiąca z okresu podstawy
 * (np. urlop zaczyna się ponad rok po ostatnim miesiącu widocznym w eZUS): ostatnie, najwyżej 12, miesiące listy
 * sprzed okresu, od pierwszego pełnego miesiąca ubezpieczenia, rosnąco. Pusta tablica, gdy szacunku nie robimy:
 * lista ma miesiąc z okresu, okres jest pusty (wtedy UZ art. 37 albo art. 49) albo brak wcześniejszych miesięcy.
 * Szacunek zastępuje brakujące dane za okres z UZ art. 36 ust. 1 (pracownik) i art. 48 ust. 1 (pozostali).
 */
export function ostatnieZnaneMiesiace(tytul: TytulUbezpieczenia, okres: MiesiacISO[]): MiesiacISO[] {
  const lista = wpisyListy(tytul.podstawaSkladek);
  if (okres.length === 0 || lista.some((m) => okres.includes(m.miesiac))) return [];
  const pierwszyPelny = pierwszyPelnyMiesiac(tytul);
  // Miesiące z niepoprawną kwotą odpadają PRZED wyborem ostatnich 12: ich miejsce zajmuje wcześniejszy poprawny miesiąc,
  // zamiast zostawić szacunek bez danych.
  const wczesniejsze = lista.filter((m) => m.miesiac >= pierwszyPelny && m.miesiac < okres[0] && kwotaMiesiacaPoprawna(m.kwota));
  return wczesniejsze.map((m) => m.miesiac).sort().slice(-MIESIECY_OKRESU_PODSTAWY);
}

/** Krok ścieżki o szacunku z `ostatnieZnaneMiesiace`; przepis: UZ art. 36 ust. 1 (pracownik) albo art. 48 ust. 1. */
export function krokSzacunku(znane: MiesiacISO[], przepis: string): KrokWyliczenia {
  return {
    opis: 'Szacunek: brak danych za miesiące przed urlopem, liczymy z ostatnich znanych miesięcy',
    wzor: `${znane.length} mies. od ${znane[0]} do ${znane[znane.length - 1]}`,
    przepis,
  };
}

/** Miesiąc z podanymi dniami, w którym przepracowano mniej niż obowiązek (czyli niepełny). */
function niepelny(m: MiesiacPodstawy): m is MiesiacPodstawy & { dniPrzepracowane: number; dniObowiazku: number } {
  return (
    m.dniPrzepracowane !== undefined &&
    m.dniObowiazku !== undefined &&
    m.dniObowiazku > 0 &&
    m.dniPrzepracowane < m.dniObowiazku
  );
}

/** Czy w miesiącu przepracowano mniej niż połowę obowiązującego czasu pracy. UZ art. 38 ust. 2 pkt 1. */
export function ponizejPolowy(m: MiesiacPodstawy): boolean {
  return niepelny(m) && m.dniPrzepracowane * 2 < m.dniObowiazku;
}

/** Kwoty na groszach całkowitych: dzielenie i mnożenie bez błędów liczb zmiennoprzecinkowych. */
export const grosze = (kwota: number): number => Math.round(kwota * 100);

/** Średnia kwot zaokrąglona do grosza (połówki w górę), liczona na groszach całkowitych. UZ art. 38 ust. 1. */
export function sredniaGroszy(kwoty: number[]): number {
  return Math.round(kwoty.reduce((s, k) => s + grosze(k), 0) / kwoty.length) / 100;
}

const nieujemna = (x: number | undefined): boolean => x === undefined || (Number.isFinite(x) && x >= 0);

/** Czy dane miesiąca nadają się do liczenia (kwoty skończone i nieujemne, dni skończone). */
function daneSaPoprawne(m: MiesiacPodstawy): boolean {
  return (
    nieujemna(m.kwota) &&
    nieujemna(m.skladnikiStale) &&
    nieujemna(m.skladnikiZmienne) &&
    (m.dniPrzepracowane === undefined || Number.isFinite(m.dniPrzepracowane)) &&
    (m.dniObowiazku === undefined || Number.isFinite(m.dniObowiazku))
  );
}

/**
 * Wynagrodzenie miesiąca niepełnego uzupełnione do pełnego miesiąca. UZ art. 37 ust. 2 pkt 2, art. 38 ust. 2 pkt 2.
 * Null, gdy dane są niepoprawne albo nie przepracowano żadnego dnia (uzupełnienie wymaga choćby 1 dnia, art. 37 ust. 2 pkt 2).
 *
 * Znaczenie pól według formularza Z-3 (tabela „Składniki wynagrodzenia za okresy miesięczne”):
 * `skladnikiStale` = kolumna 6, składniki stałe w pełnej miesięcznej wysokości z umowy (nie kwota wypłacona);
 * `skladnikiZmienne` = kolumna 7, składniki pomniejszone proporcjonalnie, w kwocie wypłaconej, które się uzupełnia.
 * Kolumny 8 (składniki w kwocie faktycznej, bez uzupełniania, np. nadgodziny) kontrakt nie ma:
 * w miesiącu niepełnym z podanymi składnikami bierzemy stałe + uzupełnione zmienne i nie używamy `kwota`.
 * Bez pól składników uzupełniamy całą `kwota` tak jak zmienne.
 */
export function uzupelnione(m: MiesiacPodstawy): number | null {
  if (!daneSaPoprawne(m)) return null;
  if (!niepelny(m)) return m.kwota;
  if (m.dniPrzepracowane <= 0) return null;
  const uzupelnienie = (kwota: number) => Math.round((grosze(kwota) * m.dniObowiazku) / m.dniPrzepracowane);
  if (m.skladnikiStale === undefined && m.skladnikiZmienne === undefined) return uzupelnienie(m.kwota) / 100;
  return (grosze(m.skladnikiStale ?? 0) + uzupelnienie(m.skladnikiZmienne ?? 0)) / 100;
}

/**
 * Wynagrodzenie miesiąca po zastosowaniu art. 38 ust. 2 i art. 37 ust. 2; null = miesiąc wyłączony.
 *
 * Wyłączenie dotyczy nieobecności z przyczyn usprawiedliwionych (UZ art. 38 ust. 2; Z-3 kolumna 5).
 * Kontrakt nie ma pola przyczyny, więc każdą nieobecność traktujemy jako usprawiedliwioną.
 */
export function wynagrodzenieMiesiaca(m: MiesiacPodstawy): { kwota: number; uzupelniony: boolean } | null {
  if (!daneSaPoprawne(m)) return null; // niepoprawny miesiąc traktujemy jak brak danych
  if (ponizejPolowy(m)) return null; // UZ art. 38 ust. 2 pkt 1
  if (niepelny(m)) {
    const kwota = uzupelnione(m); // UZ art. 38 ust. 2 pkt 2
    return kwota === null ? null : { kwota, uzupelniony: true };
  }
  return { kwota: m.kwota, uzupelniony: false };
}
