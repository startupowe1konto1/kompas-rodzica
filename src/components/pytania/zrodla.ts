/**
 * Znaczniki źródeł danych przy polach ankiety i lista „czego żadna usługa nie ma”
 * (tor C: C2 – ekran „Pobieramy Twoje dane”, C3 – znacznik przy polu).
 *
 * Uczciwość symulacji: znacznik usługi pokazujemy tylko wtedy, gdy według
 * `docs/zrodla-danych.json` ta usługa NAPRAWDĘ ma daną pytania (status „potwierdzone”).
 * Jeśli persona twierdzi, że cały tytuł ubezpieczenia przyszedł z eZUS, to i tak przy
 * „wymiarze etatu” albo „ponad 20 osobach” znacznika eZUS nie będzie, bo eZUS tych danych nie ma.
 */
import mapaZrodel from '../../../docs/zrodla-danych.json';
import type { PochodzenieDanej, RodzajTytulu, Rodzina, TytulUbezpieczenia, ZrodloId } from '../../engine/types';
import { formatujDate } from '../format';
import { odczytajWartosc, widocznePytania } from './silnik-ankiety';
import type { DefinicjaPytania, PytanieWidoczne } from './typy';

interface RekordMapy {
  id: string;
  etykieta: string;
  zrodla: { zrodlo: string; status: string }[];
  zawszeUzytkownik: boolean;
}

const MAPA = new Map((mapaZrodel as RekordMapy[]).map((r) => [r.id, r]));

/** Tekst znacznika przy polu. Usługi bez logotypów – tylko słowo. */
export const ETYKIETY_ZRODEL: Record<ZrodloId, string> = {
  mobywatel: 'z mObywatela',
  login_gov: 'z login.gov.pl',
  ezus: 'z eZUS',
  eurzad_skarbowy: 'z e-Urzędu Skarbowego',
  ceidg: 'z CEIDG',
  ikp: 'z Internetowego Konta Pacjenta',
  rsc: 'z rejestru stanu cywilnego',
  empatia: 'z Emp@tii',
  pracodawca: 'od pracodawcy',
  lekarz_szpital: 'z zaświadczenia lekarskiego',
  sad: 'z dokumentów z sądu',
  formularz_pdf: 'z wgranego wniosku',
  uzytkownik: 'wpisane przez Panią/Pana',
};

/** Źródła, które nie są symulacją usługi (rodzic wpisał sam albo wgrał swój wniosek). */
const BEZ_SYMULACJI: ZrodloId[] = ['uzytkownik', 'formularz_pdf'];

export interface ZnacznikZrodla {
  zrodlo: ZrodloId;
  etykieta: string;
  /** true = dane z symulowanej usługi; UI dopisuje wtedy „(symulacja)”. */
  symulacja: boolean;
}

function znacznik(zrodlo: ZrodloId): ZnacznikZrodla {
  return { zrodlo, etykieta: ETYKIETY_ZRODEL[zrodlo], symulacja: !BEZ_SYMULACJI.includes(zrodlo) };
}

/** Ścieżka w `Rodzina` → znacznik źródła. Przy powtórzonej ścieżce wygrywa ostatni wpis. */
export function znacznikiZrodel(pochodzenie: PochodzenieDanej[]): Record<string, ZnacznikZrodla> {
  const wynik: Record<string, ZnacznikZrodla> = {};
  for (const p of pochodzenie) wynik[p.sciezka] = znacznik(p.zrodlo);
  return wynik;
}

/** Czy ta usługa naprawdę ma tę daną (mapa źródeł, status „potwierdzone”). */
function uslugaMaDana(zrodlo: ZrodloId, daneId: string | null): boolean {
  if (BEZ_SYMULACJI.includes(zrodlo) || daneId === null) return true;
  const rekord = MAPA.get(daneId);
  if (!rekord) return true;
  return rekord.zrodla.some((z) => z.zrodlo === zrodlo && z.status === 'potwierdzone');
}

/** Ścieżki-przodkowie, od najbliższej: 'a[0].b.c' → ['a[0].b', 'a[0]', 'a']. */
function przodkowie(sciezka: string): string[] {
  const wynik: string[] = [];
  for (let i = sciezka.length - 1; i > 0; i--) {
    if (sciezka[i] === '.' || sciezka[i] === '[') wynik.push(sciezka.slice(0, i));
  }
  return wynik;
}

/**
 * Znacznik dla pytania: z dokładnej ścieżki, z najbliższego przodka (np. cały tytuł z eZUS)
 * albo z potomka (np. lista tytułów, gdy eZUS dał jeden z nich). Zawsze sprawdzamy w mapie,
 * czy usługa ma daną pytania. Brak znacznika = rodzic wpisuje sam.
 */
export function znacznikDlaPytania(
  znaczniki: Record<string, ZnacznikZrodla>,
  pytanie: Pick<PytanieWidoczne, 'sciezka' | 'def'>,
): ZnacznikZrodla | undefined {
  const { sciezka, def } = pytanie;
  const pasuje = (z: ZnacznikZrodla | undefined) => z !== undefined && uslugaMaDana(z.zrodlo, def.daneId);

  if (pasuje(znaczniki[sciezka])) return znaczniki[sciezka];
  for (const p of przodkowie(sciezka)) if (pasuje(znaczniki[p])) return znaczniki[p];
  const potomkowie = Object.keys(znaczniki)
    .filter((k) => k.startsWith(`${sciezka}.`) || k.startsWith(`${sciezka}[`))
    .map((k) => znaczniki[k])
    .filter(pasuje);
  return potomkowie.find((z) => z.zrodlo !== 'uzytkownik') ?? potomkowie[0];
}

// ───────────────────────── Ekran „Pobieramy Twoje dane” ─────────────────────────

export interface BrakujacaDana {
  pytanieId: string;
  klucz: string;
  sciezka: string;
  etykieta: string;
  daneId: string | null;
  /** `zadna_usluga_nie_ma` – żadna e-usługa tego nie ma (mapa: `zawszeUzytkownik`); `nie_pobrano` – usługa mogłaby, ale nie przyszło. */
  powod: 'zadna_usluga_nie_ma' | 'nie_pobrano';
  /** Skąd przepisać (dokument papierowy), jeśli wiadomo. */
  skadWziac?: string;
  wymagane: boolean;
  /** Czy pole ma już wartość (np. wpisaną wcześniej przez rodzica). */
  wypelnione: boolean;
}

const SKAD_WZIAC: Partial<Record<ZrodloId, string>> = {
  lekarz_szpital: 'Proszę przepisać z zaświadczenia lekarskiego.',
  sad: 'Proszę przepisać z dokumentów z sądu.',
  pracodawca: 'Proszę sprawdzić w umowie albo zapytać w kadrach.',
};

function wypelnione(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return false;
  return !Array.isArray(v) || v.length > 0;
}

/**
 * Widoczne pytania, na które nie odpowiedziała żadna usługa – rodzic musi je wpisać sam.
 * Dane z wgranego wniosku traktujemy jak pobrane (rodzic ich teraz nie przepisuje).
 */
export function brakujaceDane(defs: DefinicjaPytania[], rodzina: Rodzina, pochodzenie: PochodzenieDanej[]): BrakujacaDana[] {
  const znaczniki = znacznikiZrodel(pochodzenie);
  const wynik: BrakujacaDana[] = [];
  for (const p of widocznePytania(defs, rodzina)) {
    const z = znacznikDlaPytania(znaczniki, p);
    if (z && z.zrodlo !== 'uzytkownik') continue;
    const rekord = p.def.daneId === null ? undefined : MAPA.get(p.def.daneId);
    // Najpierw podpowiedź z pytania; ogólna wskazówka „z dokumentu” nie pasuje do wyborów typu rola czy etap.
    const papier = p.def.typ === 'wybor' ? undefined : rekord?.zrodla.map((x) => SKAD_WZIAC[x.zrodlo as ZrodloId]).find(Boolean);
    const skadWziac = p.def.podpowiedz ?? papier;
    wynik.push({
      pytanieId: p.def.id,
      klucz: p.klucz,
      sciezka: p.sciezka,
      etykieta: p.def.etykieta,
      daneId: p.def.daneId,
      powod: rekord && !rekord.zawszeUzytkownik ? 'nie_pobrano' : 'zadna_usluga_nie_ma',
      ...(skadWziac ? { skadWziac } : {}),
      wymagane: Boolean(p.def.wymagane),
      wypelnione: wypelnione(p.wartosc),
    });
  }
  return wynik;
}

export interface GrupaZrodla {
  zrodlo: ZrodloId;
  etykieta: string;
  symulacja: boolean;
  pozycje: { sciezka: string; etykieta: string }[];
}

const NAZWY_DANYCH_OSOBOWYCH: Record<string, string> = {
  imie: 'Imię',
  nazwisko: 'Nazwisko',
  pesel: 'PESEL',
  dataUrodzenia: 'Data urodzenia',
  adres: 'Adres',
  telefon: 'Telefon',
  email: 'E-mail',
  rachunekBankowy: 'Numer rachunku bankowego',
};

const NAZWY_TYTULOW: Record<RodzajTytulu, string> = {
  umowa_o_prace: 'Umowa o pracę',
  zlecenie: 'Umowa zlecenia',
  dzialalnosc: 'Działalność gospodarcza',
  // Tej opcji nie ma już w liście wyboru, ale zapisany profil może ją mieć.
  wspolpraca: 'Współpraca przy działalności gospodarczej',
  inny: 'Inny tytuł ubezpieczenia',
};

const NAZWY_KONCOWEK: [RegExp, string][] = [
  [/\.podstawaSkladek$/, 'Podstawy składek z ostatnich 12 miesięcy'],
  [/\.zdrowie\.eZLA$/, 'Zwolnienia lekarskie (e-ZLA)'],
  [/\.zadluzenieSkladkowe$/, 'Zaległości w składkach'],
  [/\.ustanie$/, 'Koniec umowy'],
  [/^zdarzenie\.data$/, 'Data porodu albo przyjęcia dziecka'],
  [/^zdarzenie\.dzieci/, 'Dane dziecka'],
];

function etykietaSciezki(sciezka: string, rodzina: Rodzina, defs: DefinicjaPytania[]): string {
  const osobowe = /\.dane\.(\w+)/.exec(sciezka);
  if (osobowe && NAZWY_DANYCH_OSOBOWYCH[osobowe[1]]) return NAZWY_DANYCH_OSOBOWYCH[osobowe[1]];
  if (/\.tytuly\[\d+\]$/.test(sciezka)) {
    const t = odczytajWartosc(rodzina, sciezka) as TytulUbezpieczenia | undefined;
    if (t) {
      const czesci = [NAZWY_TYTULOW[t.rodzaj] ?? 'Tytuł ubezpieczenia'];
      if (t.nazwaPlatnika) czesci.push(t.nazwaPlatnika);
      if (t.od) czesci.push(`od ${formatujDate(t.od)}`);
      return czesci.join(', ');
    }
  }
  for (const [wzor, nazwa] of NAZWY_KONCOWEK) if (wzor.test(sciezka)) return nazwa;
  const pytanie = widocznePytania(defs, rodzina).find((p) => p.sciezka === sciezka);
  return pytanie?.def.etykieta ?? sciezka;
}

/** Co przyszło z której usługi – do listy na ekranie „Pobieramy Twoje dane”. Bez danych wpisanych przez rodzica. */
export function daneZeZrodel(defs: DefinicjaPytania[], rodzina: Rodzina, pochodzenie: PochodzenieDanej[]): GrupaZrodla[] {
  const grupy: GrupaZrodla[] = [];
  for (const p of pochodzenie) {
    if (p.zrodlo === 'uzytkownik') continue;
    let g = grupy.find((x) => x.zrodlo === p.zrodlo);
    if (!g) {
      g = { ...znacznik(p.zrodlo), pozycje: [] };
      grupy.push(g);
    }
    g.pozycje.push({ sciezka: p.sciezka, etykieta: etykietaSciezki(p.sciezka, rodzina, defs) });
  }
  return grupy;
}
