/**
 * Dane symulowanego logowania przez krajowy węzeł login.gov.pl i kroku zgody.
 * Czyste stałe i funkcje (bez Reacta), żeby dało się je testować w Vitest.
 * Zakres danych każdej usługi według docs/zrodla-danych.md, część (a): pokazujemy tylko to,
 * co dana usługa naprawdę ma. Bez logotypów: usługi nazywamy słowami z dopiskiem „(symulacja)”.
 */
import type { PochodzenieDanej, ZrodloId } from '../../engine/types';

export type IdMetody = 'profil-zaufany' | 'mobywatel' | 'e-dowod' | 'bank';

export interface MetodaLogowania {
  id: IdMetody;
  /** Nazwa na przycisku wyboru. */
  nazwa: string;
  /** Nazwa w zdaniu „Logowanie przez …”. */
  wZdaniu: string;
  opis: string;
}

export const METODY_LOGOWANIA: readonly MetodaLogowania[] = [
  {
    id: 'profil-zaufany',
    nazwa: 'Profil zaufany (symulacja)',
    wZdaniu: 'profil zaufany (symulacja)',
    opis: 'Login i hasło profilu zaufanego albo logowanie przez bank.',
  },
  {
    id: 'mobywatel',
    nazwa: 'Aplikacja mObywatel (symulacja)',
    wZdaniu: 'aplikację mObywatel (symulacja)',
    opis: 'Potwierdzenie w aplikacji na telefonie.',
  },
  {
    id: 'e-dowod',
    nazwa: 'e-dowód (symulacja)',
    wZdaniu: 'e-dowód (symulacja)',
    opis: 'Dowód osobisty z warstwą elektroniczną i czytnik albo telefon z NFC.',
  },
  {
    id: 'bank',
    nazwa: 'Bankowość elektroniczna (symulacja)',
    wZdaniu: 'bankowość elektroniczną (symulacja)',
    opis: 'Logowanie przez serwis banku.',
  },
];

export function metodaPoId(id: string): MetodaLogowania | undefined {
  return METODY_LOGOWANIA.find((m) => m.id === id);
}

export interface UslugaDoZgody {
  zrodlo: ZrodloId;
  /** Nazwa w nagłówku listy. */
  nazwa: string;
  /** Nazwa w zdaniu zgody („z mObywatela”). */
  wZdaniu: string;
  /** Co dokładnie zostanie pobrane. */
  dane: string[];
}

/** Zakres danych e-usług według docs/zrodla-danych.md (a). Kolejność = kolejność na ekranie. */
const ZAKRES: Partial<Record<ZrodloId, Omit<UslugaDoZgody, 'zrodlo'>>> = {
  mobywatel: {
    nazwa: 'mObywatel (symulacja)',
    wZdaniu: 'mObywatela',
    dane: [
      'PESEL, imię i nazwisko, data urodzenia (rejestr PESEL)',
      'adres zameldowania',
      'imię, nazwisko i PESEL małżonka',
      'dane dziecka po zarejestrowaniu urodzenia: imię, nazwisko, PESEL, data i miejsce urodzenia',
    ],
  },
  ezus: {
    nazwa: 'eZUS (symulacja)',
    wZdaniu: 'eZUS',
    dane: [
      'dane identyfikacyjne i adres ze zgłoszenia do ubezpieczeń',
      'okresy i tytuły ubezpieczenia oraz płatnik składek (nazwa, NIP, REGON)',
      'podstawy wymiaru składek z ostatnich 12 miesięcy',
      'pobrane zasiłki i przerwy w opłacaniu składek',
      'zwolnienia lekarskie (e-ZLA)',
    ],
  },
  eurzad_skarbowy: {
    nazwa: 'e-Urząd Skarbowy (symulacja)',
    wZdaniu: 'e-Urzędu Skarbowego',
    dane: ['adres zamieszkania i osobisty rachunek bankowy', 'dane działalności gospodarczej: nazwa firmy, NIP, REGON'],
  },
  ceidg: {
    nazwa: 'CEIDG (symulacja)',
    wZdaniu: 'CEIDG',
    dane: ['daty rozpoczęcia, zawieszenia i wznowienia działalności gospodarczej'],
  },
  ikp: {
    nazwa: 'Internetowe Konto Pacjenta (symulacja)',
    wZdaniu: 'Internetowego Konta Pacjenta',
    dane: ['zwolnienia lekarskie widoczne na koncie pacjenta'],
  },
};

/** Usługi odpytywane zawsze (PobieranieDanych pyta mObywatel, potem eZUS). */
const ZAWSZE: ZrodloId[] = ['mobywatel', 'ezus'];

/**
 * Lista usług do kroku zgody: zawsze mObywatel i eZUS, a do tego inne e-usługi, z których
 * pochodzą dane persony. Źródła, które nie są e-usługą (sąd, rodzic, wgrany wniosek), pomija.
 */
export function uslugiDoZgody(pochodzenie: PochodzenieDanej[]): UslugaDoZgody[] {
  const zrodla = new Set<ZrodloId>(ZAWSZE);
  for (const p of pochodzenie) if (ZAKRES[p.zrodlo]) zrodla.add(p.zrodlo);
  return (Object.keys(ZAKRES) as ZrodloId[])
    .filter((z) => zrodla.has(z))
    .map((z) => ({ zrodlo: z, ...ZAKRES[z]! }));
}

/** „z mObywatela i eZUS”, „z mObywatela, eZUS i CEIDG”. */
export function zdanieUslug(uslugi: UslugaDoZgody[]): string {
  const nazwy = uslugi.map((u) => u.wZdaniu);
  if (nazwy.length <= 1) return nazwy.join('');
  return `${nazwy.slice(0, -1).join(', ')} i ${nazwy.at(-1)}`;
}

/** Danych, których żadna usługa nie ma (docs/zrodla-danych.md, część c): wpisuje je rodzic. */
export const CZEGO_NIE_POBIERAMY = [
  'przewidywanej daty porodu',
  'składników wynagrodzenia i wymiaru etatu',
  'planu urlopów i podziału z drugim rodzicem',
];

/*
 * Symulacja logowania w węźle: krok między wyborem metody a wyborem osoby testowej.
 * Każda metoda ma własny przebieg wzorowany na prawdziwym węźle. Czas fazy w ms, `null` = faza czeka
 * na klik (formularz profilu zaufanego, wybór banku). Część bez klikania trwa 2–4 s (test w Vitest).
 */
export type FazaSymulacji =
  | 'formularz'
  | 'sprawdzanie'
  | 'telefon'
  | 'karta'
  | 'odczyt'
  | 'wybor-banku'
  | 'przekierowanie'
  | 'potwierdzenie-bank'
  | 'zalogowano';

export interface KrokSymulacji {
  faza: FazaSymulacji;
  /** Ile trwa faza (ms); `null`, gdy czeka na działanie użytkownika. */
  czas: number | null;
}

const PRZEBIEGI: Record<IdMetody, readonly KrokSymulacji[]> = {
  'profil-zaufany': [
    { faza: 'formularz', czas: null },
    { faza: 'sprawdzanie', czas: 1400 },
    { faza: 'zalogowano', czas: 700 },
  ],
  mobywatel: [
    { faza: 'telefon', czas: 2500 },
    { faza: 'zalogowano', czas: 700 },
  ],
  'e-dowod': [
    { faza: 'karta', czas: 1400 },
    { faza: 'odczyt', czas: 1300 },
    { faza: 'zalogowano', czas: 700 },
  ],
  bank: [
    { faza: 'wybor-banku', czas: null },
    { faza: 'przekierowanie', czas: 1200 },
    { faza: 'potwierdzenie-bank', czas: 1400 },
    { faza: 'zalogowano', czas: 700 },
  ],
};

export function przebiegSymulacji(id: IdMetody): readonly KrokSymulacji[] {
  return PRZEBIEGI[id];
}

/** Łączny czas faz, które mijają same (bez kliknięć). */
export function czasBezKlikania(id: IdMetody): number {
  return PRZEBIEGI[id].reduce((s, k) => s + (k.czas ?? 0), 0);
}

/** Komunikat stanu każdej fazy (region aria-live i tekst na ekranie). */
export const KOMUNIKATY_FAZ: Record<FazaSymulacji, string> = {
  formularz: 'Proszę zalogować się profilem zaufanym. Pola są wypełnione danymi symulacyjnymi.',
  sprawdzanie: 'Sprawdzamy dane…',
  telefon: 'Czekamy na potwierdzenie w aplikacji mObywatel…',
  karta: 'Proszę przyłożyć dowód osobisty do czytnika albo telefonu z NFC.',
  odczyt: 'Odczytujemy dane z warstwy elektronicznej…',
  'wybor-banku': 'Proszę wybrać bank.',
  przekierowanie: 'Przekierowanie do serwisu banku…',
  'potwierdzenie-bank': 'Proszę potwierdzić logowanie w aplikacji banku. Czekamy na potwierdzenie…',
  zalogowano: 'Zalogowano (symulacja).',
};

export interface BankSymulacja {
  id: string;
  nazwa: string;
}

/** Ogólne nazwy zamiast prawdziwych banków (CLAUDE.md: bez nazw i logotypów banków). */
export const BANKI_SYMULACJA: readonly BankSymulacja[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((l) => ({
  id: `bank-${l.toLowerCase()}`,
  nazwa: `Bank ${l} (symulacja)`,
}));

/** Wartości pokazywane w polach tylko do odczytu. Nikt nie wpisuje tu prawdziwych danych. */
export const DANE_SYMULACYJNE = {
  login: 'osoba.testowa',
  /** Hasło pokazujemy wyłącznie jako kropki. */
  haslo: '••••••••••',
  can: '123456',
} as const;

/** Czterocyfrowy kod do porównania z aplikacją (1000–9999). `losuj` podawane z zewnątrz, żeby dało się testować. */
export function kodWeryfikacyjny(losuj: () => number): string {
  return String(1000 + Math.floor(losuj() * 9000));
}
