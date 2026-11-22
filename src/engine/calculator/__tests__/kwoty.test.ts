import { describe, expect, it } from 'vitest';
import { suma } from '../../pieniadze';
import { PARAMETRY_2026, WERSJE_DOMYSLNE } from '../../params';
import { PERSONY } from '../../../mocks/persony';
import { PRZYKLAD_KWOTY, PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import type { KwotaOdcinka, Odcinek, Osoba, Parametry, Plan, Rodzina, TytulUbezpieczenia, WynikKwot } from '../../types';
import { obliczKwoty } from '..';
import { zaliczkaMiesieczna } from '../podatek';

const liczby = (o: KwotaOdcinka) => ({
  odcinekId: o.odcinekId, osobaId: o.osobaId, podstawa: o.podstawa, stawkaProc: o.stawkaProc,
  dziennie: o.dziennie, dni: o.dni, razem: o.razem, miesiecznie: o.miesiecznie, rozbicieMiesieczne: o.rozbicieMiesieczne,
});
const plan = (odcinki: Odcinek[], wariant815 = false): Plan => ({ id: 'p', nazwa: 'test', wariant815, odcinki });
const tata: Osoba = {
  id: 'tata', rola: 'ojciec',
  tytuly: [{ id: 'etat-t', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 6000 }],
};
const zTata: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [...PRZYKLAD_RODZINA.osoby, tata] };

function sprawdzSpojnosc(w: WynikKwot) {
  for (const o of w.odcinki) {
    expect(suma(o.rozbicieMiesieczne.map((m) => m.kwota))).toBe(o.razem);
    expect(o.rozbicieMiesieczne.reduce((s, m) => s + m.dni, 0)).toBe(o.dni);
    expect(o.sciezka.length).toBeGreaterThan(0);
  }
  expect(suma(Object.values(w.sumaOsoby))).toBe(w.sumaRazem);
  expect(suma(w.odcinki.map((o) => o.razem + (o.podwyzszenie ?? 0)))).toBe(w.sumaRazem);
}

const kody = (w: WynikKwot, odcinekId?: string) => w.uwagi.filter((u) => odcinekId === undefined || u.odcinekId === odcinekId).map((u) => u.kod);
const odcinek = (w: WynikKwot, id: string): KwotaOdcinka => {
  const o = w.odcinki.find((x) => x.odcinekId === id);
  if (!o) throw new Error(`brak odcinka ${id}`);
  return o;
};
const PRZEPIS_PODWYZSZENIA = 'UZ art. 31 ust. 3a–3c; Poradnik ZUS 2026, s. 19';
const zlecenie = (id: string, wynagrodzenieMiesieczne: number): TytulUbezpieczenia => ({
  id, rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', wynagrodzenieMiesieczne,
});
const naZleceniach = (tytuly: TytulUbezpieczenia[], rola: Osoba['rola'] = 'matka'): Rodzina => ({
  ...PRZYKLAD_RODZINA, osoby: [{ id: 'z', rola, tytuly }],
});

describe('obliczKwoty – rdzeń', () => {
  it('wzorzec: te same liczby co PRZYKLAD_KWOTY', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    expect(w.odcinki.map(liczby)).toEqual(PRZYKLAD_KWOTY.odcinki.map(liczby));
    // ścieżka do kroku zaliczki (zaliczki i podwyższenia nie ma we wzorcu): opis, wzór, wartość i przepis jak we wzorcu
    const doZaliczki = (o: KwotaOdcinka) => o.sciezka.slice(0, o.sciezka.findIndex((k) => k.opis === 'Zaliczka na podatek (szacunek)'));
    expect(w.odcinki.map(doZaliczki)).toEqual(PRZYKLAD_KWOTY.odcinki.map((o) => o.sciezka));
    expect(w.podstawy).toHaveLength(1);
    expect(w.podstawy[0].kwota).toBe(6903.2);
    expect(w.sumaOsoby).toEqual({ mama: 68295.08 });
    expect(w.sumaRazem).toBe(68295.08);
    expect(w.uwagi.map((u) => u.kod)).toEqual(['SZACUNEK_BEZ_ULG']);
    sprawdzSpojnosc(w);
  });
  it('81,5%: macierzyński i rodzicielski matki po 187,54 zł dziennie', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, { ...PRZYKLAD_PLAN, wariant815: true }, WERSJE_DOMYSLNE);
    expect(w.odcinki.map((o) => [o.stawkaProc, o.dziennie, o.razem])).toEqual([[81.5, 187.54, 26255.6], [81.5, 187.54, 42008.96]]);
    expect(w.sumaRazem).toBe(68264.56);
    sprawdzSpojnosc(w);
  });
  it('ojcowski: 100% podstawy ojca, 172,58 × 14', () => {
    const w = obliczKwoty(zTata, plan([{ id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' }]), WERSJE_DOMYSLNE);
    expect(liczby(w.odcinki[0])).toMatchObject({ osobaId: 'tata', podstawa: 5177.4, stawkaProc: 100, dziennie: 172.58, dni: 14, razem: 2416.12 });
    expect(w.sumaOsoby).toEqual({ tata: 2416.12 });
    sprawdzSpojnosc(w);
  });
  it('ciąża: zasiłek chorobowy 100% podstawy', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'c1', osobaId: 'mama', typ: 'chorobowy_ciaza', od: '2026-10-01', do: '2026-10-31' }]), WERSJE_DOMYSLNE);
    expect(liczby(w.odcinki[0])).toMatchObject({ stawkaProc: 100, dziennie: 230.11, dni: 31, razem: 7133.41 });
    sprawdzSpojnosc(w);
  });
  it('bez kwoty: praca, przerwa i wychowawczy nie mają wpisu', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, plan([
      { id: 'a', osobaId: 'mama', typ: 'praca', od: '2027-01-01', do: '2027-01-31' },
      { id: 'b', osobaId: 'mama', typ: 'przerwa', od: '2027-02-01', do: '2027-02-28' },
      { id: 'c', osobaId: 'mama', typ: 'wychowawczy', od: '2027-03-01', do: '2027-03-31' },
    ]), WERSJE_DOMYSLNE);
    expect(w.odcinki).toEqual([]);
    expect(w.sumaRazem).toBe(0);
    expect(w.uwagi).toEqual([]);
  });
  it('EC-80: rodzicielski z pracą na pół etatu – połowa stawki dziennej, połówka grosza w górę', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29', wymiarPracy: 0.5 }]), WERSJE_DOMYSLNE);
    expect(liczby(w.odcinki[0])).toMatchObject({ stawkaProc: 70, dziennie: 80.54, dni: 224, razem: 18040.96 });
    expect(w.odcinki[0].sciezka.some((k) => k.przepis === 'UZ art. 31 ust. 4a')).toBe(true);
    sprawdzSpojnosc(w);
  });
  it('luty w roku przestępnym ma 29 dni', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2028-02-01', do: '2028-02-29' }]), WERSJE_DOMYSLNE);
    expect(w.odcinki[0].rozbicieMiesieczne).toEqual([{ miesiac: '2028-02', dni: 29, kwota: 4671.03 }]);
  });
  it('złe dane nie rzucają wyjątku: nieznana osoba, brak tytułu z chorobowym, odwrócony odcinek', () => {
    const bezChorobowego: Osoba = { id: 'x', rola: 'ojciec', tytuly: [{ id: 'z', rodzaj: 'zlecenie', chorobowe: 'brak', od: '2024-01-01', wynagrodzenieMiesieczne: 3000 }] };
    const rodzina: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [...PRZYKLAD_RODZINA.osoby, bezChorobowego] };
    const w = obliczKwoty(rodzina, plan([
      { id: 'n', osobaId: 'ktos-inny', typ: 'macierzynski', od: '2026-12-01', do: '2026-12-31' },
      { id: 'b', osobaId: 'x', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' },
      { id: 'o', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-31', do: '2026-12-01' },
    ]), WERSJE_DOMYSLNE);
    expect(w.odcinki).toEqual([]);
    expect(w.uwagi.map((u) => [u.kod, u.odcinekId])).toEqual([['NIEZNANA_OSOBA', 'n'], ['BRAK_TYTULU_Z_CHOROBOWYM', 'b'], ['ODCINEK_ODWROCONY', 'o']]);
    expect(w.sumaRazem).toBe(0);
  });
});

describe('obliczKwoty – „na rękę” (zaliczka na podatek)', () => {
  const zPit2: Rodzina = { ...PRZYKLAD_RODZINA, osoby: PRZYKLAD_RODZINA.osoby.map((o) => ({ ...o, pit2: true })) };

  it('wzorzec bez PIT-2: zaliczka i „na rękę” przy każdym odcinku, kwiecień 2027 jedna zaliczka 737 zł na oba odcinki', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    for (const o of w.odcinki) {
      expect(o.zaliczkaPodatku).toBeDefined();
      expect(o.naReke).toBe(suma([o.razem, -(o.zaliczkaPodatku ?? 0)]));
      const krok = o.sciezka[o.sciezka.length - 1];
      expect(krok).toMatchObject({ opis: 'Zaliczka na podatek (szacunek)', wartosc: o.zaliczkaPodatku, przepis: 'ustawa o PIT art. 34 ust. 3' });
    }
    expect(w.naRekeRazem).toBe(suma(w.odcinki.map((o) => o.naReke ?? 0)));
    // m1: 856 + 856 + 773 + 856 + 524,46; r1: 212,54 + 599 + 580 + 599 + 599 + 580 + 599 + 561
    expect(w.odcinki[0].zaliczkaPodatku).toBe(3865.46);
    expect(w.odcinki[1].zaliczkaPodatku).toBe(4329.54);
    expect(suma(w.odcinki.map((o) => o.zaliczkaPodatku ?? 0))).toBe(8195);
    expect(w.naRekeRazem).toBe(60100.08);
  });
  it('kwiecień 2027: 737 zł rozdzielone proporcjonalnie na 524,46 zł (m1) i 212,54 zł (r1)', () => {
    expect(zaliczkaMiesieczna(4372.09 + 1771.77, false, PARAMETRY_2026)).toBe(737);
    const w = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    // m1 bez kwietnia: 856 + 856 + 773 + 856 = 3341; r1 bez kwietnia: 599 + 580 + 599 + 599 + 580 + 599 + 561 = 4117
    expect(suma([(w.odcinki[0].zaliczkaPodatku ?? 0), -3341])).toBe(524.46);
    expect(suma([(w.odcinki[1].zaliczkaPodatku ?? 0), -4117])).toBe(212.54);
  });
  it('z PIT-2 „na rękę” jest wyższe o 3600 zł (300 zł × 12 miesięcy), brutto bez zmian', () => {
    const bez = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    const z = obliczKwoty(zPit2, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    expect(suma([z.naRekeRazem ?? 0, -(bez.naRekeRazem ?? 0)])).toBe(3600);
    expect(z.sumaRazem).toBe(bez.sumaRazem);
    expect(z.odcinki.map(liczby)).toEqual(bez.odcinki.map(liczby));
  });
  it('dwa tytuły z PIT-2: pomniejszenie tylko przy pierwszym tytule osoby, niezależnie od kolejności odcinków w planie', () => {
    const osoba: Osoba = {
      id: 'tata', rola: 'ojciec', pit2: true,
      tytuly: [
        { id: 't1', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 6000 },
        { id: 't2', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 7000 },
      ],
    };
    const rodzina: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [osoba] };
    const w = obliczKwoty(rodzina, plan([
      { id: 'o2', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-15', do: '2026-12-28', tytulId: 't2' },
      { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14', tytulId: 't1' },
    ]), WERSJE_DOMYSLNE);
    const [o2, o1] = w.odcinki;
    expect(o1.zaliczkaPodatku).toBe(zaliczkaMiesieczna(o1.razem, true, PARAMETRY_2026));
    expect(o2.zaliczkaPodatku).toBe(zaliczkaMiesieczna(o2.razem, false, PARAMETRY_2026));
    expect(o1.zaliczkaPodatku).toBeLessThan(zaliczkaMiesieczna(o1.razem, false, PARAMETRY_2026));
  });
  it('uwaga SZACUNEK_BEZ_ULG jest jedna i ma poziom info; bez kwot jej nie ma', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    expect(w.uwagi.filter((u) => u.kod === 'SZACUNEK_BEZ_ULG')).toHaveLength(1);
    expect(w.uwagi[0].poziom).toBe('info');
    const pusty = obliczKwoty(PRZYKLAD_RODZINA, plan([]), WERSJE_DOMYSLNE);
    expect(pusty.uwagi).toEqual([]);
  });
});

describe('obliczKwoty – odporność i brakujące przypadki', () => {
  it('odcinek z niepoprawną datą nie rzuca wyjątku: brak wpisu i uwaga ODCINEK_BLEDNA_DATA', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, plan([
      { id: 'a', osobaId: 'mama', typ: 'macierzynski', od: '2026-13-01', do: '2026-12-31' },
      { id: 'b', osobaId: 'mama', typ: 'rodzicielski', od: '2027-01-01', do: 'jutro' },
      { id: 'c', osobaId: 'mama', typ: 'macierzynski', od: '2027-02-30', do: '2027-03-01' },
    ]), WERSJE_DOMYSLNE);
    expect(w.odcinki).toEqual([]);
    expect(w.uwagi.map((u) => [u.kod, u.poziom, u.odcinekId])).toEqual([
      ['ODCINEK_BLEDNA_DATA', 'ostrzezenie', 'a'], ['ODCINEK_BLEDNA_DATA', 'ostrzezenie', 'b'], ['ODCINEK_BLEDNA_DATA', 'ostrzezenie', 'c'],
    ]);
  });
  it('odcinek bez zasiłku z błędną datą nie daje uwagi (nie ma za co liczyć)', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'p', osobaId: 'mama', typ: 'praca', od: 'x', do: 'y' }]), WERSJE_DOMYSLNE);
    expect(w.uwagi).toEqual([]);
  });
  it('wymiarPracy spoza 0–1: uwaga WYMIAR_PRACY_POZA_ZAKRESEM, kwota bez pomniejszenia', () => {
    const bez = obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-19' }]), WERSJE_DOMYSLNE);
    for (const wymiar of [1.5, -0.2]) {
      const w = obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-19', wymiarPracy: wymiar }]), WERSJE_DOMYSLNE);
      expect(w.odcinki[0].razem).toBe(bez.odcinki[0].razem);
      expect(w.odcinki[0].sciezka.some((k) => k.przepis === 'UZ art. 31 ust. 4a')).toBe(false);
      const u = w.uwagi.find((x) => x.kod === 'WYMIAR_PRACY_POZA_ZAKRESEM');
      expect(u).toMatchObject({ poziom: 'ostrzezenie', odcinekId: 'r1' });
    }
  });
  const niskie: Osoba = {
    id: 'tata', rola: 'ojciec',
    tytuly: [{ id: 'e', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 3000 }],
  };
  it('UZ art. 43: dwa płatne odcinki tej samej pary osoba + tytuł z przerwą obejmującą cały styczeń – podstawa ustalana na nowo dla każdego (plan w odwróconej kolejności)', () => {
    const rodzina: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [niskie] };
    const wczesny: Odcinek = { id: 'w', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' };
    const pozny: Odcinek = { id: 'z', osobaId: 'tata', typ: 'rodzicielski', od: '2027-02-01', do: '2027-02-14' };
    const sam = obliczKwoty(rodzina, plan([wczesny]), WERSJE_DOMYSLNE);
    const w = obliczKwoty(rodzina, plan([pozny, wczesny]), WERSJE_DOMYSLNE);
    // Między 14.12.2026 a 1.02.2027 mieści się cały styczeń, więc UZ art. 43 nie łączy tych zasiłków: podstawę „z”
    // ustala się na nowo na 1.02.2027. Wcześniej utrwalaliśmy jedną podstawę z grudnia i uwagę EC-97 przy „z” – błędnie.
    // Kolejność podstaw = kolejność pierwszego użycia w planie („z”, potem „w”).
    // „z”: 3000 × 86,29% = 2588,70 < minimum 2027: 4950 × 86,29% = 4271,36; „w”: minimum 2026: 4806 × 86,29% = 4147,10
    expect(w.podstawy.map((p) => [p.kwota, p.ograniczenia])).toEqual([[4271.36, ['minimum_art_45']], [4147.1, ['minimum_art_45']]]);
    expect(sam.podstawy[0].kwota).toBe(4147.1);
    expect(w.odcinki.map((o) => [o.odcinekId, o.podstawa])).toEqual([['z', 4271.36], ['w', 4147.1]]);
    // podstawa „z” ustalona w 2027 r. już uwzględnia płacę minimalną 2027 r., więc nie ma uwagi EC-97
    expect(kody(w, 'z')).toEqual([]);
    expect(kody(w, 'w')).toEqual([]);
  });
  it('UZ art. 43: przerwa krótsza niż pełny miesiąc kalendarzowy – jedna podstawa z dnia wcześniejszego odcinka', () => {
    const rodzina: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [niskie] };
    const w = obliczKwoty(rodzina, plan([
      { id: 'z', osobaId: 'tata', typ: 'rodzicielski', od: '2027-01-31', do: '2027-02-14' },
      { id: 'w', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' },
    ]), WERSJE_DOMYSLNE);
    // między 14.12.2026 a 31.01.2027 nie mieści się cały styczeń: jedna podstawa z 1.12.2026 (4147,10),
    // a dni w 2027 r. od minimum z płacy minimalnej 2027 r. (EC-97, 4271,36) z uwagą do potwierdzenia
    expect(w.podstawy.map((p) => p.kwota)).toEqual([4147.1]);
    expect(w.odcinki.map((o) => [o.odcinekId, o.podstawa])).toEqual([['z', 4271.36], ['w', 4147.1]]);
    expect(kody(w, 'z')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
  });
  it('UZ art. 43: działalność, ojcowski w styczniu 2027 i rodzicielski od 1.09.2027 – dwie podstawy, z 3 i z 11 miesięcy', () => {
    const dg: Osoba = {
      id: 'tata', rola: 'ojciec',
      tytuly: [{ id: 'dg', rodzaj: 'dzialalnosc', chorobowe: 'dobrowolne', od: '2026-10-01', chorobowoOd: '2026-10-01', zadeklarowanaPodstawa: 20000 }],
    };
    const w = obliczKwoty({ ...PRZYKLAD_RODZINA, osoby: [dg] }, plan([
      { id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-04', do: '2027-01-17' },
      { id: 'r', osobaId: 'tata', typ: 'rodzicielski', od: '2027-09-01', do: '2027-11-02' },
    ]), WERSJE_DOMYSLNE);
    // ojcowski (prawo 4.01.2027, okres 10–12.2026, art. 48a, n = 3, parametry 2026 r.):
    //   pkt 1: 5652 × 86,29% = 4877,11; pkt 2: (20 000 − 5652) × 86,29% = 12 380,89; × 3 ÷ 12 = 3095,22; razem 7972,33
    // rodzicielski (prawo 1.09.2027, okres 10.2026–08.2027, art. 48a, n = 11, każdy miesiąc z parametrami swojego roku):
    //   pkt 1: (3 × 4877,11 + 8 × 5194,49) ÷ 11 = 56 187,25 ÷ 11 = 5107,93   (5194,49 = 6019,80 × 86,29%)
    //   pkt 2: (3 × 12 380,89 + 8 × 12 063,51) ÷ 12 = 133 650,75 ÷ 12 = 11 137,56   (12 063,51 = (20 000 − 6019,80) × 86,29%)
    //   razem 5107,93 + 11 137,56 = 16 245,49
    expect(w.podstawy.map((p) => [p.kwota, p.metoda])).toEqual([[7972.33, 'art_48a'], [16245.49, 'art_48a']]);
    // ojcowski: 7972,33 ÷ 30 = 265,74; × 14 = 3720,36
    expect(liczby(odcinek(w, 'o'))).toMatchObject({ podstawa: 7972.33, dziennie: 265.74, dni: 14, razem: 3720.36 });
    // rodzicielski: 16 245,49 ÷ 30 × 70% = 379,06; × 63 = 23 880,78.
    // Brief podawał 23 891,49 – to wynik z parametrami 2027 r. dla wszystkich 11 miesięcy (podstawa 16 252,71,
    // stawka 379,23), czyli bez poprawki K1; z najniższą podstawą 2026 r. za 10–12.2026 (UZ art. 48a ust. 1) wychodzi 23 880,78.
    // Bez art. 43 (jedna podstawa z 4.01.2027): 7972,33 ÷ 30 × 70% = 186,02; × 63 = 11 719,26.
    expect(liczby(odcinek(w, 'r'))).toMatchObject({ podstawa: 16245.49, dziennie: 379.06, dni: 63, razem: 23880.78 });
    expect(kody(w)).not.toContain('DO_POTWIERDZENIA_W_ZUS');
    sprawdzSpojnosc(w);
  });
  it('tytulId, którego osoba nie ma, kończy się wyborem pierwszego tytułu z chorobowym', () => {
    const osoba: Osoba = {
      id: 'tata', rola: 'ojciec',
      tytuly: [
        { id: 'z', rodzaj: 'zlecenie', chorobowe: 'brak', od: '2024-01-01', wynagrodzenieMiesieczne: 3000 },
        { id: 'e', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 6000 },
      ],
    };
    const rodzina: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [osoba] };
    const w = obliczKwoty(rodzina, plan([{ id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14', tytulId: 'nie-ma-takiego' }]), WERSJE_DOMYSLNE);
    expect(w.podstawy.map((p) => p.tytulId)).toEqual(['e']);
    expect(w.odcinki).toHaveLength(1);
  });
  it('tytulId wskazujący tytuł bez ubezpieczenia chorobowego: uwaga BRAK_TYTULU_Z_CHOROBOWYM i brak wpisu', () => {
    const osoba: Osoba = {
      id: 'tata', rola: 'ojciec',
      tytuly: [
        { id: 'z', rodzaj: 'zlecenie', chorobowe: 'brak', od: '2024-01-01', wynagrodzenieMiesieczne: 3000 },
        { id: 'e', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 6000 },
      ],
    };
    const w = obliczKwoty({ ...PRZYKLAD_RODZINA, osoby: [osoba] }, plan([{ id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14', tytulId: 'z' }]), WERSJE_DOMYSLNE);
    expect(w.odcinki).toEqual([]);
    expect(w.podstawy).toEqual([]);
    expect(w.uwagi.map((u) => [u.kod, u.odcinekId])).toEqual([['BRAK_TYTULU_Z_CHOROBOWYM', 'o']]);
  });
  it('bez tytulId: pierwszy tytuł z chorobowym aktywny w dniu początku odcinka (pomija zakończone i przyszłe)', () => {
    const osoba: Osoba = {
      id: 'tata', rola: 'ojciec',
      tytuly: [
        { id: 'stary', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2018-01-01', do: '2026-06-30', wymiarEtatu: 1, wynagrodzenieMiesieczne: 3000 },
        { id: 'ustal', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2026-07-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 4000, ustanie: { data: '2026-11-30' } },
        { id: 'przyszly', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2027-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 5000 },
        { id: 'bez', rodzaj: 'zlecenie', chorobowe: 'brak', od: '2026-01-01', wynagrodzenieMiesieczne: 1000 },
        { id: 'teraz', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2026-12-01', do: '2026-12-31', wymiarEtatu: 1, wynagrodzenieMiesieczne: 9000 },
      ],
    };
    const w = obliczKwoty({ ...PRZYKLAD_RODZINA, osoby: [osoba] }, plan([{ id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' }]), WERSJE_DOMYSLNE);
    expect(w.podstawy.map((p) => p.tytulId)).toEqual(['teraz']);
  });
  it('bez tytulId i bez tytułu aktywnego w dniu odcinka: pierwszy tytuł z chorobowym (jak dotąd)', () => {
    const osoba: Osoba = {
      id: 'tata', rola: 'ojciec',
      tytuly: [
        { id: 'bez', rodzaj: 'zlecenie', chorobowe: 'brak', od: '2026-01-01', wynagrodzenieMiesieczne: 1000 },
        { id: 'stary', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2018-01-01', do: '2026-06-30', wymiarEtatu: 1, wynagrodzenieMiesieczne: 3000 },
        { id: 'przyszly', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2027-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 5000 },
      ],
    };
    const w = obliczKwoty({ ...PRZYKLAD_RODZINA, osoby: [osoba] }, plan([{ id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' }]), WERSJE_DOMYSLNE);
    expect(w.podstawy.map((p) => p.tytulId)).toEqual(['stary']);
  });
  it('persona marta-i-piotr: Piotr bierze 9 tygodni rodzicielskiego od 1.02.2028 – podstawa szacowana z ostatnich znanych miesięcy, z uwagą', () => {
    const persona = PERSONY.find((x) => x.id === 'marta-i-piotr');
    if (!persona) throw new Error('brak persony marta-i-piotr');
    const w = obliczKwoty(persona.rodzina, plan([
      { id: 'r1', osobaId: 'tata', typ: 'rodzicielski', od: '2028-02-01', do: '2028-02-29' },
      { id: 'r2', osobaId: 'tata', typ: 'rodzicielski', od: '2028-03-01', do: '2028-04-03' },
    ]), WERSJE_DOMYSLNE);
    // lista eZUS 11.2025–10.2026 po 9200 zł nie sięga okresu 02.2027–01.2028: szacunek 9200 × 86,29% = 7938,68
    // (bez szacunku minimum 2027 r. 4271,36). 7938,68 ÷ 30 × 70% = 185,24; 29 × 185,24 = 5371,96; 34 × 185,24 = 6298,16
    expect(w.odcinki.map((o) => [o.podstawa, o.dziennie, o.dni, o.razem])).toEqual([[7938.68, 185.24, 29, 5371.96], [7938.68, 185.24, 34, 6298.16]]);
    // razem 63 dni: 11 670,12 (bez szacunku 63 × 99,67 = 6279,21)
    expect(w.sumaOsoby).toEqual({ tata: 11670.12 });
    expect(w.uwagi.filter((u) => u.kod === 'PODSTAWA_SZACOWANA')).toEqual([expect.objectContaining({ poziom: 'ostrzezenie', osobaId: 'tata' })]);
    expect(kody(w)).not.toContain('BRAK_DANYCH_O_PRZYCHODZIE');
    sprawdzSpojnosc(w);
  });
  it('brak danych o przychodzie: jedna uwaga BRAK_DANYCH_O_PRZYCHODZIE na parę osoba + tytuł', () => {
    const bezKwoty: Osoba = { id: 'tata', rola: 'ojciec', tytuly: [{ id: 'e', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1 }] };
    const w = obliczKwoty({ ...PRZYKLAD_RODZINA, osoby: [bezKwoty] }, plan([
      { id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' },
      { id: 'r', osobaId: 'tata', typ: 'rodzicielski', od: '2026-12-15', do: '2026-12-31' },
    ]), WERSJE_DOMYSLNE);
    expect(w.uwagi.filter((u) => u.kod === 'BRAK_DANYCH_O_PRZYCHODZIE')).toEqual([expect.objectContaining({ poziom: 'ostrzezenie', osobaId: 'tata' })]);
    expect(kody(w)).not.toContain('PODSTAWA_SZACOWANA');
  });
  it('uzupełniający i zasiłek w wysokości macierzyńskiego dają 100%; na warunkach macierzyńskiego przy wariancie 81,5% daje 81,5%', () => {
    const stawka = (typ: Odcinek['typ'], wariant815 = false) =>
      obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'x', osobaId: 'mama', typ, od: '2026-12-01', do: '2026-12-14' }], wariant815), WERSJE_DOMYSLNE).odcinki[0].stawkaProc;
    expect(stawka('uzupelniajacy')).toBe(100);
    expect(stawka('w_wys_macierzynskiego')).toBe(100);
    expect(stawka('na_warunkach_macierzynskiego', true)).toBe(81.5);
    expect(stawka('na_warunkach_macierzynskiego')).toBe(100);
  });
  it('kolejność podstaw przy dwóch osobach odpowiada kolejności pierwszego użycia w planie', () => {
    const w = obliczKwoty(zTata, plan([
      { id: 'a', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' },
      { id: 'b', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2026-12-31' },
      { id: 'c', osobaId: 'tata', typ: 'rodzicielski', od: '2027-01-01', do: '2027-01-31' },
    ]), WERSJE_DOMYSLNE);
    expect(w.podstawy.map((p) => p.osobaId)).toEqual(['tata', 'mama']);
  });
});

describe('obliczKwoty – stawki szczególne i kawałki o stałej stawce', () => {
  // tata: etat 6000 zł → podstawa 6000 × 86,29% = 5177,40; 70%: 5177,40 ÷ 30 × 70% = 120,81; 81,5%: 5177,40 ÷ 30 × 81,5% = 140,65
  const zRodzicielskimTaty = (odcinkiTaty: Odcinek[], wariant815 = true) => plan([...PRZYKLAD_PLAN.odcinki, ...odcinkiTaty], wariant815);

  it('EC-60: przy 81,5% 9 tygodni rodzicielskiego taty po 70% jego podstawy', () => {
    const w = obliczKwoty(zTata, zRodzicielskimTaty([{ id: 't1', osobaId: 'tata', typ: 'rodzicielski', od: '2027-11-30', do: '2028-01-31' }]), WERSJE_DOMYSLNE);
    const t = odcinek(w, 't1');
    expect(liczby(t)).toMatchObject({ podstawa: 5177.4, stawkaProc: 70, dziennie: 120.81, dni: 63, razem: 7611.03 });
    expect(t.sciezka.some((k) => k.przepis === 'UZ art. 31 ust. 3f')).toBe(true);
    // mama zostaje przy 81,5% za macierzyński i swoją część rodzicielskiego
    expect(w.odcinki.filter((o) => o.osobaId === 'mama').map((o) => [o.stawkaProc, o.dziennie])).toEqual([[81.5, 187.54], [81.5, 187.54]]);
    expect(kody(w)).not.toContain('ODCINEK_ZE_ZMIANA_STAWKI');
    sprawdzSpojnosc(w);
  });
  it('EC-60 dłużej: 70 dni = 63 × 120,81 + 7 × 140,65 = 7611,03 + 984,55 = 8595,58', () => {
    const w = obliczKwoty(zTata, zRodzicielskimTaty([{ id: 't1', osobaId: 'tata', typ: 'rodzicielski', od: '2027-11-30', do: '2028-02-07' }]), WERSJE_DOMYSLNE);
    const t = odcinek(w, 't1');
    // pierwszy kawałek określa stawkę, stawkę dzienną i kwotę miesięczną wpisu (30 × 120,81 = 3624,30)
    expect(liczby(t)).toMatchObject({ podstawa: 5177.4, stawkaProc: 70, dziennie: 120.81, dni: 70, razem: 8595.58, miesiecznie: 3624.3 });
    expect(t.rozbicieMiesieczne).toEqual([
      { miesiac: '2027-11', dni: 1, kwota: 120.81 },
      { miesiac: '2027-12', dni: 31, kwota: 3745.11 },
      { miesiac: '2028-01', dni: 31, kwota: 3745.11 },
      { miesiac: '2028-02', dni: 7, kwota: 984.55 },
    ]);
    expect(t.sciezka.filter((k) => k.opis.startsWith('Od ')).map((k) => [k.opis, k.wartosc])).toEqual([
      ['Od 2027-11-30 do 2028-01-31: 63 × 120,81 zł', 7611.03],
      ['Od 2028-02-01 do 2028-02-07: 7 × 140,65 zł', 984.55],
    ]);
    expect(w.uwagi.filter((u) => u.kod === 'ODCINEK_ZE_ZMIANA_STAWKI')).toEqual([expect.objectContaining({ poziom: 'info', odcinekId: 't1', osobaId: 'tata' })]);
    sprawdzSpojnosc(w);
  });
  it('EC-60: 9 tygodni liczone chronologicznie po wszystkich odcinkach rodzicielskiego taty, niezależnie od kolejności w planie', () => {
    const w = obliczKwoty(zTata, zRodzicielskimTaty([
      { id: 't2', osobaId: 'tata', typ: 'rodzicielski', od: '2028-03-01', do: '2028-04-04' },
      { id: 't1', osobaId: 'tata', typ: 'rodzicielski', od: '2027-11-30', do: '2028-01-03' },
    ]), WERSJE_DOMYSLNE);
    // t1: 35 × 120,81 = 4228,35; t2: 28 × 120,81 + 7 × 140,65 = 3382,68 + 984,55 = 4367,23
    expect([odcinek(w, 't1').razem, odcinek(w, 't2').razem]).toEqual([4228.35, 4367.23]);
    expect(kody(w, 't1')).toEqual([]);
    expect(kody(w, 't2')).toEqual(['ODCINEK_ZE_ZMIANA_STAWKI']);
    sprawdzSpojnosc(w);
  });
  it('bez wariantu 81,5% cały rodzicielski taty po 70%, bez podziału: 70 × 120,81 = 8456,70', () => {
    const w = obliczKwoty(zTata, zRodzicielskimTaty([{ id: 't1', osobaId: 'tata', typ: 'rodzicielski', od: '2027-11-30', do: '2028-02-07' }], false), WERSJE_DOMYSLNE);
    expect(liczby(odcinek(w, 't1'))).toMatchObject({ stawkaProc: 70, dziennie: 120.81, razem: 8456.7 });
    expect(kody(w)).not.toContain('ODCINEK_ZE_ZMIANA_STAWKI');
    sprawdzSpojnosc(w);
  });

  const przejecie = (wariant815: boolean) => plan([
    { id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08' },
    { id: 'tm', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' },
  ], wariant815);
  it('EC-70: tata przejmuje 6 tygodni macierzyńskiego przy 81,5% – stawka z planu, podstawa taty; do potwierdzenia w ZUS', () => {
    const w = obliczKwoty(zTata, przejecie(true), WERSJE_DOMYSLNE);
    expect(liczby(odcinek(w, 'tm'))).toMatchObject({ osobaId: 'tata', stawkaProc: 81.5, podstawa: 5177.4, dziennie: 140.65, dni: 42, razem: 5907.3 });
    expect(kody(w, 'tm')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    expect(kody(w, 'm')).toEqual([]);
    sprawdzSpojnosc(w);
  });
  it('EC-70 przy wariancie 100% i 70%: 100%, 172,58 zł dziennie', () => {
    const w = obliczKwoty(zTata, przejecie(false), WERSJE_DOMYSLNE);
    expect(liczby(odcinek(w, 'tm'))).toMatchObject({ stawkaProc: 100, dziennie: 172.58, razem: 7248.36 });
    expect(kody(w, 'tm')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    sprawdzSpojnosc(w);
  });

  const wersja2027: Parametry = { ...structuredClone(PARAMETRY_2026), obowiazujeOd: '2027-01-01', kwoty: { ...PARAMETRY_2026.kwoty, placaMinimalna: 5000 } };
  it('EC-97: macierzyński przez 1.01.2027 – od stycznia podstawa rośnie do nowego minimum z art. 45', () => {
    const osoba: Osoba = {
      id: 'mama', rola: 'matka',
      tytuly: [{ id: 'e', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 4000 }],
    };
    const w = obliczKwoty({ ...PRZYKLAD_RODZINA, osoby: [osoba] }, plan([{ id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' }]), [PARAMETRY_2026, wersja2027]);
    const m = odcinek(w, 'm');
    // grudzień: 4147,10 ÷ 30 = 138,24; 31 × 138,24 = 4285,44. Od stycznia: 5000 × 86,29% = 4314,50; ÷ 30 = 143,82; 109 × 143,82 = 15 676,38
    expect(liczby(m)).toMatchObject({ podstawa: 4147.1, stawkaProc: 100, dziennie: 138.24, dni: 140, razem: 19961.82, miesiecznie: 4147.2 });
    expect(m.rozbicieMiesieczne).toEqual([
      { miesiac: '2026-12', dni: 31, kwota: 4285.44 },
      { miesiac: '2027-01', dni: 31, kwota: 4458.42 },
      { miesiac: '2027-02', dni: 28, kwota: 4026.96 },
      { miesiac: '2027-03', dni: 31, kwota: 4458.42 },
      { miesiac: '2027-04', dni: 19, kwota: 2732.58 },
    ]);
    expect(m.sciezka.filter((k) => k.opis.startsWith('Od ')).map((k) => [k.opis, k.wartosc])).toEqual([
      ['Od 2026-12-01 do 2026-12-31: 31 × 138,24 zł', 4285.44],
      ['Od 2027-01-01 do 2027-04-19: 109 × 143,82 zł', 15676.38],
    ]);
    expect(m.sciezka.some((k) => k.przepis === 'UZ art. 45 ust. 1' && k.wartosc === 4314.5)).toBe(true);
    expect(kody(w, 'm')).toEqual(['ODCINEK_ZE_ZMIANA_STAWKI', 'DO_POTWIERDZENIA_W_ZUS']);
    expect(w.podstawy.map((p) => p.kwota)).toEqual([4147.1]);
    sprawdzSpojnosc(w);
  });
  it('EC-97 przy łańcuchu zasiłków (art. 43): podstawa z 2026 r. (zwolnienie od listopada), dni w 2027 r. od minimum z 2027 r.', () => {
    const osoba: Osoba = {
      id: 'mama', rola: 'matka',
      tytuly: [{ id: 'e', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 3000 }],
      zdrowie: { eZLA: [{ od: '2026-11-02', do: '2027-01-10', kodB: true }] },
    };
    const w = obliczKwoty({ ...PRZYKLAD_RODZINA, osoby: [osoba] }, plan([{ id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-11', do: '2027-05-30' }]), WERSJE_DOMYSLNE);
    // podstawa z początku łańcucha (2.11.2026): 3000 × 86,29% = 2588,70 < minimum 2026 4806 × 86,29% = 4147,10
    expect(w.podstawy.map((p) => [p.kwota, p.metoda])).toEqual([[4147.1, 'podstawa_poprzedniego_zasilku']]);
    // cały odcinek w 2027 r.: minimum 4950 × 86,29% = 4271,36; ÷ 30 = 142,38; 140 dni × 142,38 = 19 933,20 (bez poprawki: 138,24 i 19 353,60)
    expect(liczby(odcinek(w, 'm'))).toMatchObject({ podstawa: 4271.36, dziennie: 142.38, dni: 140, razem: 19933.2 });
    expect(kody(w, 'm')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    sprawdzSpojnosc(w);
  });
  it('EC-97: minimum z art. 45 nie dotyczy zlecenia – bez podziału i bez uwag przy odcinku', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1200)]), plan([{ id: 'm', osobaId: 'z', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' }]), [PARAMETRY_2026, wersja2027]);
    // 140 × 34,52 = 4832,80
    expect(liczby(odcinek(w, 'm'))).toMatchObject({ podstawa: 1035.48, dziennie: 34.52, razem: 4832.8 });
    expect(odcinek(w, 'm').sciezka.some((k) => k.opis.startsWith('Od '))).toBe(false);
    expect(kody(w, 'm')).toEqual([]);
    sprawdzSpojnosc(w);
  });
  it('wersja parametrów bez zmiany liczb nie dzieli odcinka (wzorzec przez 1.01.2027 w wersjach domyślnych)', () => {
    expect(WERSJE_DOMYSLNE.map((p) => p.obowiazujeOd)).toContain('2027-01-01');
    const w = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    expect(w.odcinki[0].sciezka.some((k) => k.opis.startsWith('Od '))).toBe(false);
    expect(kody(w)).toEqual(['SZACUNEK_BEZ_ULG']);
  });
});

describe('obliczKwoty – podwyższenie do kwoty świadczenia rodzicielskiego', () => {
  const krokPodwyzszenia = (o: KwotaOdcinka) => o.sciezka.filter((k) => k.przepis === PRZEPIS_PODWYZSZENIA);

  it('EC-90: zlecenie 1200 zł, rodzicielski 70% za cały czerwiec 2027 – podwyższenie 362,20 zł', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1200)]), plan([{ id: 'r', osobaId: 'z', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30' }]), WERSJE_DOMYSLNE);
    const r = odcinek(w, 'r');
    // 1200 × 86,29% = 1035,48; ÷ 30 × 70% = 24,16; 30 × 24,16 = 724,80; zaliczka 725 × 12% = 87; po zaliczce 637,80; 1000 − 637,80 = 362,20
    expect(liczby(r)).toMatchObject({ podstawa: 1035.48, stawkaProc: 70, dziennie: 24.16, dni: 30, razem: 724.8 });
    expect([r.zaliczkaPodatku, r.podwyzszenie, r.naReke]).toEqual([87, 362.2, 1000]);
    expect(krokPodwyzszenia(r).map((k) => k.wartosc)).toEqual([362.2]);
    // decyzja zespołu: bez wariantu „brutto” w ścieżce
    expect(r.sciezka.some((k) => k.opis.startsWith('Wariant bez odejmowania zaliczki'))).toBe(false);
    expect(w.uwagi.filter((u) => u.kod === 'PODWYZSZENIE_DO_SWIADCZENIA_RODZICIELSKIEGO')).toEqual([expect.objectContaining({ poziom: 'info', osobaId: 'z' })]);
    expect(kody(w)).not.toContain('DO_POTWIERDZENIA_W_ZUS');
    expect(w.sumaOsoby).toEqual({ z: 1087 });
    expect([w.sumaRazem, w.naRekeRazem]).toEqual([1087, 1000]);
    sprawdzSpojnosc(w);
  });
  it('EC-90 uzupełniający: 30 × 34,52 = 1035,60; zaliczka 124; po zaliczce 911,60; podwyższenie 88,40; do potwierdzenia w ZUS', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1200)]), plan([{ id: 'u', osobaId: 'z', typ: 'uzupelniajacy', od: '2027-06-01', do: '2027-06-30' }]), WERSJE_DOMYSLNE);
    const u = odcinek(w, 'u');
    expect(liczby(u)).toMatchObject({ stawkaProc: 100, dziennie: 34.52, razem: 1035.6 });
    expect([u.zaliczkaPodatku, u.podwyzszenie]).toEqual([124, 88.4]);
    expect(kody(w)).toContain('PODWYZSZENIE_DO_SWIADCZENIA_RODZICIELSKIEGO');
    expect(kody(w, 'u')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    sprawdzSpojnosc(w);
  });
  it('EC-90 część miesiąca: 15 dni czerwca – próg 500,00; 362,40 − 43 = 319,40; podwyższenie 180,60', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1200)]), plan([{ id: 'r', osobaId: 'z', typ: 'rodzicielski', od: '2027-06-16', do: '2027-06-30' }]), WERSJE_DOMYSLNE);
    const r = odcinek(w, 'r');
    expect([r.razem, r.zaliczkaPodatku, r.podwyzszenie, r.naReke]).toEqual([362.4, 43, 180.6, 500]);
    // krok z kwotą odniesienia za część miesiąca: 1000 ÷ 30 = 33,33; × 15 = 499,95 → 500,00
    expect(r.sciezka.filter((k) => k.przepis === 'UZ art. 31 ust. 3c').map((k) => k.wartosc)).toEqual([500]);
    sprawdzSpojnosc(w);
  });
  it('EC-90b: zlecenie 1200 zł, urlop ojcowski – bez podwyższenia', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1200)], 'ojciec'), plan([{ id: 'o', osobaId: 'z', typ: 'ojcowski', od: '2027-06-01', do: '2027-06-14' }]), WERSJE_DOMYSLNE);
    const o = odcinek(w, 'o');
    expect(o.razem).toBe(483.28);
    expect(o.podwyzszenie).toBeUndefined();
    expect(krokPodwyzszenia(o)).toEqual([]);
    expect(kody(w)).not.toContain('PODWYZSZENIE_DO_SWIADCZENIA_RODZICIELSKIEGO');
    sprawdzSpojnosc(w);
  });
  it('ojcowski i rodzicielski w tym samym miesiącu: ojcowski nie wchodzi ani do porównania, ani do podwyższenia', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1200)], 'ojciec'), plan([
      { id: 'o', osobaId: 'z', typ: 'ojcowski', od: '2027-06-01', do: '2027-06-14' },
      { id: 'r', osobaId: 'z', typ: 'rodzicielski', od: '2027-06-15', do: '2027-06-30' },
    ]), WERSJE_DOMYSLNE);
    // ojcowski 14 × 34,52 = 483,28; rodzicielski 16 × 24,16 = 386,56; zaliczka za czerwiec od 869,84 → 870 × 12% = 104,40 → 104,
    // rozdzielona: ojcowski ⌊10400 × 48328 ÷ 86984⌋ gr = 57,78, rodzicielski reszta 46,22; po zaliczce 386,56 − 46,22 = 340,34;
    // próg za 16 dni: 33,33 × 16 = 533,28 → 533,30; podwyższenie 533,30 − 340,34 = 192,96
    expect([odcinek(w, 'o').zaliczkaPodatku, odcinek(w, 'r').zaliczkaPodatku]).toEqual([57.78, 46.22]);
    expect(odcinek(w, 'o').podwyzszenie).toBeUndefined();
    expect(odcinek(w, 'r').podwyzszenie).toBe(192.96);
    sprawdzSpojnosc(w);
  });
  it('EC-18: dwa zlecenia jednej osoby – jedno podwyższenie od łącznej kwoty po zaliczce, rozdzielone na oba odcinki', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('A', 400), zlecenie('B', 600)]), plan([
      { id: 'a', osobaId: 'z', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30', tytulId: 'A' },
      { id: 'b', osobaId: 'z', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30', tytulId: 'B' },
    ]), WERSJE_DOMYSLNE);
    const a = odcinek(w, 'a');
    const b = odcinek(w, 'b');
    // A: 400 × 86,29% = 345,16; ÷ 30 × 70% = 8,05; 30 × 8,05 = 241,50; zaliczka 242 × 12% = 29,04 → 29; po zaliczce 212,50
    expect([a.podstawa, a.dziennie, a.razem, a.zaliczkaPodatku]).toEqual([345.16, 8.05, 241.5, 29]);
    // B: 600 × 86,29% = 517,74; ÷ 30 × 70% = 12,08; 30 × 12,08 = 362,40; zaliczka 362 × 12% = 43,44 → 43; po zaliczce 319,40
    expect([b.podstawa, b.dziennie, b.razem, b.zaliczkaPodatku]).toEqual([517.74, 12.08, 362.4, 43]);
    // łącznie po zaliczce 212,50 + 319,40 = 531,90; jedno podwyższenie 1000 − 531,90 = 468,10,
    // rozdzielone jak zaliczka (proporcjonalnie do kwot): A ⌊46810 × 24150 ÷ 60390⌋ gr = 187,19; B reszta 280,91
    expect(suma([a.podwyzszenie ?? 0, b.podwyzszenie ?? 0])).toBe(468.1);
    expect([a.podwyzszenie, b.podwyzszenie]).toEqual([187.19, 280.91]);
    expect(w.uwagi.filter((u) => u.kod === 'PODWYZSZENIE_DO_SWIADCZENIA_RODZICIELSKIEGO')).toHaveLength(1);
    expect(w.naRekeRazem).toBe(1000);
    sprawdzSpojnosc(w);
  });
  it('przykład ZUS nr 3: podstawa 1020 zł, macierzyński od 4 do 31 stycznia 2027 – podwyższenie 65,30 zł', () => {
    // 1182,06 × 86,29% = 1020,00
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1182.06)]), plan([{ id: 'm', osobaId: 'z', typ: 'macierzynski', od: '2027-01-04', do: '2027-01-31' }]), WERSJE_DOMYSLNE);
    const m = odcinek(w, 'm');
    // 28 × 34,00 = 952,00; zaliczka 952 × 12% = 114,24 → 114; po zaliczce 838,00; 1000 ÷ 31 = 32,26; × 28 = 903,28 → 903,30; 903,30 − 838,00 = 65,30
    expect([m.podstawa, m.dziennie, m.razem, m.zaliczkaPodatku, m.podwyzszenie, m.naReke]).toEqual([1020, 34, 952, 114, 65.3, 903.3]);
    sprawdzSpojnosc(w);
  });
  const etat = (wymiarEtatu: number, wynagrodzenieMiesieczne: number): Rodzina => ({
    ...PRZYKLAD_RODZINA,
    osoby: [{ id: 'e', rola: 'matka', tytuly: [{ id: 't', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu, wynagrodzenieMiesieczne }] }],
  });
  it('łączenie z pracą (ust. 4a): porównanie z kwotą sprzed pomniejszenia – tu bez podwyższenia, do potwierdzenia w ZUS', () => {
    const w = obliczKwoty(etat(0.5, 2500), plan([{ id: 'r', osobaId: 'e', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30', wymiarPracy: 0.8 }]), WERSJE_DOMYSLNE);
    const r = odcinek(w, 'r');
    // 2500 × 86,29% = 2157,25 (> minimum 2027 przy pół etatu: 2475 × 86,29% = 2135,68); ÷ 30 × 70% = 50,34; × 20% = 10,07; 30 × 10,07 = 302,10;
    // zaliczka 302 × 12% = 36,24 → 36. Do porównania kwota bez pomniejszenia: 30 × 50,34 = 1510,20, zaliczka od niej 1510 × 12% = 181,20 → 181,
    // po zaliczce 1329,20 ≥ 1000 → bez podwyższenia (od kwoty pomniejszonej byłoby 1000 − 266,10 = 733,90)
    expect([r.dziennie, r.razem, r.zaliczkaPodatku, r.podwyzszenie, r.naReke]).toEqual([10.07, 302.1, 36, undefined, 266.1]);
    expect(kody(w, 'r')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    expect(kody(w)).not.toContain('PODWYZSZENIE_DO_SWIADCZENIA_RODZICIELSKIEGO');
    sprawdzSpojnosc(w);
  });
  it('łączenie z pracą (ust. 4a): podwyższenie od kwoty sprzed pomniejszenia, gdy i ona jest poniżej progu', () => {
    const w = obliczKwoty(etat(0.25, 1237.5), plan([{ id: 'r', osobaId: 'e', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30', wymiarPracy: 0.5 }]), WERSJE_DOMYSLNE);
    const r = odcinek(w, 'r');
    // 1237,50 × 86,29% = 1067,84; ÷ 30 × 70% = 24,92; × 50% = 12,46; 30 × 12,46 = 373,80; zaliczka 374 × 12% = 44,88 → 45.
    // Do porównania: 30 × 24,92 = 747,60; zaliczka od niej 748 × 12% = 89,76 → 90; po zaliczce 657,60; podwyższenie 1000 − 657,60 = 342,40
    expect([r.dziennie, r.razem, r.zaliczkaPodatku, r.podwyzszenie, r.naReke]).toEqual([12.46, 373.8, 45, 342.4, 671.2]);
    expect(kody(w, 'r')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    expect(kody(w)).toContain('PODWYZSZENIE_DO_SWIADCZENIA_RODZICIELSKIEGO');
    expect(krokPodwyzszenia(r).map((k) => k.wartosc)).toEqual([342.4]);
    // krok z kwotą do porównania: 747,60 − 90 = 657,60
    expect(r.sciezka.filter((k) => k.przepis === 'UZ art. 31 ust. 3a i 4a').map((k) => k.wartosc)).toEqual([657.6]);
    sprawdzSpojnosc(w);
  });
  it('łączenie z pracą (ust. 4a): uwaga także wtedy, gdy podwyższenie wychodzi tylko od kwoty sprzed pomniejszenia (skok zaliczki o 1 zł)', () => {
    const w = obliczKwoty(naZleceniach([zlecenie('zl', 1882)]), plan([{ id: 'r', osobaId: 'z', typ: 'rodzicielski', od: '2027-06-10', do: '2027-06-30', wymiarPracy: 0.0003 }]), WERSJE_DOMYSLNE);
    const r = odcinek(w, 'r');
    // 1882 × 86,29% = 1623,98; ÷ 30 × 70% = 37,89; × 99,97% = 37,88; 21 × 37,88 = 795,48; zaliczka 795 × 12% = 95,40 → 95; po zaliczce 700,48.
    // Próg za 21 dni: 33,33 × 21 = 699,93 → 700,00. Od kwoty wypłacanej: bez podwyższenia.
    // Do porównania: 21 × 37,89 = 795,69; zaliczka 796 × 12% = 95,52 → 96; po zaliczce 699,69; podwyższenie 700,00 − 699,69 = 0,31
    expect([r.dziennie, r.razem, r.zaliczkaPodatku, r.podwyzszenie]).toEqual([37.88, 795.48, 95, 0.31]);
    expect(r.sciezka.filter((k) => k.przepis === 'UZ art. 31 ust. 3a i 4a').map((k) => k.wartosc)).toEqual([699.69]);
    expect(kody(w, 'r')).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    sprawdzSpojnosc(w);
  });
  it('łączenie z pracą przy wysokim zasiłku: bez podwyższenia w żadnym wariancie, więc bez uwagi', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, plan([{ id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30', wymiarPracy: 0.5 }]), WERSJE_DOMYSLNE);
    expect(odcinek(w, 'r1').podwyzszenie).toBeUndefined();
    expect(kody(w)).toEqual(['SZACUNEK_BEZ_ULG']);
  });
  it('wzorzec: zasiłki powyżej progu – bez podwyższenia i bez kroków podwyższenia', () => {
    const w = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    expect(w.odcinki.map((o) => o.podwyzszenie)).toEqual([undefined, undefined]);
    expect(w.odcinki.flatMap(krokPodwyzszenia)).toEqual([]);
  });
});
