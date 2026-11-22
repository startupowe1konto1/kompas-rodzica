/**
 * Silnik ankiety „Moja sytuacja” (tor C, C3): czyste funkcje bez Reacta, sieci i zegara.
 *
 *  - które pytania pokazać (`widocznePytania`),
 *  - czytanie i zapis odpowiedzi w `Rodzina` bez mutacji (`odczytajWartosc`, `zapiszWartosc`,
 *    `odczytajOdpowiedz`, `zapiszOdpowiedz`),
 *  - walidacja przy polu (`walidujOdpowiedz`, `walidujAnkiete`).
 *
 * Nie ma tu reguł prawnych. „Dziś” to zawsze `rodzina.dataAnalizy` – nigdy `new Date()`.
 * Silnika (`src/engine/*`) nie importujemy, tylko typy z kontraktu.
 */
import type { MiesiacPodstawy, RodzajTytulu, Rodzina, TytulUbezpieczenia, ZdarzenieDziecka } from '../../engine/types';
import { formatujDate } from '../format';
import type {
  BladAnkiety,
  BladPola,
  DefinicjaPytania,
  KodBleduPola,
  PytanieWidoczne,
  Warunek,
  WynikWalidacjiAnkiety,
  ZakresInstancji,
} from './typy';

// ───────────────────────── Ścieżki ─────────────────────────

type Segment = string | number;

const ZNACZNIKI: Record<string, keyof ZakresInstancji> = {
  $osoba: 'osoba',
  $tytul: 'tytul',
  $dziecko: 'dziecko',
};

/** 'osoby[$osoba].tytuly[$tytul].od' + { osoba: 0, tytul: 1 } → 'osoby[0].tytuly[1].od'. */
export function podstawZakres(sciezka: string, zakres: ZakresInstancji): string {
  return sciezka.replace(/\$[a-z]+/g, (znacznik) => {
    const klucz = ZNACZNIKI[znacznik];
    const nr = klucz === undefined ? undefined : zakres[klucz];
    if (nr === undefined) throw new Error(`Ścieżka „${sciezka}” wymaga numeru ${znacznik}`);
    return String(nr);
  });
}

function segmenty(sciezka: string): Segment[] {
  const wynik: Segment[] = [];
  for (const m of sciezka.matchAll(/([^.[\]]+)|\[(\d+)\]/g)) {
    if (m[2] !== undefined) wynik.push(Number(m[2]));
    else wynik.push(m[1]);
  }
  return wynik;
}

/** Wartość pod ścieżką, np. 'osoby[0].tytuly[0].od'. Brak po drodze → undefined (bez wyjątku). */
export function odczytajWartosc(obiekt: unknown, sciezka: string): unknown {
  let biezacy: unknown = obiekt;
  for (const seg of segmenty(sciezka)) {
    if (biezacy === null || typeof biezacy !== 'object') return undefined;
    biezacy = (biezacy as Record<string | number, unknown>)[seg];
  }
  return biezacy;
}

function ustaw(biezacy: unknown, segs: Segment[], i: number, wartosc: unknown): unknown {
  const seg = segs[i];
  const ostatni = i === segs.length - 1;
  if (typeof seg === 'number') {
    const lista = Array.isArray(biezacy) ? biezacy.slice() : [];
    if (ostatni) {
      if (wartosc === undefined) lista.splice(seg, 1);
      else lista[seg] = wartosc;
    } else {
      lista[seg] = ustaw(lista[seg], segs, i + 1, wartosc);
    }
    return lista;
  }
  const obiekt: Record<string, unknown> =
    biezacy !== null && typeof biezacy === 'object' && !Array.isArray(biezacy) ? { ...(biezacy as Record<string, unknown>) } : {};
  if (ostatni) {
    if (wartosc === undefined) delete obiekt[seg];
    else obiekt[seg] = wartosc;
  } else {
    obiekt[seg] = ustaw(obiekt[seg], segs, i + 1, wartosc);
  }
  return obiekt;
}

/**
 * Zwraca NOWY obiekt z wartością pod ścieżką. Oryginał zostaje bez zmian; gałęzie, których
 * zapis nie dotyczy, są współdzielone. Brakujące obiekty i listy po drodze powstają same.
 * `undefined` usuwa pole (a przy elemencie listy – usuwa element).
 */
export function zapiszWartosc<T>(obiekt: T, sciezka: string, wartosc: unknown): T {
  const segs = segmenty(sciezka);
  if (segs.length === 0) return wartosc as T;
  return ustaw(obiekt, segs, 0, wartosc) as T;
}

/** Pusta lista to dane niewypełnione (np. brak tytułów ubezpieczenia). */
export function czyWypelnione(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return v !== undefined && v !== null && v !== '';
}

// ───────────────────────── Tytuły ubezpieczenia ─────────────────────────

const PREFIKS_ID: Record<RodzajTytulu, string> = {
  umowa_o_prace: 'etat',
  zlecenie: 'zlecenie',
  dzialalnosc: 'firma',
  wspolpraca: 'wspolpraca',
  inny: 'inny',
};

function nowyTytul(rodzaj: RodzajTytulu, zajete: Set<string>): TytulUbezpieczenia {
  let n = 1;
  while (zajete.has(`${PREFIKS_ID[rodzaj]}-${n}`)) n++;
  const id = `${PREFIKS_ID[rodzaj]}-${n}`;
  zajete.add(id);
  return {
    id,
    rodzaj,
    // Wartość startowa, którą rodzic poprawia w ankiecie. Etat = obowiązkowe – tak opisuje to
    // kontrakt (types.ts, typ `Chorobowe`). Przy pozostałych tytułach pytamy wprost.
    chorobowe: rodzaj === 'umowa_o_prace' ? 'obowiazkowe' : 'brak',
    // Pusta data: walidacja poprosi o nią przy polu „Od kiedy trwa…”.
    od: '',
  };
}

/** Dodaje tytuł ubezpieczenia osobie (np. drugą umowę zlecenia). Bez mutacji. */
export function dodajTytul(rodzina: Rodzina, osoba: number, rodzaj: RodzajTytulu): Rodzina {
  const tytuly = rodzina.osoby[osoba]?.tytuly ?? [];
  const t = nowyTytul(rodzaj, new Set(tytuly.map((x) => x.id)));
  return zapiszWartosc(rodzina, `osoby[${osoba}].tytuly`, [...tytuly, t]);
}

/** Usuwa tytuł ubezpieczenia o podanym numerze. Bez mutacji. */
export function usunTytul(rodzina: Rodzina, osoba: number, tytul: number): Rodzina {
  const tytuly = rodzina.osoby[osoba]?.tytuly ?? [];
  return zapiszWartosc(
    rodzina,
    `osoby[${osoba}].tytuly`,
    tytuly.filter((_, i) => i !== tytul),
  );
}

// ───────────────────────── Odpowiedzi (z kodekami) ─────────────────────────

/** Odpowiedź w kształcie, w jakim pokazuje ją formularz (po przekształceniu kodekiem). */
export function odczytajOdpowiedz(def: DefinicjaPytania, rodzina: Rodzina, zakres: ZakresInstancji): unknown {
  const surowa = odczytajWartosc(rodzina, podstawZakres(def.sciezka, zakres));
  switch (def.kodek) {
    case 'rodzaje_tytulow': {
      const tytuly = (surowa as TytulUbezpieczenia[] | undefined) ?? [];
      return [...new Set(tytuly.map((t) => t.rodzaj))];
    }
    case 'dlugosc_listy':
      return Array.isArray(surowa) ? surowa.length : undefined;
    case 'etap': {
      const z = surowa as ZdarzenieDziecka | undefined;
      if (!z) return undefined;
      if (z.typ === 'porod') return z.przewidywana ? 'w_ciazy' : 'urodzone';
      return 'przyjecie';
    }
    case 'chorobowe_dobrowolne':
      if (surowa === 'dobrowolne') return true;
      if (surowa === 'brak') return false;
      return undefined;
    case 'tryb_podstawy': {
      const t = surowa as TytulUbezpieczenia | undefined;
      if (!t) return undefined;
      if (Array.isArray(t.podstawaSkladek)) return 'miesiace';
      // Brak listy miesięcy = tryb prosty (kontrakt nie ma pola na sam wybór trybu). Bez tego na telefonie
      // wybór „Jedna kwota” na nowej umowie nie miał czego zapisać, bo kwota jest na następnym ekranie.
      return 'kwota';
    }
    case 'obecnosc':
      return surowa !== undefined && surowa !== null;
    default:
      return surowa;
  }
}

/** Zapisuje odpowiedź z formularza do `Rodzina` (przez kodek). Zwraca nową rodzinę. */
export function zapiszOdpowiedz(def: DefinicjaPytania, rodzina: Rodzina, zakres: ZakresInstancji, wartosc: unknown): Rodzina {
  const sciezka = podstawZakres(def.sciezka, zakres);
  switch (def.kodek) {
    case 'rodzaje_tytulow': {
      const obecne = (odczytajWartosc(rodzina, sciezka) as TytulUbezpieczenia[] | undefined) ?? [];
      const wybrane = (Array.isArray(wartosc) ? wartosc : []) as RodzajTytulu[];
      const zostaja = obecne.filter((t) => wybrane.includes(t.rodzaj));
      const zajete = new Set(zostaja.map((t) => t.id));
      const nowe = wybrane.filter((r, i) => wybrane.indexOf(r) === i && !zostaja.some((t) => t.rodzaj === r)).map((r) => nowyTytul(r, zajete));
      return zapiszWartosc(rodzina, sciezka, [...zostaja, ...nowe]);
    }
    case 'dlugosc_listy': {
      const n = typeof wartosc === 'number' ? Math.floor(wartosc) : Number.NaN;
      if (!Number.isFinite(n) || n < 0) return rodzina;
      const obecne = (odczytajWartosc(rodzina, sciezka) as unknown[] | undefined) ?? [];
      const nowa = obecne.slice(0, n);
      while (nowa.length < n) nowa.push({});
      return zapiszWartosc(rodzina, sciezka, nowa);
    }
    case 'etap': {
      const z = rodzina.zdarzenie;
      if (wartosc === 'w_ciazy') return zapiszWartosc(rodzina, sciezka, { ...z, typ: 'porod', przewidywana: true });
      if (wartosc === 'urodzone') return zapiszWartosc(rodzina, sciezka, { ...z, typ: 'porod', przewidywana: false });
      if (wartosc === 'przyjecie') {
        return zapiszWartosc(rodzina, sciezka, { ...z, typ: z.typ === 'porod' ? 'przysposobienie' : z.typ, przewidywana: false });
      }
      return rodzina;
    }
    case 'chorobowe_dobrowolne':
      if (wartosc === true) return zapiszWartosc(rodzina, sciezka, 'dobrowolne');
      if (wartosc === false) return zapiszWartosc(rodzina, sciezka, 'brak');
      return rodzina;
    case 'tryb_podstawy': {
      const obecna = odczytajWartosc(rodzina, `${sciezka}.podstawaSkladek`);
      if (wartosc === 'miesiace') return Array.isArray(obecna) ? rodzina : zapiszWartosc(rodzina, `${sciezka}.podstawaSkladek`, []);
      if (wartosc === 'kwota') return obecna === undefined ? rodzina : zapiszWartosc(rodzina, `${sciezka}.podstawaSkladek`, undefined);
      return rodzina;
    }
    case 'obecnosc': {
      if (wartosc === true) {
        if (odczytajWartosc(rodzina, sciezka) !== undefined) return rodzina;
        return zapiszWartosc(rodzina, sciezka, structuredClone(def.wartoscPoczatkowa ?? {}));
      }
      return zapiszWartosc(rodzina, sciezka, undefined);
    }
    default:
      return zapiszWartosc(rodzina, sciezka, wartosc);
  }
}

// ───────────────────────── Widoczność ─────────────────────────

export function spelniaWarunek(w: Warunek, rodzina: Rodzina, zakres: ZakresInstancji): boolean {
  if ('wszystkie' in w) return w.wszystkie.every((x) => spelniaWarunek(x, rodzina, zakres));
  if ('ktorykolwiek' in w) return w.ktorykolwiek.some((x) => spelniaWarunek(x, rodzina, zakres));
  if ('nie' in w) return !spelniaWarunek(w.nie, rodzina, zakres);
  const v = odczytajWartosc(rodzina, podstawZakres(w.sciezka, zakres));
  if ('rowne' in w) return v === w.rowne;
  if ('rozne' in w) return v !== w.rozne;
  if ('jedenZ' in w) return w.jedenZ.includes(v as never);
  if ('istnieje' in w) return (v !== undefined && v !== null) === w.istnieje;
  return czyWypelnione(v) === w.wypelnione;
}

export interface OpcjeWidocznosci {
  /** Tylko pytania tej osoby (i jej tytułów), np. przy „Dodaj osobę”. */
  osoba?: number;
  /** Pomiń pytania o całą rodzinę i dzieci (gdy są już zadane, np. przy drugiej osobie). */
  tylkoOsoba?: boolean;
  /** Pytania (po `id`), których nie zadajemy, bo odpowiedź już jest, np. rola nowej osoby wybrana przed ankietą. */
  pominPytania?: string[];
}

function instancje(def: DefinicjaPytania, rodzina: Rodzina, opcje: OpcjeWidocznosci): ZakresInstancji[] {
  const osoby = rodzina.osoby.map((_, i) => i).filter((i) => opcje.osoba === undefined || i === opcje.osoba);
  switch (def.zakres) {
    case 'rodzina':
      return opcje.tylkoOsoba ? [] : [{}];
    case 'osoba':
      return osoby.map((osoba) => ({ osoba }));
    case 'tytul':
      return osoby.flatMap((osoba) => (rodzina.osoby[osoba].tytuly ?? []).map((_, tytul) => ({ osoba, tytul })));
    case 'dziecko':
      return opcje.tylkoOsoba ? [] : (rodzina.zdarzenie?.dzieci ?? []).map((_, dziecko) => ({ dziecko }));
  }
}

function klucz(def: DefinicjaPytania, z: ZakresInstancji): string {
  const czesci = [z.osoba !== undefined ? `o${z.osoba}` : '', z.tytul !== undefined ? `t${z.tytul}` : '', z.dziecko !== undefined ? `d${z.dziecko}` : ''].filter(Boolean);
  return czesci.length ? `${def.id}@${czesci.join('.')}` : def.id;
}

/**
 * Pytania do pokazania, w kolejności rysowania: krok po kroku (w kolejności pierwszego
 * wystąpienia kroku w definicjach), w kroku osoba po osobie, a pytania o tytuł albo dziecko
 * zgrupowane per tytuł / dziecko.
 */
export function widocznePytania(defs: DefinicjaPytania[], rodzina: Rodzina, opcje: OpcjeWidocznosci = {}): PytanieWidoczne[] {
  const kolejnoscKrokow: string[] = [];
  for (const d of defs) if (!kolejnoscKrokow.includes(d.krok)) kolejnoscKrokow.push(d.krok);

  const elementy: { p: PytanieWidoczne; sortuj: number[] }[] = [];
  defs.forEach((def, nrDef) => {
    if (opcje.pominPytania?.includes(def.id)) return;
    // Pytania o całą osobę/rodzinę stoją przed blokami tytułów lub dzieci, jeśli w definicjach są przed nimi, inaczej po nich.
    const pierwszyBlokowy = defs.findIndex((d) => d.krok === def.krok && (d.zakres === 'tytul' || d.zakres === 'dziecko'));
    for (const zakres of instancje(def, rodzina, opcje)) {
      if (def.warunek && !spelniaWarunek(def.warunek, rodzina, zakres)) continue;
      const pod = zakres.tytul ?? zakres.dziecko ?? (pierwszyBlokowy === -1 || nrDef < pierwszyBlokowy ? -1 : Number.MAX_SAFE_INTEGER);
      elementy.push({
        p: {
          def,
          zakres,
          sciezka: podstawZakres(def.sciezka, zakres),
          klucz: klucz(def, zakres),
          wartosc: odczytajOdpowiedz(def, rodzina, zakres),
        },
        sortuj: [kolejnoscKrokow.indexOf(def.krok), zakres.osoba ?? -1, pod, nrDef],
      });
    }
  });
  elementy.sort((a, b) => {
    for (let i = 0; i < a.sortuj.length; i++) if (a.sortuj[i] !== b.sortuj[i]) return a.sortuj[i] - b.sortuj[i];
    return 0;
  });
  return elementy.map((e) => e.p);
}

// ───────────────────────── Daty (bez zegara i bez `Date`) ─────────────────────────

/** Liczba dni od 1970-01-01 dla daty kalendarzowej (algorytm „days from civil”). */
function dniOdEpoki(r: number, m: number, d: number): number {
  const y = m <= 2 ? r - 1 : r;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function dniWMiesiacu(r: number, m: number): number {
  if (m === 2) return (r % 4 === 0 && r % 100 !== 0) || r % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/** 'RRRR-MM-DD' → numer dnia albo null, gdy taka data nie istnieje. */
function numerDnia(iso: unknown): number | null {
  if (typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [r, mies, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mies < 1 || mies > 12 || d < 1 || d > dniWMiesiacu(r, mies)) return null;
  return dniOdEpoki(r, mies, d);
}

// ───────────────────────── Walidacja ─────────────────────────

export interface KontekstWalidacji {
  /** „Dziś” – z `rodzina.dataAnalizy`. */
  dataAnalizy: string;
  /** Potrzebne do porównań z innymi polami (`nieWczesniejNiz`). */
  rodzina?: Rodzina;
  zakres?: ZakresInstancji;
}

function liczbaPL(n: number): string {
  return String(n).replace('.', ',');
}

function blad(kod: KodBleduPola, komunikat: string, pole?: string): BladPola {
  return pole === undefined ? { kod, komunikat } : { kod, komunikat, pole };
}

const KOMUNIKAT = {
  zlaData: 'To nie wygląda na prawdziwą datę. Proszę sprawdzić dzień, miesiąc i rok.',
  zaWczesnie: 'Ta data jest bardzo odległa w przeszłości. Proszę sprawdzić rok.',
  zaPozno: 'Ta data jest bardzo odległa w przyszłości. Proszę sprawdzić rok.',
  przyszlosc: 'Ta data nie może być późniejsza niż dziś.',
  odwrocony: 'Koniec nie może być wcześniej niż początek.',
  ujemna: 'Kwota nie może być mniejsza niż 0. Jeśli nic tu nie ma, proszę wpisać 0.',
  zlaOpcja: 'Proszę wybrać jedną z podanych odpowiedzi.',
};

function walidujDate(def: DefinicjaPytania, wartosc: unknown, k: KontekstWalidacji, pole?: string): BladPola[] {
  const dzien = numerDnia(wartosc);
  if (dzien === null) return [blad('ZLA_DATA', KOMUNIKAT.zlaData, pole)];
  const dzis = numerDnia(k.dataAnalizy);
  if (dzis !== null && def.zakresDat) {
    const roznica = dzien - dzis;
    const { minDni, maxDni } = def.zakresDat;
    if (minDni !== undefined && roznica < minDni) return [blad('DATA_ZA_WCZESNIE', KOMUNIKAT.zaWczesnie, pole)];
    if (maxDni !== undefined && roznica > maxDni) return [blad('DATA_ZA_POZNO', maxDni === 0 ? KOMUNIKAT.przyszlosc : KOMUNIKAT.zaPozno, pole)];
  }
  if (def.nieWczesniejNiz && k.rodzina) {
    try {
      const inna = odczytajWartosc(k.rodzina, podstawZakres(def.nieWczesniejNiz, k.zakres ?? {}));
      const innaDzien = numerDnia(inna);
      if (innaDzien !== null && dzien < innaDzien) {
        return [blad('DATA_PRZED_INNA', `Ta data nie może być wcześniejsza niż ${formatujDate(inna as string)}.`, pole)];
      }
    } catch {
      // Brak numeru osoby/tytułu w kontekście – porównania nie da się zrobić, pomijamy je.
    }
  }
  return [];
}

function walidujListeMiesiecy(wartosc: unknown, k: KontekstWalidacji, max?: number): BladPola[] {
  if (!Array.isArray(wartosc)) return [blad('ZLY_MIESIAC', 'Proszę dodawać miesiące jeden po drugim.')];
  const bledy: BladPola[] = [];
  const biezacy = k.dataAnalizy.slice(0, 7);
  const widziane = new Set<string>();
  (wartosc as Partial<MiesiacPodstawy>[]).forEach((w, i) => {
    const m = w?.miesiac;
    if (typeof m !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) {
      bledy.push(blad('ZLY_MIESIAC', 'Proszę wybrać miesiąc i rok.', `[${i}].miesiac`));
    } else if (widziane.has(m)) {
      bledy.push(blad('MIESIAC_POWTORZONY', 'Ten miesiąc jest już na liście.', `[${i}].miesiac`));
    } else if (m > biezacy) {
      bledy.push(blad('MIESIAC_W_PRZYSZLOSCI', 'Ten miesiąc jeszcze nie nadszedł. Proszę wpisać miesiące, które już minęły.', `[${i}].miesiac`));
    }
    if (typeof m === 'string') widziane.add(m);

    if (typeof w?.kwota !== 'number' || !Number.isFinite(w.kwota)) bledy.push(blad('NIE_LICZBA', 'Proszę wpisać kwotę, np. 8000.', `[${i}].kwota`));
    else if (w.kwota < 0) bledy.push(blad('KWOTA_UJEMNA', KOMUNIKAT.ujemna, `[${i}].kwota`));
    else if (max !== undefined && w.kwota > max) bledy.push(blad('ZA_DUZO', `Ta kwota wygląda na pomyłkę. Proszę wpisać najwyżej ${liczbaPL(max)}.`, `[${i}].kwota`));

    for (const pole of ['skladnikiStale', 'skladnikiZmienne'] as const) {
      const v = w?.[pole];
      if (v !== undefined && (typeof v !== 'number' || v < 0)) bledy.push(blad('KWOTA_UJEMNA', KOMUNIKAT.ujemna, `[${i}].${pole}`));
    }
    const { dniPrzepracowane: dp, dniObowiazku: dob } = w ?? {};
    if (dob !== undefined && (dob < 1 || dob > 31)) bledy.push(blad(dob < 1 ? 'ZA_MALO' : 'ZA_DUZO', 'Proszę wpisać liczbę dni od 1 do 31.', `[${i}].dniObowiazku`));
    if (dp !== undefined && dp < 0) bledy.push(blad('ZA_MALO', 'Liczba dni nie może być mniejsza niż 0.', `[${i}].dniPrzepracowane`));
    else if (dp !== undefined && dob !== undefined && dp > dob) {
      bledy.push(blad('DNI_PONAD_OBOWIAZEK', 'Dni przepracowanych nie może być więcej niż dni do przepracowania.', `[${i}].dniPrzepracowane`));
    }
  });
  return bledy;
}

function walidujListeOkresow(def: DefinicjaPytania, wartosc: unknown, k: KontekstWalidacji): BladPola[] {
  if (!Array.isArray(wartosc)) return [blad('ZLA_DATA', KOMUNIKAT.zlaData)];
  const bezPorownania = { ...def, nieWczesniejNiz: undefined };
  const bledy: BladPola[] = [];
  (wartosc as { od?: unknown; do?: unknown }[]).forEach((o, i) => {
    const bOd = czyWypelnione(o?.od) ? walidujDate(bezPorownania, o.od, k, `[${i}].od`) : [blad('WYMAGANE', 'Proszę podać datę początku.', `[${i}].od`)];
    const bDo = czyWypelnione(o?.do) ? walidujDate(bezPorownania, o.do, k, `[${i}].do`) : [blad('WYMAGANE', 'Proszę podać datę końca.', `[${i}].do`)];
    bledy.push(...bOd, ...bDo);
    if (bOd.length === 0 && bDo.length === 0 && (o.od as string) > (o.do as string)) {
      bledy.push(blad('OKRES_ODWROCONY', KOMUNIKAT.odwrocony, `[${i}].do`));
    }
  });
  return bledy;
}

function czyPusta(def: DefinicjaPytania, wartosc: unknown): boolean {
  if (!czyWypelnione(wartosc)) return true;
  return Array.isArray(wartosc) && wartosc.length === 0 && def.typ !== 'tak_nie';
}

/**
 * Sprawdza jedną odpowiedź (w kształcie z formularza). Zwraca listę błędów przy polu;
 * pusta lista = w porządku. Testy sprawdzają `kod`, nie treść komunikatu.
 */
export function walidujOdpowiedz(def: DefinicjaPytania, wartosc: unknown, kontekst: KontekstWalidacji): BladPola[] {
  if (czyPusta(def, wartosc)) {
    if (!def.wymagane) return [];
    const wybor = def.typ === 'tak_nie' || def.typ === 'wybor' || def.typ === 'wiele';
    return [blad('WYMAGANE', wybor ? 'Proszę wybrać odpowiedź – bez niej nie policzymy wyniku.' : 'Proszę uzupełnić to pole – bez niego nie policzymy wyniku.')];
  }
  switch (def.typ) {
    case 'tak_nie':
      return typeof wartosc === 'boolean' ? [] : [blad('ZLA_OPCJA', KOMUNIKAT.zlaOpcja)];
    case 'wybor':
      return (def.opcje ?? []).some((o) => o.wartosc === wartosc) ? [] : [blad('ZLA_OPCJA', KOMUNIKAT.zlaOpcja)];
    case 'wiele': {
      const dozwolone = (def.opcje ?? []).map((o) => o.wartosc);
      return Array.isArray(wartosc) && wartosc.every((v) => dozwolone.includes(v)) ? [] : [blad('ZLA_OPCJA', KOMUNIKAT.zlaOpcja)];
    }
    case 'kwota':
    case 'liczba': {
      if (typeof wartosc !== 'number' || !Number.isFinite(wartosc)) {
        return [blad('NIE_LICZBA', def.typ === 'kwota' ? 'Proszę wpisać kwotę cyframi, np. 8000.' : 'Proszę wpisać liczbę cyframi.')];
      }
      if (def.typ === 'kwota' && wartosc < 0) return [blad('KWOTA_UJEMNA', KOMUNIKAT.ujemna)];
      if (def.min !== undefined && wartosc < def.min) return [blad('ZA_MALO', `Proszę wpisać co najmniej ${liczbaPL(def.min)}.`)];
      if (def.max !== undefined && wartosc > def.max) return [blad('ZA_DUZO', `Proszę wpisać najwyżej ${liczbaPL(def.max)}.`)];
      return [];
    }
    case 'data':
      return walidujDate(def, wartosc, kontekst);
    case 'lista_miesiecy':
      return walidujListeMiesiecy(wartosc, kontekst, def.max);
    case 'lista_okresow':
    case 'lista_zwolnien':
      return walidujListeOkresow(def, wartosc, kontekst);
  }
}

/** Sprawdza wszystkie WIDOCZNE pytania. Ukrytych nie sprawdzamy – rodzic ich nie widzi. */
export function walidujAnkiete(defs: DefinicjaPytania[], rodzina: Rodzina, opcje: OpcjeWidocznosci = {}): WynikWalidacjiAnkiety {
  const bledy: BladAnkiety[] = [];
  for (const p of widocznePytania(defs, rodzina, opcje)) {
    for (const b of walidujOdpowiedz(p.def, p.wartosc, { dataAnalizy: rodzina.dataAnalizy, rodzina, zakres: p.zakres })) {
      bledy.push({ ...b, pytanieId: p.def.id, klucz: p.klucz, sciezka: p.sciezka });
    }
  }
  return { poprawna: bledy.length === 0, bledy };
}
