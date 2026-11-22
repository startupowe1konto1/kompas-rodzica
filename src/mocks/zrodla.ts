/**
 * SYMULACJE ŹRÓDEŁ DANYCH – TOR D (Mikołaj). ZADANIA.md, tor D, D1.
 *
 * Zasada (CLAUDE.md): symulowana usługa zwraca tylko te dane, które naprawdę ma – według mapy
 * docs/zrodla-danych.json. Z pełnej persony bierzemy pola, których rekord mapy wymienia tę usługę na liście
 * `zrodla`; resztę opisujemy w `brakuje` etykietami z mapy.
 *
 * Jawne tabele (każdą zmianę mapy łapią testy w __tests__/zrodla.test.ts):
 *  - SCIEZKI_MAPY – pole kontraktu (ścieżka w Rodzinie) → rekordy mapy,
 *  - ZALOZENIA – które wpisy „założenie” z mapy symulujemy, a których nie, i dlaczego,
 *  - ZAKRES_USLUG – czego dotyczy lista `brakuje` danej usługi.
 *
 * Lista (tytuły, dzieci, e-ZLA) może przyjść niepełna: usługa, która nie zna całej listy, oddaje te elementy i pola,
 * które zna (np. e-Urząd Skarbowy – nazwę i NIP własnej firmy). Wtedy `pochodzenie` wymienia pola, ale nie listę.
 * Dane innych osób (małżonek w rejestrze PESEL) przychodzą w `OdpowiedzZrodla.osoby`.
 */
import mapa from '../../docs/zrodla-danych.json';
import { dodajDni } from '../engine/daty';
import type {
  CzesciowaOsoba,
  DataISO,
  DaneOsobowe,
  DokumentZrodla,
  OdpowiedzZrodla,
  Osoba,
  PochodzenieDanej,
  Rodzina,
  StatusDokumentuZrodla,
  TytulUbezpieczenia,
  ZrodloId,
} from '../engine/types';
import { MALZONKOWIE, PERSONY } from './persony';

// ───────────────────────── Mapa źródeł ─────────────────────────

export interface RekordMapy {
  id: string;
  etykieta: string;
  grupa: string;
  potrzebne_do: string[];
  zrodla: { zrodlo: string; status: string; dowod: string; uwaga: string }[];
  zrodloDomyslne: string;
  zawszeUzytkownik: boolean;
}

export const MAPA = mapa as RekordMapy[];
const REKORDY = new Map(MAPA.map((r) => [r.id, r]));

function rekord(id: string): RekordMapy {
  const r = REKORDY.get(id);
  if (!r) throw new Error(`Nie ma w docs/zrodla-danych.json rekordu "${id}".`);
  return r;
}

/** E-usługi, które da się „zapytać”. Pracodawca, lekarz i sąd to papierowe dokumenty – dane z nich wpisuje rodzic. */
export const USLUGI = ['mobywatel', 'login_gov', 'ezus', 'eurzad_skarbowy', 'ceidg', 'ikp', 'rsc', 'empatia'] as const;
export type Usluga = (typeof USLUGI)[number];

export function czyUsluga(zrodlo: string): zrodlo is Usluga {
  return (USLUGI as readonly string[]).includes(zrodlo);
}

const NIE_USLUGI: readonly string[] = ['pracodawca', 'lekarz_szpital', 'sad', 'uzytkownik', 'formularz_pdf'];

/**
 * Wpisy „założenie” z mapy: czy symulacja udaje, że usługa ma tę daną. Symulujemy tylko tam, gdzie bez założenia
 * usługa nie oddałaby danych wymaganych w zadaniu. Numery pytań – docs/zrodla-danych.md, część (d).
 */
export const ZALOZENIA: Record<string, { symulujemy: boolean; dlaczego: string }> = {
  'wnioskodawca_pesel/login_gov': {
    symulujemy: false,
    dlaczego: 'Nie wiemy, czy „niepowtarzalny identyfikator” z Węzła Krajowego to PESEL (pytanie 9). login.gov.pl to logowanie, nie źródło danych.',
  },
  'rodzaj_ubezpieczenia_chorobowego/ezus': {
    symulujemy: true,
    dlaczego: 'Bez tego eZUS nie odda pełnego tytułu ubezpieczenia. Rodzaj chorobowego wynika z kodu tytułu i podstawy na chorobowe (pytanie 3).',
  },
  'wymiar_etatu/ezus': { symulujemy: false, dlaczego: 'Szczegóły ubezpieczenia w eZUS nie mają wymiaru etatu (pytanie 2).' },
  'urlop_wychowawczy/ezus': {
    symulujemy: false,
    dlaczego: 'Nie wiemy, czy „Świadczenia i przerwy w opłacaniu składek” pokazują urlop wychowawczy (pytanie 5).',
  },
  'liczba_dzieci_przy_jednym_porodzie/mobywatel': {
    symulujemy: false,
    dlaczego: 'Rejestr PESEL nie ma pola „poród mnogi”, a nie wiemy, czy aplikacja pokazuje listę dzieci (pytanie 10).',
  },
  'przewidywana_data_porodu/ikp': { symulujemy: false, dlaczego: 'W IKP nie ma modułu ciąży ani terminu porodu (pytanie 11).' },
  'dziecko_tydzien_ciazy_i_masa/ikp': { symulujemy: false, dlaczego: 'Brak potwierdzenia, że IKP pokazuje tydzień ciąży i masę (pytanie 11).' },
  'dziecko_pobyt_w_szpitalu/ikp': { symulujemy: false, dlaczego: 'Brak potwierdzenia, że IKP pokazuje pobyt noworodka w szpitalu (pytanie 11).' },
  'martwe_urodzenie_albo_zgon_dziecka/rsc': {
    symulujemy: false,
    dlaczego: 'Tej danej aplikacja nigdy nie pobiera sama – pyta o nią ostrożnie.',
  },
  'orzeczenie_o_niezdolnosci_do_samodzielnej_egzystencji/ezus': {
    symulujemy: false,
    dlaczego: 'eZUS ma stopień niepełnosprawności ze zgłoszenia, a to nie jest orzeczenie o niezdolności do samodzielnej egzystencji.',
  },
  'ezla_kod_b/ezus': {
    symulujemy: true,
    dlaczego: 'Wymagane w zadaniu. Zakładamy, że kod widać w podglądzie druku ZUS ZLA (pytanie 4).',
  },
  'rachunek_bankowy/ezus': {
    symulujemy: false,
    dlaczego: 'Rachunek jest w ZUS tylko u osób, które już pobierają świadczenie z ZUS (pytanie 1). Potwierdzone źródło to e-Urząd Skarbowy.',
  },
  'pit2_zlozony/uzytkownik': { symulujemy: true, dlaczego: 'Wpisuje rodzic; nie dotyczy żadnej e-usługi.' },
};

/** Czy usługa ma daną z rekordu mapy (z uwzględnieniem decyzji o założeniach). */
export function zrodloMaRekord(r: RekordMapy, zrodlo: ZrodloId): boolean {
  const wpis = r.zrodla.find((z) => z.zrodlo === zrodlo);
  if (!wpis) return false;
  if (wpis.status !== 'zalozenie') return true;
  return ZALOZENIA[`${r.id}/${zrodlo}`]?.symulujemy ?? false;
}

// ───────────────────────── Pole kontraktu → rekordy mapy ─────────────────────────

export interface KontekstPola {
  rodzina: Rodzina;
  osoba?: Osoba;
  tytul?: TytulUbezpieczenia;
  wartosc: unknown;
}

export interface WierszMapy {
  /** Ścieżka w Rodzinie; `[]` = dowolny indeks. */
  wzor: string;
  /** Rekordy mapy opisujące to pole. Usługa ma pole, gdy ma każdy z nich. */
  dane: string[] | ((k: KontekstPola) => string[]);
  /** Usługi, które mają rekord, ale nie tę część danych, którą trzyma pole kontraktu. */
  bez?: Partial<Record<ZrodloId, string>>;
  /**
   * Gdy usługa nie ma tego pola, a resztę rekordu oddała innym polem (np. eZUS: data ustania bez przyczyny) –
   * `brakuje` dostaje etykietę rekordu z tym dopiskiem, żeby rodzic wiedział, co uzupełnić.
   */
  dopisekWBrakuje?: Partial<Record<ZrodloId, string>>;
  /** Usługa ma pole tylko w opisanej sytuacji. */
  tylkoGdy?: Partial<Record<ZrodloId, (k: KontekstPola) => boolean>>;
  /**
   * Lista, której elementy mają własne wiersze: usługa oddaje jej szkielet, a pola elementów osobno. Usługa, która
   * nie zna całej listy, może oddać same elementy z polami, które zna (szkielet elementu dokleja symulacja).
   */
  lista?: { szkielet: (element: unknown) => object; wymagane?: string[] };
}

/**
 * Czy jest już akt urodzenia dziecka: po porodzie (zgłoszenie urodzenia), a przy przysposobieniu – nowy akt po
 * uprawomocnieniu postanowienia. Wcześniej rejestr PESEL i USC nie mają danych dziecka (docs/zrodla-danych.md, c.6).
 */
export function aktUrodzeniaJest(r: Rodzina): boolean {
  const z = r.zdarzenie;
  if (z.typ === 'porod') return !z.przewidywana;
  return z.dataUprawomocnienia !== undefined && z.dataUprawomocnienia < r.dataAnalizy;
}

const poSporzadzeniuAktu = { mobywatel: (k: KontekstPola) => aktUrodzeniaJest(k.rodzina), rsc: (k: KontekstPola) => aktUrodzeniaJest(k.rodzina) };

/** „Twoja działalność” w e-Urzędzie Skarbowym: nazwa firmy, REGON i PKD – bez dat (rekord dzialalnosc_daty_status). */
const bezDatWEUrzedzie = { eurzad_skarbowy: 'e-Urząd Skarbowy ma nazwę firmy, REGON i PKD, ale nie daty działalności.' };

/** Okres tytułu: przy działalności to daty z wpisu (CEIDG), przy umowach – okres ubezpieczenia z eZUS. */
const rekordOkresu = (k: KontekstPola) => (k.tytul?.rodzaj === 'dzialalnosc' ? 'dzialalnosc_daty_status' : 'tytuly_ubezpieczenia_okresy');

/** Data porodu przewidywana → zaświadczenie lekarskie; faktyczna → data urodzenia z aktu; przyjęcie → oświadczenie i sąd. */
function rekordDatyZdarzenia(k: KontekstPola): string[] {
  const z = k.rodzina.zdarzenie;
  if (z.typ !== 'porod') return ['zdarzenie_typ_i_data_przyjecia'];
  return z.przewidywana ? ['przewidywana_data_porodu'] : ['dziecko_dane_podstawowe'];
}

const tylkoWlasnaFirma = { eurzad_skarbowy: (k: KontekstPola) => k.tytul?.rodzaj === 'dzialalnosc' };

export const SCIEZKI_MAPY: WierszMapy[] = [
  // Osoba
  { wzor: 'osoby[].rola', dane: ['wnioskodawca_plec_rola'], bez: { mobywatel: 'Rejestr PESEL ma płeć, a nie rolę wobec dziecka.' } },
  { wzor: 'osoby[].pit2', dane: ['pit2_zlozony'] },
  { wzor: 'osoby[].dane.imie', dane: ['wnioskodawca_imie_nazwisko'] },
  { wzor: 'osoby[].dane.nazwisko', dane: ['wnioskodawca_imie_nazwisko'] },
  { wzor: 'osoby[].dane.pesel', dane: ['wnioskodawca_pesel'] },
  { wzor: 'osoby[].dane.dataUrodzenia', dane: ['wnioskodawca_data_urodzenia'] },
  {
    wzor: 'osoby[].dane.adres',
    dane: ['wnioskodawca_adres'],
    // eZUS zna adres ze zgłoszenia do ubezpieczeń (ZUA/ZZA) albo z e-ZLA – bez nich go nie ma.
    tylkoGdy: { ezus: (k) => (k.osoba?.tytuly.length ?? 0) > 0 || (k.osoba?.zdrowie?.eZLA?.length ?? 0) > 0 },
  },
  { wzor: 'osoby[].dane.telefon', dane: ['wnioskodawca_telefon'] },
  // Mapa nie ma osobnego rekordu na e-mail; e-Urząd Skarbowy podaje „dane kontaktowe” (uwaga w rekordzie telefonu).
  { wzor: 'osoby[].dane.email', dane: ['wnioskodawca_telefon'] },
  { wzor: 'osoby[].dane.rachunekBankowy', dane: ['rachunek_bankowy'] },
  { wzor: 'osoby[].urlopWychowawczy', dane: ['urlop_wychowawczy'] },
  // e-ZLA: okresy zna eZUS i IKP, kod B tylko eZUS (założenie). Brak `kodB` = nie wiadomo (kontrakt).
  { wzor: 'osoby[].zdrowie.eZLA', dane: ['ezla_okresy'], lista: { szkielet: () => ({}), wymagane: ['od', 'do'] } },
  { wzor: 'osoby[].zdrowie.eZLA[].od', dane: ['ezla_okresy'] },
  { wzor: 'osoby[].zdrowie.eZLA[].do', dane: ['ezla_okresy'] },
  { wzor: 'osoby[].zdrowie.eZLA[].kodB', dane: ['ezla_kod_b'] },
  { wzor: 'osoby[].zdrowie.orzeczenieNiezdolnosciSamodzielnejEgzystencji', dane: ['orzeczenie_o_niezdolnosci_do_samodzielnej_egzystencji'] },
  {
    wzor: 'osoby[].zdrowie.pobytWSzpitalu',
    dane: ['pobyt_wnioskodawcy_w_szpitalu'],
    // eZUS zna okres hospitalizacji tylko z e-ZLA.
    tylkoGdy: {
      ezus: (k) =>
        (k.wartosc as { od: DataISO; do: DataISO }[]).every((p) => k.osoba?.zdrowie?.eZLA?.some((z) => z.od <= p.od && p.do <= z.do)),
    },
  },
  { wzor: 'osoby[].zdrowie.zgon', dane: ['sytuacja_matki'] },
  { wzor: 'osoby[].zdrowie.porzucenieDziecka', dane: ['sytuacja_matki'] },
  // eZUS, „Świadczenia i przerwy” i panel świadczeniobiorcy: kod, okres, procent, kwota, kto wypłacał.
  { wzor: 'osoby[].pobraneZasilki', dane: ['pobrane_zasilki'] },
  // Tytuły ubezpieczenia (lista – także pusta, gdy eZUS nie ma żadnego zgłoszenia)
  {
    wzor: 'osoby[].tytuly',
    dane: ['tytuly_ubezpieczenia_okresy'],
    lista: { szkielet: (t) => ({ id: (t as TytulUbezpieczenia).id }), wymagane: ['rodzaj', 'chorobowe', 'od'] },
  },
  { wzor: 'osoby[].tytuly[].rodzaj', dane: ['tytuly_ubezpieczenia_okresy'] },
  { wzor: 'osoby[].tytuly[].od', dane: (k) => [rekordOkresu(k)], bez: bezDatWEUrzedzie },
  {
    wzor: 'osoby[].tytuly[].do',
    // Koniec trwającej umowy zna tylko umowa; eZUS (i CEIDG przy działalności) pokaże go dopiero po wyrejestrowaniu.
    dane: (k) => ((k.wartosc as DataISO) < k.rodzina.dataAnalizy ? [rekordOkresu(k)] : ['umowa_czas_okreslony']),
    bez: bezDatWEUrzedzie,
  },
  { wzor: 'osoby[].tytuly[].chorobowe', dane: ['rodzaj_ubezpieczenia_chorobowego'] },
  { wzor: 'osoby[].tytuly[].chorobowoOd', dane: ['rodzaj_ubezpieczenia_chorobowego'] },
  { wzor: 'osoby[].tytuly[].naCzasOkreslony', dane: ['umowa_czas_okreslony'] },
  { wzor: 'osoby[].tytuly[].naZastepstwo', dane: ['umowa_czas_okreslony'] },
  { wzor: 'osoby[].tytuly[].wymiarEtatu', dane: ['wymiar_etatu'] },
  {
    wzor: 'osoby[].tytuly[].wynagrodzenieMiesieczne',
    dane: ['podstawa_skladek_miesiecznie'],
    bez: { ezus: 'Tryb prosty: jedna kwota wpisana ręcznie. eZUS daje listę miesięcy (podstawaSkladek).' },
  },
  { wzor: 'osoby[].tytuly[].platnikPowyzej20', dane: ['liczba_ubezpieczonych_u_platnika'] },
  { wzor: 'osoby[].tytuly[].nazwaPlatnika', dane: ['platnik_nazwa'], tylkoGdy: tylkoWlasnaFirma },
  { wzor: 'osoby[].tytuly[].nipPlatnika', dane: ['platnik_identyfikatory'], tylkoGdy: tylkoWlasnaFirma },
  { wzor: 'osoby[].tytuly[].regonPlatnika', dane: ['platnik_identyfikatory'], tylkoGdy: tylkoWlasnaFirma },
  {
    wzor: 'osoby[].tytuly[].podstawaSkladek',
    dane: (k) => (k.tytul?.rodzaj === 'dzialalnosc' ? ['podstawa_zadeklarowana_dzialalnosc'] : ['podstawa_skladek_miesiecznie']),
  },
  // Tryb szczegółowy (jak w Z-3): zna go tylko płatnik i pasek płacowy.
  { wzor: 'osoby[].tytuly[].podstawaSkladek[].dniPrzepracowane', dane: ['skladniki_wynagrodzenia'] },
  { wzor: 'osoby[].tytuly[].podstawaSkladek[].dniObowiazku', dane: ['skladniki_wynagrodzenia'] },
  { wzor: 'osoby[].tytuly[].podstawaSkladek[].skladnikiStale', dane: ['skladniki_wynagrodzenia'] },
  { wzor: 'osoby[].tytuly[].podstawaSkladek[].skladnikiZmienne', dane: ['skladniki_wynagrodzenia'] },
  { wzor: 'osoby[].tytuly[].skladnikiKwartalne', dane: ['skladniki_wynagrodzenia'] },
  { wzor: 'osoby[].tytuly[].skladnikRoczny', dane: ['skladniki_wynagrodzenia'] },
  { wzor: 'osoby[].tytuly[].zadeklarowanaPodstawa', dane: ['podstawa_zadeklarowana_dzialalnosc'] },
  // eZUS (panel płatnika, „Składki i salda”) zna saldo na dziś – data salda jedzie razem z kwotą.
  { wzor: 'osoby[].tytuly[].zadluzenieSkladkowe', dane: ['zadluzenie_skladkowe'] },
  { wzor: 'osoby[].tytuly[].zadluzenieSkladkoweNaDzien', dane: ['zadluzenie_skladkowe'] },
  {
    wzor: 'osoby[].tytuly[].zawieszenia',
    dane: ['dzialalnosc_daty_status'],
    bez: { ...bezDatWEUrzedzie, ezus: 'eZUS pokazuje zawieszenie tylko pośrednio, jako przerwę w okresach ubezpieczenia.' },
  },
  {
    wzor: 'osoby[].tytuly[].ustanie.data',
    dane: ['ustanie_ubezpieczenia'],
    // Dane z ZUS ZWUA eZUS ma dopiero po wyrejestrowaniu.
    tylkoGdy: { ezus: (k) => (k.wartosc as DataISO) < k.rodzina.dataAnalizy },
  },
  {
    wzor: 'osoby[].tytuly[].ustanie.przyczyna',
    dane: ['ustanie_ubezpieczenia'],
    bez: { ezus: 'eZUS ma datę i kod trybu rozwiązania umowy, ale nie przyczynę w rozumieniu ZAM (pytanie 8).' },
    dopisekWBrakuje: { ezus: 'eZUS zna datę, ale nie przyczynę – trzeba ją zaznaczyć samodzielnie' },
  },
  // Zdarzenie
  { wzor: 'zdarzenie.typ', dane: ['zdarzenie_typ_i_data_przyjecia'] },
  { wzor: 'zdarzenie.data', dane: rekordDatyZdarzenia },
  { wzor: 'zdarzenie.przewidywana', dane: rekordDatyZdarzenia },
  { wzor: 'zdarzenie.dataUprawomocnienia', dane: ['zdarzenie_typ_i_data_przyjecia'] },
  { wzor: 'zdarzenie.dzieci', dane: ['liczba_dzieci_przy_jednym_porodzie'], lista: { szkielet: () => ({}) } },
  { wzor: 'zdarzenie.dzieci[].martwe', dane: ['martwe_urodzenie_albo_zgon_dziecka'] },
  { wzor: 'zdarzenie.dzieci[].zgon', dane: ['martwe_urodzenie_albo_zgon_dziecka'] },
  { wzor: 'zdarzenie.dzieci[].tydzienCiazy', dane: ['dziecko_tydzien_ciazy_i_masa'] },
  { wzor: 'zdarzenie.dzieci[].masaG', dane: ['dziecko_tydzien_ciazy_i_masa'] },
  { wzor: 'zdarzenie.dzieci[].szpital', dane: ['dziecko_pobyt_w_szpitalu'] },
  { wzor: 'zdarzenie.dzieci[].zaZyciem', dane: ['dziecko_za_zyciem'] },
  {
    wzor: 'zdarzenie.dzieci[].dataUrodzenia',
    // Przy przyjęciu dziecka data urodzenia to „wiek dziecka” z dokumentów sądu; rodzic przyjmujący nie jest jeszcze
    // powiązany z dzieckiem w rejestrze PESEL ani w akcie urodzenia.
    dane: (k) => (k.rodzina.zdarzenie.typ === 'porod' ? ['dziecko_dane_podstawowe'] : ['dziecko_wiek_i_odroczenie_obowiazku_szkolnego']),
  },
  { wzor: 'zdarzenie.dzieci[].odroczonyObowiazekSzkolny', dane: ['dziecko_wiek_i_odroczenie_obowiazku_szkolnego'] },
  // Dane dziecka do wniosków: rejestr PESEL i odpis aktu – dopiero po sporządzeniu aktu urodzenia.
  { wzor: 'zdarzenie.dzieci[].dane.imie', dane: ['dziecko_dane_podstawowe'], tylkoGdy: poSporzadzeniuAktu },
  { wzor: 'zdarzenie.dzieci[].dane.nazwisko', dane: ['dziecko_dane_podstawowe'], tylkoGdy: poSporzadzeniuAktu },
  { wzor: 'zdarzenie.dzieci[].dane.miejsceUrodzenia', dane: ['dziecko_dane_podstawowe'], tylkoGdy: poSporzadzeniuAktu },
  { wzor: 'zdarzenie.dzieci[].dane.pesel', dane: ['dziecko_pesel'], tylkoGdy: poSporzadzeniuAktu },
];

/** Czego dotyczy `brakuje` danej usługi (grupy rekordów mapy). Odpis aktu urodzenia nie „brakuje” tytułów rodzica. */
export const ZAKRES_USLUG: Record<Usluga, string[] | 'wszystko'> = {
  mobywatel: 'wszystko',
  ezus: 'wszystko',
  eurzad_skarbowy: 'wszystko',
  login_gov: ['tozsamosc'],
  ceidg: ['dzialalnosc'],
  ikp: ['zdrowie', 'dziecko'],
  rsc: ['dziecko'],
  empatia: [],
};

// ───────────────────────── Ścieżki ─────────────────────────

const KROK = /[^.[\]]+|\[\d*\]/g;

/** Wartość pod ścieżką, np. wartoscPola(rodzina, 'osoby[0].tytuly[1].od'). */
export function wartoscPola(obiekt: unknown, sciezka: string): unknown {
  let w = obiekt;
  for (const krok of sciezka.match(KROK) ?? []) {
    if (typeof w !== 'object' || w === null) return undefined;
    w = (w as Record<string, unknown>)[krok.startsWith('[') ? krok.slice(1, -1) : krok];
  }
  return w;
}

function rozwin(korzen: unknown, wzor: string): { sciezka: string; wartosc: unknown }[] {
  let biezace: { sciezka: string; wartosc: unknown }[] = [{ sciezka: '', wartosc: korzen }];
  for (const krok of wzor.match(KROK) ?? []) {
    const nastepne: typeof biezace = [];
    for (const { sciezka, wartosc } of biezace) {
      if (krok.startsWith('[')) {
        if (!Array.isArray(wartosc)) continue;
        const indeksy = krok === '[]' ? wartosc.map((_, i) => i) : [Number(krok.slice(1, -1))];
        for (const i of indeksy) if (wartosc[i] !== undefined) nastepne.push({ sciezka: `${sciezka}[${i}]`, wartosc: wartosc[i] });
      } else if (typeof wartosc === 'object' && wartosc !== null) {
        const w = (wartosc as Record<string, unknown>)[krok];
        if (w !== undefined) nastepne.push({ sciezka: sciezka ? `${sciezka}.${krok}` : krok, wartosc: w });
      }
    }
    biezace = nastepne;
  }
  return biezace;
}

function ustaw(korzen: Record<string, unknown>, sciezka: string, wartosc: unknown): void {
  const kroki = (sciezka.match(KROK) ?? []).map((k) => (k.startsWith('[') ? Number(k.slice(1, -1)) : k));
  let w: Record<string | number, unknown> = korzen;
  kroki.forEach((krok, i) => {
    if (i === kroki.length - 1) {
      w[krok] = wartosc;
      return;
    }
    if (w[krok] === undefined) w[krok] = typeof kroki[i + 1] === 'number' ? [] : {};
    w = w[krok] as Record<string | number, unknown>;
  });
}

function usun(korzen: unknown, sciezka: string): void {
  const kroki = sciezka.match(KROK) ?? [];
  const rodzic = wartoscPola(korzen, kroki.slice(0, -1).join('.').replace(/\.\[/g, '['));
  const ostatni = kroki.at(-1)!;
  if (typeof rodzic === 'object' && rodzic !== null) delete (rodzic as Record<string, unknown>)[ostatni.startsWith('[') ? ostatni.slice(1, -1) : ostatni];
}

const jestPrzodkiem = (a: string, b: string) => b.startsWith(`${a}.`) || b.startsWith(`${a}[`);

// ───────────────────────── Jednostki danych ─────────────────────────

/** Jedno pole Rodziny opisane w mapie = jedna pozycja w `pochodzenie`. */
export interface JednostkaDanych {
  sciezka: string;
  wiersz: WierszMapy;
  wartosc: unknown;
  kontekst: KontekstPola;
}

/** Pola Rodziny, które opisuje mapa. Z `indeksOsoby` – tylko pola tej osoby i zdarzenia. */
export function jednostkiDanych(rodzina: Rodzina, indeksOsoby?: number): JednostkaDanych[] {
  return SCIEZKI_MAPY.flatMap((wiersz) => {
    const wzor = indeksOsoby === undefined ? wiersz.wzor : wiersz.wzor.replace(/^osoby\[\]/, `osoby[${indeksOsoby}]`);
    return rozwin(rodzina, wzor).map(({ sciezka, wartosc }) => {
      const o = /^osoby\[(\d+)\]/.exec(sciezka);
      const t = /\.tytuly\[(\d+)\]/.exec(sciezka);
      const osoba = o ? rodzina.osoby[Number(o[1])] : undefined;
      const tytul = osoba && t ? osoba.tytuly[Number(t[1])] : undefined;
      return { sciezka, wiersz, wartosc, kontekst: { rodzina, osoba, tytul, wartosc } };
    });
  });
}

export function rekordyPola(j: JednostkaDanych): RekordMapy[] {
  const ids = typeof j.wiersz.dane === 'function' ? j.wiersz.dane(j.kontekst) : j.wiersz.dane;
  return ids.map(rekord);
}

function uslugaMaPole(zrodlo: Usluga, j: JednostkaDanych): boolean {
  if (j.wiersz.bez?.[zrodlo]) return false;
  const warunek = j.wiersz.tylkoGdy?.[zrodlo];
  if (warunek && !warunek(j.kontekst)) return false;
  return rekordyPola(j).every((r) => zrodloMaRekord(r, zrodlo));
}

// ───────────────────────── Symulacja ─────────────────────────

/** Pola małżonka, które zna rejestr PESEL. Nazwiska nie: rejestr ma nazwisko rodowe małżonka, a nie obecne. */
const POLA_MALZONKA = ['imie', 'pesel'] as const;

export interface OpcjeSymulacji {
  /** Indeks małżonka osoby `indeksOsoby` w rodzinie (persony.ts, MALZONKOWIE). Bez niego – para bez ślubu. */
  malzonek?: number;
}

/** Dane małżonka z rejestru PESEL – tylko u usług, które mają rekord drugi_rodzic_dane (mObywatel). */
function daneMalzonka(zrodlo: Usluga, rodzina: Rodzina, indeks: number | undefined) {
  if (indeks === undefined || !zrodloMaRekord(rekord('drugi_rodzic_dane'), zrodlo)) return undefined;
  const m = rodzina.osoby[indeks];
  const dane: DaneOsobowe = {};
  for (const p of POLA_MALZONKA) if (m.dane?.[p] !== undefined) dane[p] = m.dane[p];
  if (Object.keys(dane).length === 0) return undefined;
  const osoba: CzesciowaOsoba = { id: m.id, dane };
  const pochodzenie: PochodzenieDanej[] = Object.keys(dane).map((p) => ({ sciezka: `osoby[${indeks}].dane.${p}`, zrodlo }));
  return { osoba, pochodzenie };
}

/** Symulowana odpowiedź usługi dla osoby `indeksOsoby` z rodziny (czysta funkcja, do testów i trasy). */
export function symulujZrodlo(zrodlo: Usluga, rodzina: Rodzina, indeksOsoby = 0, opcje: OpcjeSymulacji = {}): OdpowiedzZrodla {
  const jednostki = jednostkiDanych(rodzina, indeksOsoby);
  const wgGlebokosci = [...jednostki].sort((a, b) => (a.sciezka.match(KROK)?.length ?? 0) - (b.sciezka.match(KROK)?.length ?? 0));

  // 1. Które pola usługa ma. Pole w środku obiektu, którego usługa nie ma, też odpada. Lista jest wyjątkiem: usługa,
  //    która nie zna całej listy, może znać pola jej elementów (np. e-Urząd Skarbowy – nazwę własnej firmy).
  const ma = new Map<string, boolean>();
  for (const j of wgGlebokosci) {
    const przodekBez = wgGlebokosci.some((a) => !a.wiersz.lista && jestPrzodkiem(a.sciezka, j.sciezka) && ma.get(a.sciezka) === false);
    ma.set(j.sciezka, !przodekBez && uslugaMaPole(zrodlo, j));
  }
  // 2. Kontrakt wymaga pełnych elementów listy (np. tytuł bez kodu i okresu nie istnieje) – inaczej cała lista odpada.
  for (const l of jednostki) {
    const wymagane = l.wiersz.lista?.wymagane;
    if (!wymagane || !ma.get(l.sciezka)) continue;
    const pelne = (l.wartosc as unknown[]).every((_, i) => wymagane.every((p) => ma.get(`${l.sciezka}[${i}].${p}`)));
    if (!pelne) for (const j of jednostki) if (j.sciezka === l.sciezka || jestPrzodkiem(l.sciezka, j.sciezka)) ma.set(j.sciezka, false);
  }

  // 3. Fragment Rodziny: listy jako szkielety, reszta jako kopie; pola, których usługa nie ma, wycięte z kopii.
  const osoba = rodzina.osoby[indeksOsoby];
  const wynik: Record<string, unknown> = { osoby: [] };
  ustaw(wynik, `osoby[${indeksOsoby}]`, { id: osoba.id });
  for (const j of wgGlebokosci) {
    if (!ma.get(j.sciezka)) continue;
    const wKopiiPrzodka = wgGlebokosci.some((a) => !a.wiersz.lista && ma.get(a.sciezka) && jestPrzodkiem(a.sciezka, j.sciezka));
    if (wKopiiPrzodka) continue;
    ustaw(wynik, j.sciezka, j.wiersz.lista ? (j.wartosc as unknown[]).map(j.wiersz.lista.szkielet) : structuredClone(j.wartosc));
  }
  const maPotomka = (sciezka: string) => jednostki.some((j) => ma.get(j.sciezka) && jestPrzodkiem(sciezka, j.sciezka));
  for (const j of wgGlebokosci) if (!ma.get(j.sciezka) && !maPotomka(j.sciezka)) usun(wynik, j.sciezka);
  // Lista, której usługa nie zna w całości, a zna pola jej elementów: elementy dostają szkielet (np. `id` tytułu),
  // a puste miejsca – sam szkielet, żeby indeksy zgadzały się ze ścieżkami w `pochodzenie`.
  for (const l of jednostki) {
    if (!l.wiersz.lista || ma.get(l.sciezka)) continue;
    const elementy = wartoscPola(wynik, l.sciezka);
    if (!Array.isArray(elementy)) continue;
    const wzorce = l.wartosc as unknown[];
    for (let i = 0; i < elementy.length; i++) elementy[i] = { ...l.wiersz.lista.szkielet(wzorce[i]), ...(elementy[i] ?? {}) };
  }

  const pochodzenie: PochodzenieDanej[] = jednostki.filter((j) => ma.get(j.sciezka)).map((j) => ({ sciezka: j.sciezka, zrodlo }));

  // 4. Czego brakuje: rekordy pól persony, których usługa nie oddała (i nie oddała ich żadnym innym polem).
  const zakres = ZAKRES_USLUG[zrodlo];
  const wZakresie = (r: RekordMapy) => zakres === 'wszystko' || zakres.includes(r.grupa);
  const oddane = new Set(jednostki.filter((j) => ma.get(j.sciezka)).flatMap((j) => rekordyPola(j).map((r) => r.id)));
  const brak = new Map<string, string>();
  for (const j of jednostki) {
    if (ma.get(j.sciezka)) continue;
    const dopisek = j.wiersz.dopisekWBrakuje?.[zrodlo];
    for (const r of rekordyPola(j)) {
      if (!wZakresie(r)) continue;
      // Rekord oddany tylko częściowo (np. data ustania bez przyczyny) – z dopiskiem, czego brakuje.
      if (dopisek && oddane.has(r.id)) brak.set(r.id, `${r.etykieta} (${dopisek})`);
      else if (!oddane.has(r.id) && !brak.has(r.id)) brak.set(r.id, r.etykieta);
    }
  }
  const brakuje = MAPA.filter((r) => brak.has(r.id)).map((r) => brak.get(r.id)!);

  const daneOsoby = (wynik.osoby as CzesciowaOsoba[])[indeksOsoby];
  const zdarzenie = wynik.zdarzenie as OdpowiedzZrodla['dane']['zdarzenie'];
  const odpowiedz: OdpowiedzZrodla = { zrodlo, symulacja: true, dane: zdarzenie ? { ...daneOsoby, zdarzenie } : daneOsoby, pochodzenie, brakuje };

  // 5. Dane innych osób, które usługa zna: małżonek w rejestrze PESEL.
  const malzonek = daneMalzonka(zrodlo, rodzina, opcje.malzonek);
  if (malzonek) {
    odpowiedz.osoby = [malzonek.osoba];
    odpowiedz.pochodzenie = [...pochodzenie, ...malzonek.pochodzenie];
  }
  return odpowiedz;
}

/** Błąd zapytania o symulację: 400 – źródło, 404 – persona albo osoba. */
export class BladSymulacji extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404,
  ) {
    super(message);
  }
}

function znajdz(zrodlo: string, personaId: string, osobaId?: string): { usluga: Usluga; rodzina: Rodzina; indeks: number; malzonek?: number } {
  if (!czyUsluga(zrodlo)) {
    if (NIE_USLUGI.includes(zrodlo)) {
      throw new BladSymulacji(`„${zrodlo}” to nie e-usługa, więc nie ma czego pobrać. Te dane wpisuje się z dokumentu.`, 400);
    }
    throw new BladSymulacji(`Nieznane źródło danych „${zrodlo}”. Symulujemy: ${USLUGI.join(', ')}.`, 400);
  }
  const persona = PERSONY.find((p) => p.id === personaId);
  if (!persona) throw new BladSymulacji(`Nie ma persony „${personaId}”.`, 404);
  const indeks = osobaId === undefined ? 0 : persona.rodzina.osoby.findIndex((o) => o.id === osobaId);
  if (indeks < 0) throw new BladSymulacji(`Persona „${personaId}” nie ma osoby „${osobaId}”.`, 404);
  const para = MALZONKOWIE[personaId];
  const id = persona.rodzina.osoby[indeks].id;
  const idMalzonka = para?.includes(id) ? para.find((x) => x !== id) : undefined;
  const malzonek = persona.rodzina.osoby.findIndex((o) => o.id === idMalzonka);
  return { usluga: zrodlo, rodzina: persona.rodzina, indeks, malzonek: malzonek >= 0 ? malzonek : undefined };
}

/**
 * Odpowiedź symulowanej usługi dla persony. Domyślnie dla pierwszej osoby; `osobaId` – gdy loguje się druga osoba
 * (np. tata w parze). Z dokumentami usługi i ich statusem na dzień analizy (`dokumenty`), gdy usługa jakieś ma.
 * Rzuca BladSymulacji.
 */
export function odpowiedzZrodla(zrodlo: ZrodloId, personaId: string, osobaId?: string): OdpowiedzZrodla {
  const { usluga, rodzina, indeks, malzonek } = znajdz(zrodlo, personaId, osobaId);
  const odpowiedz = symulujZrodlo(usluga, rodzina, indeks, { malzonek });
  const dokumenty = dokumentyZrodla(usluga, rodzina, indeks);
  return dokumenty.length > 0 ? { ...odpowiedz, dokumenty } : odpowiedz;
}

// ───────────────────────── Zaświadczenia ─────────────────────────

// Typy `DokumentZrodla` i `StatusDokumentuZrodla` są w kontrakcie (src/engine/types.ts); `OdpowiedzZrodla.dokumenty`.
export type StatusDokumentu = StatusDokumentuZrodla;
export type { DokumentZrodla };

export function dokumentyZrodla(zrodlo: Usluga, rodzina: Rodzina, indeksOsoby = 0): DokumentZrodla[] {
  const sciezki = symulujZrodlo(zrodlo, rodzina, indeksOsoby).pochodzenie.map((p) => p.sciezka);
  const dzis = rodzina.dataAnalizy;
  const zd = rodzina.zdarzenie;
  const oczekuje = (od: DataISO): Pick<DokumentZrodla, 'status' | 'wystawienieOd'> => ({ status: 'oczekuje', wystawienieOd: od });

  if (zrodlo === 'ezus') {
    const dokumenty: DokumentZrodla[] = [
      {
        kod: 'potwierdzenie_danych_z_zus',
        nazwa: 'Potwierdzenie z danymi z ZUS: zgłoszenia do ubezpieczeń i podstawy wymiaru składek',
        zrodlo,
        naDzien: dzis,
        status: 'wystawione',
        sciezki: sciezki.filter((s) => s.includes('.tytuly')),
      },
    ];
    const ezla = sciezki.filter((s) => s.includes('.zdrowie.eZLA'));
    if (ezla.length) dokumenty.push({ kod: 'e_zla', nazwa: 'Zaświadczenia lekarskie (e-ZLA)', zrodlo, naDzien: dzis, status: 'wystawione', sciezki: ezla });
    for (const s of sciezki.filter((x) => x.endsWith('.zadluzenieSkladkowe'))) {
      // UZ art. 2a ust. 1: liczy się zadłużenie „w dniu powstania prawa do świadczenia”. Uproszczenie: dzień porodu
      // albo przyjęcia dziecka (urlop przed porodem przesuwa ten dzień wcześniej – zależy od planu).
      // Zaświadczenie na ten dzień ZUS wystawi dopiero po nim; do tego czasu eZUS pokazuje saldo na dziś.
      const naDzien = zd.data;
      dokumenty.push({
        kod: 'zaswiadczenie_o_zadluzeniu',
        nazwa: 'Zaświadczenie o niezaleganiu w opłacaniu składek na dzień powstania prawa do zasiłku',
        zrodlo,
        naDzien,
        ...(naDzien < dzis ? { status: 'wystawione' as const } : oczekuje(dodajDni(naDzien, 1))),
        sciezki: [s],
      });
    }
    return dokumenty;
  }

  if (zrodlo === 'rsc') {
    // Akt urodzenia powstaje po zgłoszeniu urodzenia; przy przysposobieniu nowy akt – po uprawomocnieniu postanowienia.
    const aktJest = aktUrodzeniaJest(rodzina);
    const od = zd.typ === 'porod' ? zd.data : zd.dataUprawomocnienia;
    return [
      {
        kod: 'odpis_aktu_urodzenia',
        nazwa: 'Odpis skrócony aktu urodzenia dziecka',
        zrodlo,
        naDzien: dzis,
        ...(aktJest ? { status: 'wystawione' as const } : od ? oczekuje(od) : { status: 'oczekuje' as const }),
        sciezki: sciezki.filter((s) => s.startsWith('zdarzenie')),
      },
    ];
  }

  return [];
}
