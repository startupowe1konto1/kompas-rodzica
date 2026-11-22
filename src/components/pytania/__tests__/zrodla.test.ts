import { describe, expect, it } from 'vitest';
import type { PochodzenieDanej, ZrodloId } from '../../../engine/types';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { PERSONY } from '../../../mocks/persony';
import { PYTANIA } from '../definicje';
import { widocznePytania } from '../silnik-ankiety';
import { ETYKIETY_ZRODEL, brakujaceDane, daneZeZrodel, znacznikDlaPytania, znacznikiZrodel } from '../zrodla';

const anna = PERSONY.find((p) => p.id === 'anna-etat')!;

function pytanie(id: string, rodzina = anna.rodzina) {
  const p = widocznePytania(PYTANIA, rodzina).find((x) => x.def.id === id);
  if (!p) throw new Error(`Pytanie ${id} niewidoczne`);
  return p;
}

describe('etykiety źródeł', () => {
  it('każde ZrodloId z kontraktu ma etykietę', () => {
    const wszystkie: ZrodloId[] = ['mobywatel', 'login_gov', 'ezus', 'eurzad_skarbowy', 'ceidg', 'ikp', 'rsc', 'empatia', 'pracodawca', 'lekarz_szpital', 'sad', 'formularz_pdf', 'uzytkownik'];
    for (const z of wszystkie) expect(ETYKIETY_ZRODEL[z].length).toBeGreaterThan(2);
    expect(ETYKIETY_ZRODEL.ezus).toBe('z eZUS');
    expect(ETYKIETY_ZRODEL.mobywatel).toBe('z mObywatela');
    expect(ETYKIETY_ZRODEL.formularz_pdf).toBe('z wgranego wniosku');
  });
});

// Własne dane wejściowe (format „cały tytuł z eZUS”), żeby testy logiki nie zależały od person toru D.
const POCHODZENIE_TYTUL: PochodzenieDanej[] = [
  { sciezka: 'osoby[0].dane.imie', zrodlo: 'mobywatel' },
  { sciezka: 'osoby[0].dane.nazwisko', zrodlo: 'mobywatel' },
  { sciezka: 'osoby[0].dane.dataUrodzenia', zrodlo: 'mobywatel' },
  { sciezka: 'osoby[0].tytuly[0]', zrodlo: 'ezus' },
  { sciezka: 'zdarzenie.data', zrodlo: 'uzytkownik' },
];

describe('znacznikiZrodel – cały tytuł z eZUS', () => {
  const znaczniki = znacznikiZrodel(POCHODZENIE_TYTUL);

  it('mapuje ścieżki z pochodzenia na znaczniki', () => {
    expect(znaczniki['osoby[0].dane.imie']).toEqual({ zrodlo: 'mobywatel', etykieta: 'z mObywatela', symulacja: true });
    expect(znaczniki['osoby[0].tytuly[0]']).toMatchObject({ zrodlo: 'ezus', etykieta: 'z eZUS', symulacja: true });
    expect(znaczniki['zdarzenie.data']).toMatchObject({ zrodlo: 'uzytkownik', symulacja: false });
  });

  it('pole tytułu dziedziczy znacznik eZUS, gdy eZUS naprawdę ma tę daną', () => {
    expect(znacznikDlaPytania(znaczniki, pytanie('tytul_od'))?.zrodlo).toBe('ezus');
    expect(znacznikDlaPytania(znaczniki, pytanie('tytuly_rodzaje'))?.zrodlo).toBe('ezus');
  });

  it('nie przypina znacznika eZUS do danych, których eZUS nie ma (wymiar etatu, liczba ubezpieczonych)', () => {
    expect(znacznikDlaPytania(znaczniki, pytanie('etat_wymiar'))).toBeUndefined();
    expect(znacznikDlaPytania(znaczniki, pytanie('platnik_powyzej_20'))).toBeUndefined();
  });

  it('dane z wgranego wniosku mają znacznik „z wgranego wniosku”', () => {
    const pdf: PochodzenieDanej[] = [{ sciezka: 'zdarzenie.data', zrodlo: 'formularz_pdf' }];
    const z = znacznikiZrodel(pdf);
    expect(znacznikDlaPytania(z, pytanie('data_porodu_przewidywana', PRZYKLAD_RODZINA))).toMatchObject({
      zrodlo: 'formularz_pdf',
      etykieta: 'z wgranego wniosku',
      symulacja: false,
    });
  });
});

describe('brakujaceDane – ekran „Pobieramy Twoje dane”', () => {
  const braki = brakujaceDane(PYTANIA, anna.rodzina, POCHODZENIE_TYTUL);
  const id = braki.map((b) => b.pytanieId);

  it('wymienia to, czego żadna usługa nie ma', () => {
    expect(id).toEqual(expect.arrayContaining(['data_porodu_przewidywana', 'platnik_powyzej_20', 'etat_wymiar']));
    const termin = braki.find((b) => b.pytanieId === 'data_porodu_przewidywana')!;
    expect(termin.powod).toBe('zadna_usluga_nie_ma');
    expect(termin.skadWziac).toMatch(/lekarz/);
  });

  it('przy wyborach (rola, etap) nie podsuwa dokumentu z innej sytuacji', () => {
    expect(braki.find((b) => b.pytanieId === 'etap')?.skadWziac).toBeUndefined();
  });

  it('nie wymienia danych, które przyszły z eZUS', () => {
    expect(id).not.toContain('tytul_od');
    expect(id).not.toContain('tytuly_rodzaje');
  });

  it('nie wymienia pytań ukrytych', () => {
    expect(id).not.toContain('dzialalnosc_podstawa');
    expect(id).not.toContain('data_uprawomocnienia');
  });
});

describe('daneZeZrodel', () => {
  it('grupuje to, co przyszło z każdej usługi', () => {
    const grupy = daneZeZrodel(PYTANIA, anna.rodzina, POCHODZENIE_TYTUL);
    const mob = grupy.find((g) => g.zrodlo === 'mobywatel')!;
    expect(mob.etykieta).toBe('z mObywatela');
    expect(mob.pozycje.map((p) => p.etykieta)).toEqual(['Imię', 'Nazwisko', 'Data urodzenia']);
    const ezus = grupy.find((g) => g.zrodlo === 'ezus')!;
    expect(ezus.pozycje).toHaveLength(1);
    expect(ezus.pozycje[0].etykieta).toContain('Umowa o pracę');
    expect(grupy.some((g) => g.zrodlo === 'uzytkownik')).toBe(false);
  });
});

// Zgodność z personami toru D: pochodzenie zapisane pole po polu, a dane od rodzica oznaczone `uzytkownik`.
describe('persona anna-etat z toru D (pochodzenie pole po polu)', () => {
  const znaczniki = znacznikiZrodel(anna.pochodzenie);

  it('pola, które eZUS naprawdę ma, dostają znacznik eZUS', () => {
    expect(znacznikDlaPytania(znaczniki, pytanie('tytul_od'))?.zrodlo).toBe('ezus');
    expect(znacznikDlaPytania(znaczniki, pytanie('tytuly_rodzaje'))?.zrodlo).toBe('ezus');
  });

  it('wymiar etatu i liczba ubezpieczonych nie dostają znacznika eZUS', () => {
    expect(znacznikDlaPytania(znaczniki, pytanie('etat_wymiar'))?.zrodlo).not.toBe('ezus');
    expect(znacznikDlaPytania(znaczniki, pytanie('platnik_powyzej_20'))?.zrodlo).not.toBe('ezus');
  });

  it('ekran „Pobieramy Twoje dane” pokazuje dane z mObywatela i eZUS', () => {
    const grupy = daneZeZrodel(PYTANIA, anna.rodzina, anna.pochodzenie);
    const mob = grupy.find((g) => g.zrodlo === 'mobywatel')!;
    expect(mob.pozycje.map((p) => p.etykieta)).toEqual(expect.arrayContaining(['Imię', 'Nazwisko', 'Data urodzenia']));
    expect(grupy.find((g) => g.zrodlo === 'ezus')?.pozycje.length).toBeGreaterThan(0);
  });
});
