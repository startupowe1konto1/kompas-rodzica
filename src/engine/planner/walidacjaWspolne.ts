/**
 * Wspólne pomocniki walidacji planu i wykorzystania pul – TOR A, zadanie A5.
 * Decyzje D5, D9, D10 w docs/superpowers/plans/2026-11-21-tor-a.md.
 */
import { czyWOkresie, dodajDni, liczbaDni, pozniejsza } from '../daty';
import type {
  DataISO,
  Komunikat,
  Odcinek,
  Parametry,
  Plan,
  PoziomKomunikatu,
  Pule,
  Rodzina,
  Rola,
  Swiadczenie,
  TypOdcinka,
  TytulUbezpieczenia,
  Uprawnienie,
  WynikUprawnien,
} from '../types';

/** Wszystko, czego potrzebuje pojedyncza reguła walidacji. */
export interface Kontekst {
  rodzina: Rodzina;
  plan: Plan;
  uprawnienia: WynikUprawnien;
  pule: Pule;
  p: Parametry;
}

/** Z jakiego świadczenia płynie zasiłek za odcinek danego typu. Praca, przerwa i wychowawczy – bez świadczenia. */
export const SWIADCZENIE_ODCINKA: Partial<Record<TypOdcinka, Swiadczenie>> = {
  macierzynski: 'macierzynski',
  na_warunkach_macierzynskiego: 'na_warunkach_macierzynskiego',
  uzupelniajacy: 'uzupelniajacy',
  rodzicielski: 'rodzicielski',
  ojcowski: 'ojcowski',
  chorobowy_ciaza: 'zasilek_chorobowy_ciaza',
  w_wys_macierzynskiego: 'zasilek_w_wys_macierzynskiego',
};

export function czyZasilkowy(o: Odcinek): boolean {
  return SWIADCZENIE_ODCINKA[o.typ] !== undefined;
}

/** Odcinki liczone do puli urlopu macierzyńskiego [KP art. 180 § 1, art. 183 § 1]. */
export const TYPY_MACIERZYNSKIE: TypOdcinka[] = ['macierzynski', 'na_warunkach_macierzynskiego'];

/** Role, które mają własne 9 tygodni rodzicielskiego [KP art. 182¹a § 4, art. 183 § 4]. */
export const ROLE_RODZICA: Rola[] = ['matka', 'ojciec', 'przyjmujacy'];

/** Dni kalendarzowe odcinka (domkniętego). Odcinek z końcem przed początkiem ma 0 dni. */
export function dniOdcinka(o: { od: DataISO; do: DataISO }): number {
  return Math.max(0, liczbaDni(o.od, o.do));
}

export function suma(liczby: number[]): number {
  return liczby.reduce((s, x) => s + x, 0);
}

export function ostatniDzien(odcinki: { do: DataISO }[]): DataISO | undefined {
  return odcinki.reduce<DataISO | undefined>((m, o) => (m === undefined ? o.do : pozniejsza(m, o.do)), undefined);
}

export function uprawnienieDo(upr: Uprawnienie[], osobaId: string, swiadczenie: Swiadczenie): Uprawnienie | undefined {
  return upr.find((u) => u.osobaId === osobaId && u.swiadczenie === swiadczenie);
}

/**
 * Łączenie urlopu rodzicielskiego z pracą jest tylko u pracodawcy, który udzielił urlopu [KP art. 182¹e § 1]:
 * tytuł odcinka (albo, bez `tytulId`, którykolwiek tytuł) to umowa o pracę trwająca w dniu `od`.
 * NIEJASNE (pytanie 10): osoby bez etatu – tymczasowo bez wydłużenia urlopu (D10).
 */
export function czyLaczenieDozwolone(rodzina: Rodzina, o: Odcinek): boolean {
  const osoba = rodzina.osoby.find((x) => x.id === o.osobaId);
  if (!osoba) return false;
  const etatWDniu = (t: TytulUbezpieczenia) => t.rodzaj === 'umowa_o_prace' && czyWOkresie(o.od, t.od, t.do);
  const tytul = o.tytulId ? osoba.tytuly.find((t) => t.id === o.tytulId) : undefined;
  if (tytul) return etatWDniu(tytul);
  return osoba.tytuly.some(etatWDniu);
}

/**
 * Wymiar pracy, który naprawdę zmniejsza zużycie puli: tylko rodzicielski, tylko u pracownika (D10) i najwyżej
 * pół etatu [KP art. 182¹e § 1] – większy wymiar to błąd `PRACA_WYMIAR_ZA_DUZY`, a pula liczy się jak przy limicie.
 */
export function wymiarPracyOdcinka(rodzina: Rodzina, o: Odcinek, p: Parametry): number {
  if (o.typ !== 'rodzicielski') return 0;
  const w = Math.min(p.limity.maxWymiarPracyPrzyLaczeniu, Math.max(0, o.wymiarPracy ?? 0));
  return w > 0 && czyLaczenieDozwolone(rodzina, o) ? w : 0;
}

/** Margines na błąd zaokrąglenia liczb zmiennoprzecinkowych (np. 100 × (1 − 0,3) = 70,000…01). */
const EPS = 1e-9;

/**
 * Ile dni puli rodzicielskiego zużywa odcinek: dni × (1 − wymiar pracy), w górę [KP art. 182¹f § 2, § 4, § 7; D10
 * po zmianie integratora]. To odwrotność długości liczonej w akcjach (A6): floor(bazowe / (1 − w)), więc
 * 448 dni przy 0,5 i 298 dni przy 0,25 zużywają dokładnie 224 dni.
 */
export function zuzycieOdcinka(rodzina: Rodzina, o: Odcinek, p: Parametry): number {
  return Math.ceil(dniOdcinka(o) * (1 - wymiarPracyOdcinka(rodzina, o, p)) - EPS);
}

/** O ile dni urlop trwa dłużej, niż zużywa z puli, bo rodzic pracuje [KP art. 182¹f § 2; D10]. */
export function wydluzenieOdcinka(rodzina: Rodzina, o: Odcinek, p: Parametry): number {
  return dniOdcinka(o) - zuzycieOdcinka(rodzina, o, p);
}

/**
 * Ostatni dzień macierzyńskiego (albo urlopu na warunkach macierzyńskiego) danej osoby z planu. Używa reguła
 * `RODZ_PRZED_KONCEM_MAC`: rodzicielski osoby zaczyna się po jej własnym macierzyńskim [KP art. 182¹a § 1], a drugi
 * rodzic może go brać w tym samym czasie (odpowiedź ZUS na stoisku 21.11, pytanie nr 16).
 */
export function koniecMacierzynskiegoOsoby(plan: Plan, osobaId: string): DataISO | undefined {
  return ostatniDzien(plan.odcinki.filter((o) => o.osobaId === osobaId && TYPY_MACIERZYNSKIE.includes(o.typ)));
}

/**
 * Dzień, w którym urlop rodzicielski kończy przepis, a nie wybór rodzica: `pule.rodzicielskiDoKiedy` po zgonie dziecka
 * [KP art. 182¹g w zw. z art. 180¹ § 2]. Część, która kończy się tego dnia, może nie mieć pełnych tygodni.
 */
export function koniecRodzicielskiegoZPrzepisu(rodzina: Rodzina, pule: Pule): DataISO | undefined {
  return pule.rodzicielskiDoKiedy && rodzina.zdarzenie.dzieci.some((d) => d.zgon !== undefined) ? pule.rodzicielskiDoKiedy : undefined;
}

/** Pula macierzyńskiego w dniach i jej ostatni dzień (gdy wynika z daty, np. po zgonie dziecka). */
export function pulaMacierzynskiego(rodzina: Rodzina, plan: Plan, pule: Pule): { dni: number; ostatniDzien?: DataISO } {
  if (pule.macierzynskiOstatniDzien) {
    // KP art. 180¹ § 1–2: koniec urlopu wynika z daty; dni przed porodem mieszczą się w tym samym oknie.
    const z = rodzina.zdarzenie.data;
    const poczatek = plan.odcinki
      .filter((o) => TYPY_MACIERZYNSKIE.includes(o.typ))
      .reduce((m, o) => (o.od < m ? o.od : m), z);
    return { dni: dniOdcinka({ od: poczatek, do: pule.macierzynskiOstatniDzien }), ostatniDzien: pule.macierzynskiOstatniDzien };
  }
  // KP art. 180 § 1, art. 183 § 1
  return { dni: pule.macierzynskiTyg * 7 };
}

export interface SlotRodzica {
  /** Brak = drugiego rodzica nie ma w rodzinie. */
  osobaId?: string;
  wykorzystaneDni: number;
}

/**
 * Wyłączne 9 tygodni każdego z dwojga rodziców [KP art. 182¹a § 4–5]. 9 tygodni nie przechodzi na drugiego rodzica
 * nigdy – także gdy rodzic nie ma prawa do zasiłku albo go nie ma w rodzinie (pusty slot); wtedy te tygodnie
 * przepadają (odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14). Wykorzystanie liczone według D10.
 */
export function slotyRodzicow(rodzina: Rodzina, plan: Plan, p: Parametry): SlotRodzica[] {
  const sloty: SlotRodzica[] = rodzina.osoby
    .filter((o) => ROLE_RODZICA.includes(o.rola))
    .map((o) => ({
      osobaId: o.id,
      wykorzystaneDni: suma(
        plan.odcinki.filter((x) => x.typ === 'rodzicielski' && x.osobaId === o.id).map((x) => zuzycieOdcinka(rodzina, x, p)),
      ),
    }));
  // Dwoje rodziców – każde ma swoją część [KP art. 182¹a § 4].
  while (sloty.length < 2) sloty.push({ wykorzystaneDni: 0 });
  return sloty;
}

/** Ile dni rodzicielskiego przepadnie: niewykorzystane części wyłączne, ale nie więcej, niż zostało w puli. */
export function przepadnieRodzicielskiego(rodzina: Rodzina, plan: Plan, pule: Pule, p: Parametry): number {
  const n7 = pule.rodzicielskiNieprzenoszalneTyg * 7;
  const r7 = pule.rodzicielskiTyg * 7;
  const wykorzystane = suma(plan.odcinki.filter((o) => o.typ === 'rodzicielski').map((o) => zuzycieOdcinka(rodzina, o, p)));
  const niewykorzystaneWylaczne = suma(slotyRodzicow(rodzina, plan, p).map((s) => Math.max(0, n7 - s.wykorzystaneDni)));
  return Math.max(0, Math.min(niewykorzystaneWylaczne, r7 - wykorzystane));
}

/** Ostatni dzień zasiłku osoby (ostatni odcinek zasiłkowy). */
export function koniecZasilku(plan: Plan, osobaId: string): DataISO | undefined {
  return ostatniDzien(plan.odcinki.filter((o) => o.osobaId === osobaId && czyZasilkowy(o)));
}

/** Dzień powrotu do pracy: dzień po ostatnim odcinku zasiłkowym albo urlopie wychowawczym osoby [KP art. 186⁴]. */
export function dataPowrotu(plan: Plan, osobaId: string): DataISO | undefined {
  const urlopy = plan.odcinki.filter((o) => o.osobaId === osobaId && (czyZasilkowy(o) || o.typ === 'wychowawczy'));
  const koniec = ostatniDzien(urlopy);
  return koniec ? dodajDni(koniec, 1) : undefined;
}

/** Czy osoba ma w danym dniu umowę o pracę (wtedy wraca do pracy po urlopie) [KP art. 186⁴]. */
export function maEtatWDniu(rodzina: Rodzina, osobaId: string, dzien: DataISO): boolean {
  const osoba = rodzina.osoby.find((o) => o.id === osobaId);
  return Boolean(osoba?.tytuly.some((t) => t.rodzaj === 'umowa_o_prace' && czyWOkresie(dzien, t.od, t.do)));
}

/** Stawka zasiłku do treści: 81.5 → „81,5%”. */
export function stawka(proc: number): string {
  return `${String(proc).replace('.', ',')}%`;
}

export function komunikat(
  kod: string,
  poziom: PoziomKomunikatu,
  tresc: string,
  przepis: string | undefined,
  dodatkowe: Pick<Komunikat, 'osobaId' | 'odcinekId' | 'coZrobic'> = {},
): Komunikat {
  const k: Komunikat = { kod, poziom, tresc, ...(przepis ? { przepis } : {}) };
  for (const [klucz, wartosc] of Object.entries(dodatkowe) as [keyof typeof dodatkowe, string | undefined][]) {
    if (wartosc !== undefined) k[klucz] = wartosc;
  }
  return k;
}

const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/** '2027-03-30' → '30 marca 2027'. */
export function dataSlownie(d: DataISO): string {
  return `${+d.slice(8, 10)} ${MIESIACE[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
}

const NAZWA_ROLI: Record<Rola, string> = {
  matka: 'mama',
  ojciec: 'tata',
  przyjmujacy: 'osoba przyjmująca dziecko',
  inny_czlonek_rodziny: 'członek rodziny',
};

/** Imię osoby albo nazwa roli („mama”, „tata”). */
export function nazwaOsoby(rodzina: Rodzina, osobaId: string): string {
  const o = rodzina.osoby.find((x) => x.id === osobaId);
  if (!o) return 'ta osoba';
  return o.dane?.imie ?? NAZWA_ROLI[o.rola];
}

/** Z wielkiej litery – na początek zdania. */
export function zWielkiej(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const DO_POTWIERDZENIA = 'Przepis nie rozstrzyga tego wprost, dlatego to wymaga potwierdzenia w ZUS.';
