/**
 * Persony testowe: dane fikcyjne, ale poprawne (PESEL, NIP, rachunek), pełne pochodzenie zgodne z mapą
 * źródeł (docs/zrodla-danych.json) i każda pokazuje swój przypadek z ZADANIA.md (tor D, D1). Tor D.
 */
import { describe, expect, it } from 'vitest';
import mapa from '../../../docs/zrodla-danych.json';
import {
  czyPoprawna,
  dodajLata,
  dodajMiesiace,
  koniecPoTygodniach,
  roznicaDni,
} from '../../engine/daty';
import { parametryNaDzien } from '../../engine/params';
import { WERSJE_DOMYSLNE } from '../../engine/params/domyslne';
import { ustalUprawnienia } from '../../engine/eligibility';
import type { Osoba, PersonaTestowa, TytulUbezpieczenia } from '../../engine/types';
import { PRZYKLAD_RODZINA } from '../przyklad';
import { MALZONKOWIE, PERSONY } from '../persony';
import { czyUsluga, jednostkiDanych, rekordyPola, symulujZrodlo, wartoscPola } from '../zrodla';

type RekordMapy = { id: string; zrodla: { zrodlo: string }[] };
const zrodlaRekordu = new Map((mapa as RekordMapy[]).map((r) => [r.id, r.zrodla.map((z) => z.zrodlo)]));

function persona(id: string): PersonaTestowa {
  const p = PERSONY.find((x) => x.id === id);
  if (!p) throw new Error(`brak persony ${id}`);
  return p;
}

function osoba(p: PersonaTestowa, rola: Osoba['rola']): Osoba {
  const o = p.rodzina.osoby.find((x) => x.rola === rola);
  if (!o) throw new Error(`${p.id}: brak osoby w roli ${rola}`);
  return o;
}

function tytulWDniu(o: Osoba, dzien: string): TytulUbezpieczenia | undefined {
  return o.tytuly.find((t) => t.od <= dzien && (t.do === undefined || dzien <= t.do));
}

function czyPoprawnyPesel(pesel: string): boolean {
  if (!/^\d{11}$/.test(pesel)) return false;
  const wagi = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const suma = wagi.reduce((s, w, i) => s + w * Number(pesel[i]), 0);
  return (10 - (suma % 10)) % 10 === Number(pesel[10]);
}

/** Data urodzenia zapisana w PESEL (miesiąc + 20 dla urodzonych w latach 2000–2099). */
function dataZPesel(pesel: string): string {
  const mm = Number(pesel.slice(2, 4));
  const rok = (mm > 20 ? 2000 : 1900) + Number(pesel.slice(0, 2));
  return `${rok}-${String(mm > 20 ? mm - 20 : mm).padStart(2, '0')}-${pesel.slice(4, 6)}`;
}

function czyPoprawnyNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false;
  const wagi = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  return wagi.reduce((s, w, i) => s + w * Number(nip[i]), 0) % 11 === Number(nip[9]);
}

/** REGON 9-cyfrowy: wagi 8,9,2,3,4,5,6,7, reszta z dzielenia przez 11 (10 → 0). */
function czyPoprawnyRegon(regon: string): boolean {
  if (!/^\d{9}$/.test(regon)) return false;
  const wagi = [8, 9, 2, 3, 4, 5, 6, 7];
  return (wagi.reduce((s, w, i) => s + w * Number(regon[i]), 0) % 11) % 10 === Number(regon[8]);
}

/** NRB: 26 cyfr, suma kontrolna IBAN (mod 97) dla kraju PL. */
function czyPoprawnyRachunek(nrb: string): boolean {
  if (!/^\d{26}$/.test(nrb)) return false;
  return BigInt(nrb.slice(2) + '2521' + nrb.slice(0, 2)) % BigInt(97) === BigInt(1);
}

/** Wszystkie liście obiektu (wartości proste, puste listy i puste obiekty) ze ścieżkami jak w `pochodzenie`. */
function liscie(wartosc: unknown, sciezka = ''): string[] {
  if (Array.isArray(wartosc)) {
    return wartosc.length === 0 ? [sciezka] : wartosc.flatMap((w, i) => liscie(w, `${sciezka}[${i}]`));
  }
  if (typeof wartosc === 'object' && wartosc !== null) {
    const pola = Object.entries(wartosc).filter(([, w]) => w !== undefined);
    if (pola.length === 0) return [sciezka];
    return pola.flatMap(([k, w]) => liscie(w, sciezka ? `${sciezka}.${k}` : k));
  }
  return [sciezka];
}

const TECHNICZNE = [/^dataAnalizy$/, /^osoby\[\d+\]\.id$/, /^osoby\[\d+\]\.tytuly\[\d+\]\.id$/];

describe('persony – lista', () => {
  it('jest sześć person z ZADANIA.md i persona z zaległością w składkach, każda z unikalnym id', () => {
    const ids = PERSONY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      [
        'adopcja-joanna',
        'anna-etat',
        'ewa-bez-ubezpieczenia-i-tomek',
        'kasia-zlecenie',
        'marta-i-piotr',
        'monika-firma-zaleglosc',
        'ola-firma',
      ].sort(),
    );
  });

  it.each(PERSONY.map((p) => [p.id, p] as const))('%s: ma nazwę, opis, dzień analizy 2026-11-21 i unikalne id osób', (_id, p) => {
    expect(p.nazwa.length).toBeGreaterThan(3);
    expect(p.opis.length).toBeGreaterThan(20);
    expect(p.rodzina.dataAnalizy).toBe('2026-11-21');
    expect(p.rodzina.osoby.length).toBeGreaterThan(0);
    const ids = p.rodzina.osoby.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of p.rodzina.osoby) {
      const idsTytulow = o.tytuly.map((t) => t.id);
      expect(new Set(idsTytulow).size).toBe(idsTytulow.length);
    }
  });

  it.each(PERSONY.map((p) => [p.id, p] as const))('%s: wszystkie daty mają format RRRR-MM-DD', (_id, p) => {
    const daty = liscie(p.rodzina)
      .map((s) => [s, wartoscPola(p.rodzina, s)] as const)
      .filter(([s, w]) => typeof w === 'string' && /(^|\.)(data\w*|od|do|chorobowoOd|zgon|porzucenieDziecka)$/.test(s));
    expect(daty.length).toBeGreaterThan(0);
    for (const [s, w] of daty) expect(czyPoprawna(w as string), s).toBe(true);
  });
});

describe('persony – małżeństwa', () => {
  it('MALZONKOWIE wskazuje istniejące persony i dwie różne osoby z każdej z nich', () => {
    for (const [id, para] of Object.entries(MALZONKOWIE)) {
      const p = persona(id);
      expect(para[0]).not.toBe(para[1]);
      for (const o of para) expect(p.rodzina.osoby.some((x) => x.id === o), `${id}/${o}`).toBe(true);
    }
    // Ewa i Tomek nie są małżeństwem (różne nazwiska) – rejestr PESEL nie da danych drugiego rodzica.
    expect(MALZONKOWIE['ewa-bez-ubezpieczenia-i-tomek']).toBeUndefined();
  });
});

describe('persony – dane fikcyjne, ale poprawne', () => {
  const osoby = PERSONY.flatMap((p) => p.rodzina.osoby.map((o) => [`${p.id}/${o.id}`, o] as const));

  it.each(osoby)('%s: PESEL ma poprawną sumę kontrolną i zgadza się z datą urodzenia i płcią', (_id, o) => {
    const pesel = o.dane?.pesel ?? '';
    expect(czyPoprawnyPesel(pesel), pesel).toBe(true);
    expect(dataZPesel(pesel)).toBe(o.dane?.dataUrodzenia);
    // 10. cyfra: parzysta – kobieta, nieparzysta – mężczyzna.
    if (o.rola === 'matka') expect(Number(pesel[9]) % 2).toBe(0);
    if (o.rola === 'ojciec') expect(Number(pesel[9]) % 2).toBe(1);
  });

  it.each(osoby)('%s: NIP i REGON płatnika oraz numer rachunku mają poprawne sumy kontrolne', (_id, o) => {
    for (const t of o.tytuly) expect(czyPoprawnyNip(t.nipPlatnika ?? ''), `${t.id}: ${t.nipPlatnika}`).toBe(true);
    for (const t of o.tytuly) if (t.regonPlatnika !== undefined) expect(czyPoprawnyRegon(t.regonPlatnika), `${t.id}: ${t.regonPlatnika}`).toBe(true);
    if (o.dane?.rachunekBankowy !== undefined) expect(czyPoprawnyRachunek(o.dane.rachunekBankowy)).toBe(true);
  });

  it.each(PERSONY.map((p) => [p.id, p] as const))('%s: dane dzieci – tylko po porodzie, PESEL poprawny i zgodny z datą porodu', (_id, p) => {
    const { zdarzenie } = p.rodzina;
    const poPorodzie = zdarzenie.typ === 'porod' && !zdarzenie.przewidywana;
    for (const d of zdarzenie.dzieci) {
      if (!poPorodzie) {
        expect(d.dane).toBeUndefined();
        continue;
      }
      expect(d.dane?.imie).toBeTruthy();
      expect(d.dane?.nazwisko).toBeTruthy();
      expect(d.dane?.miejsceUrodzenia).toBeTruthy();
      expect(czyPoprawnyPesel(d.dane?.pesel ?? ''), d.dane?.pesel).toBe(true);
      expect(dataZPesel(d.dane!.pesel!)).toBe(zdarzenie.data);
    }
  });

  it.each(osoby)('%s: ma dane do wniosków (imię, nazwisko, adres)', (_id, o) => {
    expect(o.dane?.imie).toBeTruthy();
    expect(o.dane?.nazwisko).toBeTruthy();
    expect(o.dane?.adres?.kod).toMatch(/^\d{2}-\d{3}$/);
    expect(o.dane?.adres?.miejscowosc).toBeTruthy();
  });

  it.each(osoby)('%s: każdy tytuł ma nazwę płatnika, a etat i zlecenie podstawy z 12 miesięcy', (_id, o) => {
    for (const t of o.tytuly) {
      expect(t.nazwaPlatnika, t.id).toBeTruthy();
      if (t.rodzaj === 'umowa_o_prace' || t.rodzaj === 'zlecenie') expect(t.podstawaSkladek?.length, t.id).toBe(12);
    }
  });
});

describe('persony – pochodzenie danych', () => {
  it.each(PERSONY.map((p) => [p.id, p] as const))('%s: każde pole ma dokładnie jedno pochodzenie, bez wpisów na wyrost', (_id, p) => {
    const jednostki = jednostkiDanych(p.rodzina).map((j) => j.sciezka);
    const wpisy = p.pochodzenie.map((x) => x.sciezka);
    expect(new Set(wpisy).size).toBe(wpisy.length);
    expect([...wpisy].sort()).toEqual([...jednostki].sort());
  });

  it.each(PERSONY.map((p) => [p.id, p] as const))('%s: tabela ścieżek obejmuje każde pole persony', (_id, p) => {
    const jednostki = jednostkiDanych(p.rodzina).map((j) => j.sciezka);
    const nieopisane = liscie(p.rodzina).filter(
      (l) => !TECHNICZNE.some((t) => t.test(l)) && !jednostki.some((j) => l === j || l.startsWith(`${j}.`) || l.startsWith(`${j}[`)),
    );
    expect(nieopisane).toEqual([]);
  });

  it.each(PERSONY.map((p) => [p.id, p] as const))('%s: każde źródło jest w mapie na liście źródeł tej danej', (_id, p) => {
    const jednostki = new Map(jednostkiDanych(p.rodzina).map((j) => [j.sciezka, j]));
    for (const { sciezka, zrodlo } of p.pochodzenie) {
      const j = jednostki.get(sciezka);
      expect(j, sciezka).toBeDefined();
      for (const r of rekordyPola(j!)) {
        expect(zrodlaRekordu.get(r.id), `${sciezka} ← ${zrodlo} (rekord ${r.id})`).toContain(zrodlo);
      }
    }
  });

  it.each(PERSONY.map((p) => [p.id, p] as const))('%s: dane „z e-usługi” ta usługa naprawdę oddaje w symulacji', (_id, p) => {
    for (const { sciezka, zrodlo } of p.pochodzenie) {
      if (!czyUsluga(zrodlo)) continue;
      const i = Number(/^osoby\[(\d+)\]/.exec(sciezka)?.[1] ?? 0);
      const odp = symulujZrodlo(zrodlo, p.rodzina, i);
      expect(odp.pochodzenie.map((x) => x.sciezka), `${sciezka} ← ${zrodlo}`).toContain(sciezka);
    }
  });
});

describe('persony – przypadki z ZADANIA.md', () => {
  it('anna-etat: przykład wzorcowy EC-01 z danymi do wniosków, bez zmiany wyniku', () => {
    const p = persona('anna-etat');
    expect(p.rodzina.zdarzenie).toEqual(PRZYKLAD_RODZINA.zdarzenie);
    const [mama] = p.rodzina.osoby;
    const [wzor] = PRZYKLAD_RODZINA.osoby;
    expect(mama.id).toBe(wzor.id);
    expect(mama.dane?.imie).toBe(wzor.dane?.imie);
    const [etat] = mama.tytuly;
    expect(etat).toMatchObject(wzor.tytuly[0]);
    // Podstawy z eZUS równe wynagrodzeniu z przykładu: kalkulator dalej daje 6903,20 zł.
    expect(etat.podstawaSkladek?.every((m) => m.kwota === wzor.tytuly[0].wynagrodzenieMiesieczne)).toBe(true);
  });

  it('kasia-zlecenie (EC-04): zlecenie z chorobowym kończy się miesiąc przed porodem, jeszcze po dniu analizy', () => {
    const p = persona('kasia-zlecenie');
    const mama = osoba(p, 'matka');
    expect(mama.tytuly).toHaveLength(1);
    const [zl] = mama.tytuly;
    expect(zl.rodzaj).toBe('zlecenie');
    expect(zl.chorobowe).toBe('dobrowolne');
    expect(zl.do).toBeDefined();
    expect(dodajMiesiace(zl.do!, 1)).toBe(p.rodzina.zdarzenie.data);
    expect(p.rodzina.zdarzenie).toMatchObject({ typ: 'porod', przewidywana: true });
    // Ostrzeżenie „z wyprzedzeniem”: umowa jeszcze trwa w dniu analizy.
    expect(zl.do! > p.rodzina.dataAnalizy).toBe(true);
    expect(tytulWDniu(mama, p.rodzina.zdarzenie.data)).toBeUndefined();
  });

  it('ola-firma (EC-10): działalność, chorobowe od 5 tygodni przed porodem, zadłużenie 0', () => {
    const p = persona('ola-firma');
    const mama = osoba(p, 'matka');
    const [firma] = mama.tytuly;
    expect(firma.rodzaj).toBe('dzialalnosc');
    expect(firma.chorobowe).toBe('dobrowolne');
    // Od 1. dnia miesiąca (pełny miesiąc w kalkulatorze): 5 tygodni i 1 dzień przed porodem.
    expect(roznicaDni(firma.chorobowoOd!, p.rodzina.zdarzenie.data)).toBe(5 * 7 + 1);
    expect(firma.zadluzenieSkladkowe).toBe(0);
    expect(firma.zadeklarowanaPodstawa).toBeGreaterThan(0);
    // Firma działa od dawna – późno zgłoszone jest tylko chorobowe (podstawa według art. 48a).
    expect(dodajLata(firma.od, 1) < firma.chorobowoOd!).toBe(true);
    expect(firma.chorobowoOd! <= p.rodzina.dataAnalizy).toBe(true);
    expect(p.rodzina.zdarzenie.przewidywana).toBe(true);
    // Saldo z eZUS jest „na dziś”, a nie na dzień porodu.
    expect(firma.zadluzenieSkladkoweNaDzien).toBe(p.rodzina.dataAnalizy);
  });

  it('monika-firma-zaleglosc: działalność z dobrowolnym chorobowym od lat, zaległość w składkach powyżej progu (UZ art. 2a)', () => {
    const p = persona('monika-firma-zaleglosc');
    const [firma] = osoba(p, 'matka').tytuly;
    expect(firma.rodzaj).toBe('dzialalnosc');
    expect(firma.chorobowe).toBe('dobrowolne');
    // Chorobowe od dawna – bez ryzyka późnego zgłoszenia, żeby persona pokazywała samą zaległość.
    expect(dodajLata(firma.chorobowoOd!, 1) < p.rodzina.dataAnalizy).toBe(true);
    const par = parametryNaDzien(p.rodzina.dataAnalizy, WERSJE_DOMYSLNE);
    const prog = (par.kwoty.placaMinimalna * par.limity.progZaleglosciProcPlacyMinimalnej) / 100;
    expect(firma.zadluzenieSkladkowe!).toBeGreaterThan(prog);
    expect(firma.zadluzenieSkladkoweNaDzien).toBe(p.rodzina.dataAnalizy);
    expect(p.rodzina.zdarzenie.przewidywana).toBe(true);
  });

  it('monika-firma-zaleglosc: silnik wstrzymuje zasiłek do spłaty zaległości i pokazuje ryzyko', () => {
    const p = persona('monika-firma-zaleglosc');
    const w = ustalUprawnienia(p.rodzina, WERSJE_DOMYSLNE);
    expect(w.uprawnienia.some((u) => u.kod === 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI')).toBe(true);
    expect(w.ryzyka.some((r) => r.kod === 'ZADLUZENIE_SKLADKOWE')).toBe(true);
    expect(w.ryzyka.some((r) => r.kod === 'POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA')).toBe(false);
  });

  it('ola-firma: zawieszenie działalności (CEIDG) zakończone przed zgłoszeniem do chorobowego', () => {
    const [firma] = osoba(persona('ola-firma'), 'matka').tytuly;
    expect(firma.zawieszenia?.length).toBeGreaterThan(0);
    for (const z of firma.zawieszenia!) {
      expect(firma.od < z.od).toBe(true);
      expect(z.do).toBeDefined();
      expect(z.od <= z.do! && z.do! < firma.chorobowoOd!).toBe(true);
    }
  });

  it('marta-i-piotr: pobrany zasiłek chorobowy jest spójny z e-ZLA (po 33 dniach wynagrodzenia w roku) i wypłacał go ZUS', () => {
    const p = persona('marta-i-piotr');
    const mama = osoba(p, 'matka');
    const ezla = mama.zdrowie?.eZLA ?? [];
    for (const z of mama.pobraneZasilki ?? []) {
      // KP art. 92 § 1 i § 4: zasiłek chorobowy dopiero po 33 dniach niezdolności w roku kalendarzowym.
      const rok = z.od.slice(0, 4);
      const wczesniej = ezla
        .filter((e) => e.od.startsWith(rok) && e.do < z.od)
        .reduce((s, e) => s + roznicaDni(e.od, e.do) + 1, 0);
      expect(wczesniej).toBeGreaterThanOrEqual(parametryNaDzien(z.od).limity.wynagrodzenieChoroboweDni);
      expect(ezla.some((e) => e.od <= z.od && z.do <= e.do)).toBe(true);
      // UZ art. 61 ust. 1 pkt 2 lit. a: płatnik do 20 ubezpieczonych → wypłaca ZUS.
      expect(mama.tytuly[0].platnikPowyzej20).toBe(false);
      expect(z.ktoWyplacal).toBe('ZUS');
    }
    expect(mama.pobraneZasilki?.length).toBeGreaterThan(0);
  });

  it('marta-i-piotr: oboje na etatach, bliźnięta już urodzone, przejęcie po 14 tygodniach jeszcze przed nimi', () => {
    const p = persona('marta-i-piotr');
    const { zdarzenie, dataAnalizy } = p.rodzina;
    expect(zdarzenie.typ).toBe('porod');
    expect(zdarzenie.dzieci).toHaveLength(2);
    expect(zdarzenie.przewidywana).toBe(false);
    expect(zdarzenie.data <= dataAnalizy).toBe(true);
    for (const rola of ['matka', 'ojciec'] as const) {
      expect(tytulWDniu(osoba(p, rola), zdarzenie.data)?.rodzaj, rola).toBe('umowa_o_prace');
    }
    expect(koniecPoTygodniach(zdarzenie.data, 14) > dataAnalizy).toBe(true);
    // e-ZLA w ciąży z kodem B przed porodem.
    const ezla = osoba(p, 'matka').zdrowie?.eZLA ?? [];
    expect(ezla.some((z) => z.kodB && z.do < zdarzenie.data)).toBe(true);
    expect(ezla.some((z) => !z.kodB)).toBe(true);
  });

  it('ewa-bez-ubezpieczenia-i-tomek (EC-56): mama bez tytułu, tata na etacie w dniu porodu', () => {
    const p = persona('ewa-bez-ubezpieczenia-i-tomek');
    expect(osoba(p, 'matka').tytuly).toEqual([]);
    expect(tytulWDniu(osoba(p, 'ojciec'), p.rodzina.zdarzenie.data)?.rodzaj).toBe('umowa_o_prace');
    expect(p.rodzina.zdarzenie).toMatchObject({ typ: 'porod', przewidywana: true });
  });

  it('adopcja-joanna (EC-40): przysposobienie dziecka, które w dniu przyjęcia ma 4 lata', () => {
    const p = persona('adopcja-joanna');
    const { zdarzenie } = p.rodzina;
    expect(zdarzenie.typ).toBe('przysposobienie');
    expect(zdarzenie.dzieci).toHaveLength(1);
    const ur = zdarzenie.dzieci[0].dataUrodzenia!;
    expect(dodajLata(ur, 4) <= zdarzenie.data && zdarzenie.data < dodajLata(ur, 5)).toBe(true);
    const j = osoba(p, 'przyjmujacy');
    expect(tytulWDniu(j, zdarzenie.data)?.rodzaj).toBe('umowa_o_prace');
  });
});
