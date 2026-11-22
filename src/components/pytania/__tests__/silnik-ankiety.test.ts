import { describe, expect, it } from 'vitest';
import type { Rodzina } from '../../../engine/types';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { KROKI_ANKIETY, PYTANIA } from '../definicje';
import { kolejkaEkranow } from '../kolejka';
import {
  czyWypelnione,
  dodajTytul,
  odczytajOdpowiedz,
  odczytajWartosc,
  usunTytul,
  walidujAnkiete,
  walidujOdpowiedz,
  widocznePytania,
  zapiszOdpowiedz,
  zapiszWartosc,
} from '../silnik-ankiety';
import type { DefinicjaPytania } from '../typy';

function def(id: string): DefinicjaPytania {
  const d = PYTANIA.find((p) => p.id === id);
  if (!d) throw new Error(`Brak pytania ${id}`);
  return d;
}

function kopia(r: Rodzina): Rodzina {
  return structuredClone(r);
}

function ids(rodzina: Rodzina, opcje?: { osoba?: number }): string[] {
  return widocznePytania(PYTANIA, rodzina, opcje).map((p) => p.def.id);
}

const KONTEKST = { dataAnalizy: '2026-11-21' };

describe('odczytajWartosc', () => {
  it('czyta zagnieżdżone pola i elementy list', () => {
    expect(odczytajWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].wynagrodzenieMiesieczne')).toBe(8000);
    expect(odczytajWartosc(PRZYKLAD_RODZINA, 'zdarzenie.data')).toBe('2026-12-01');
  });

  it('zwraca undefined dla brakującej ścieżki zamiast rzucać wyjątek', () => {
    expect(odczytajWartosc(PRZYKLAD_RODZINA, 'osoby[3].rola')).toBeUndefined();
    expect(odczytajWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].ustanie.data')).toBeUndefined();
  });
});

describe('zapiszWartosc – bez mutacji', () => {
  it('nie zmienia oryginału, a nowe dane mają nową wartość', () => {
    const przed = kopia(PRZYKLAD_RODZINA);
    const po = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].wymiarEtatu', 0.5);
    expect(PRZYKLAD_RODZINA).toEqual(przed);
    expect(po.osoby[0].tytuly[0].wymiarEtatu).toBe(0.5);
    expect(po).not.toBe(PRZYKLAD_RODZINA);
    expect(po.osoby[0].tytuly[0]).not.toBe(PRZYKLAD_RODZINA.osoby[0].tytuly[0]);
  });

  it('współdzieli gałęzie, których nie dotyka', () => {
    const po = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].wymiarEtatu', 0.5);
    expect(po.zdarzenie).toBe(PRZYKLAD_RODZINA.zdarzenie);
    expect(po.osoby[0].dane).toBe(PRZYKLAD_RODZINA.osoby[0].dane);
  });

  it('tworzy brakujące obiekty i listy po drodze', () => {
    const po = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].zdrowie.eZLA', []);
    expect(po.osoby[0].zdrowie?.eZLA).toEqual([]);
    const po2 = zapiszWartosc(PRZYKLAD_RODZINA, 'zdarzenie.dzieci[0].szpital[0].od', '2026-12-01');
    expect(po2.zdarzenie.dzieci[0].szpital).toEqual([{ od: '2026-12-01' }]);
  });

  it('undefined usuwa pole', () => {
    const po = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].platnikPowyzej20', undefined);
    expect('platnikPowyzej20' in po.osoby[0].tytuly[0]).toBe(false);
    expect(PRZYKLAD_RODZINA.osoby[0].tytuly[0].platnikPowyzej20).toBe(true);
  });
});

describe('widocznePytania – pytania warunkowe', () => {
  it('mama na etacie: pytania o etat i o wielkość pracodawcy, bez pytań o firmę i sąd', () => {
    const lista = ids(PRZYKLAD_RODZINA);
    expect(lista).toEqual(expect.arrayContaining(['rola', 'etap', 'data_porodu_przewidywana', 'tytuly_rodzaje', 'etat_wymiar', 'platnik_powyzej_20', 'wynagrodzenie_miesieczne', 'zwolnienia_w_ciazy', 'pit2']));
    expect(lista).not.toContain('dzialalnosc_podstawa');
    expect(lista).not.toContain('zadluzenie_skladkowe');
    expect(lista).not.toContain('data_uprawomocnienia');
    expect(lista).not.toContain('data_porodu');
    expect(lista).not.toContain('podstawa_miesiace');
  });

  it('pytania o działalność pojawiają się dopiero przy tytule „działalność”, i to dla tego tytułu', () => {
    let r = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, ['umowa_o_prace', 'dzialalnosc']);
    // Zarobki z firmy dopiero po odpowiedzi, że jest dobrowolne chorobowe (UZ art. 29 ust. 1).
    r = zapiszOdpowiedz(def('chorobowe_dobrowolne'), r, { osoba: 0, tytul: 1 }, true);
    const widoczne = widocznePytania(PYTANIA, r);
    const firma = widoczne.filter((p) => p.def.id === 'dzialalnosc_podstawa');
    expect(firma).toHaveLength(1);
    expect(firma[0].sciezka).toBe('osoby[0].tytuly[1].zadeklarowanaPodstawa');
    expect(widoczne.some((p) => p.def.id === 'zadluzenie_skladkowe')).toBe(true);
    // pytanie o 20 osób tylko przy etacie, nie przy własnej firmie
    expect(widoczne.filter((p) => p.def.id === 'platnik_powyzej_20').map((p) => p.zakres.tytul)).toEqual([0]);
  });

  it('pytanie o sąd tylko przy przysposobieniu', () => {
    const adopcja = zapiszOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {}, 'przyjecie');
    expect(adopcja.zdarzenie.typ).toBe('przysposobienie');
    expect(ids(adopcja)).toContain('data_uprawomocnienia');
    expect(ids(adopcja)).toContain('data_przyjecia');
    expect(ids(adopcja)).not.toContain('data_porodu_przewidywana');
    expect(ids(adopcja)).not.toContain('zwolnienia_w_ciazy');

    const zastepcza = zapiszOdpowiedz(def('typ_przyjecia'), adopcja, {}, 'rodzina_zastepcza_niezawodowa');
    expect(ids(zastepcza)).not.toContain('data_uprawomocnienia');
  });

  it('dziecko już urodzone: pytamy o datę porodu i cechy dziecka', () => {
    const r = zapiszOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {}, 'urodzone');
    expect(r.zdarzenie.przewidywana).toBe(false);
    const lista = ids(r);
    expect(lista).toContain('data_porodu');
    expect(lista).toContain('dziecko_tydzien_ciazy');
    expect(lista).not.toContain('data_porodu_przewidywana');
  });

  it('tryb szczegółowy podstawy pokazuje listę miesięcy zamiast jednej kwoty', () => {
    const r = zapiszOdpowiedz(def('tryb_podstawy'), PRZYKLAD_RODZINA, { osoba: 0, tytul: 0 }, 'miesiace');
    expect(r.osoby[0].tytuly[0].podstawaSkladek).toEqual([]);
    expect(ids(r)).toContain('podstawa_miesiace');
    expect(ids(r)).not.toContain('wynagrodzenie_miesieczne');
  });

  it('nowa umowa bez kwoty: wybór „Jedna kwota” zostaje zapamiętany (telefon: kwota jest na następnym ekranie)', () => {
    const bezKwoty = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0]', { id: 't-nowy', rodzaj: 'umowa_o_prace' });
    const r = zapiszOdpowiedz(def('tryb_podstawy'), bezKwoty, { osoba: 0, tytul: 0 }, 'kwota');
    expect(odczytajOdpowiedz(def('tryb_podstawy'), r, { osoba: 0, tytul: 0 })).toBe('kwota');
    expect(ids(r)).toContain('wynagrodzenie_miesieczne');
  });

  it('pominPytania: nowa osoba nie dostaje znowu pytania o rolę', () => {
    const lista = widocznePytania(PYTANIA, PRZYKLAD_RODZINA, { osoba: 0, tylkoOsoba: true, pominPytania: ['rola'] }).map((p) => p.def.id);
    expect(lista).not.toContain('rola');
    expect(widocznePytania(PYTANIA, PRZYKLAD_RODZINA, { osoba: 0, tylkoOsoba: true }).map((p) => p.def.id)).toContain('rola');
  });

  it('ojciec nie dostaje pytania o zwolnienia w ciąży', () => {
    const r = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].rola', 'ojciec');
    expect(ids(r)).not.toContain('zwolnienia_w_ciazy');
  });

  it('pytanie o datę końca umowy na etacie dopiero przy umowie na czas określony', () => {
    expect(ids(PRZYKLAD_RODZINA)).not.toContain('etat_do');
    const r = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].naCzasOkreslony', true);
    expect(ids(r)).toContain('etat_do');
  });

  it('przy zleceniu z dobrowolnym chorobowym pytamy, od kiedy je opłacasz', () => {
    let r = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, ['zlecenie']);
    expect(ids(r)).toContain('chorobowe_dobrowolne');
    expect(ids(r)).not.toContain('chorobowo_od');
    r = zapiszOdpowiedz(def('chorobowe_dobrowolne'), r, { osoba: 0, tytul: 0 }, true);
    expect(r.osoby[0].tytuly[0].chorobowe).toBe('dobrowolne');
    expect(ids(r)).toContain('chorobowo_od');
  });

  it('opcja osoba zawęża pytania osobowe do jednej osoby', () => {
    const para = dodajTytul(
      { ...PRZYKLAD_RODZINA, osoby: [...PRZYKLAD_RODZINA.osoby, { id: 'tata', rola: 'ojciec', tytuly: [] }] },
      1,
      'umowa_o_prace',
    );
    const tylkoTata = widocznePytania(PYTANIA, para, { osoba: 1 });
    expect(tylkoTata.filter((p) => p.def.zakres === 'osoba' || p.def.zakres === 'tytul').every((p) => p.zakres.osoba === 1)).toBe(true);
    expect(tylkoTata.some((p) => p.def.id === 'etat_wymiar' && p.sciezka === 'osoby[1].tytuly[0].wymiarEtatu')).toBe(true);
  });

  it('klucze pytań są unikalne', () => {
    const r = zapiszOdpowiedz(def('liczba_dzieci'), zapiszOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {}, 'urodzone'), {}, 2);
    const klucze = widocznePytania(PYTANIA, r).map((p) => p.klucz);
    expect(new Set(klucze).size).toBe(klucze.length);
    expect(r.zdarzenie.dzieci).toHaveLength(2);
  });
});

describe('kodeki odpowiedzi', () => {
  it('tytuły: dodanie zlecenia zachowuje istniejący etat, odznaczenie usuwa tytuł', () => {
    const r = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, ['umowa_o_prace', 'zlecenie']);
    expect(r.osoby[0].tytuly).toHaveLength(2);
    expect(r.osoby[0].tytuly[0]).toBe(PRZYKLAD_RODZINA.osoby[0].tytuly[0]);
    expect(r.osoby[0].tytuly[1].rodzaj).toBe('zlecenie');
    expect(new Set(r.osoby[0].tytuly.map((t) => t.id)).size).toBe(2);
    expect(odczytajOdpowiedz(def('tytuly_rodzaje'), r, { osoba: 0 })).toEqual(['umowa_o_prace', 'zlecenie']);

    const bezEtatu = zapiszOdpowiedz(def('tytuly_rodzaje'), r, { osoba: 0 }, ['zlecenie']);
    expect(bezEtatu.osoby[0].tytuly.map((t) => t.rodzaj)).toEqual(['zlecenie']);
  });

  it('dodajTytul i usunTytul pozwalają mieć dwie umowy tego samego rodzaju', () => {
    const r = dodajTytul(PRZYKLAD_RODZINA, 0, 'umowa_o_prace');
    expect(r.osoby[0].tytuly.map((t) => t.rodzaj)).toEqual(['umowa_o_prace', 'umowa_o_prace']);
    expect(r.osoby[0].tytuly[1].id).not.toBe(r.osoby[0].tytuly[0].id);
    expect(usunTytul(r, 0, 1).osoby[0].tytuly).toHaveLength(1);
    expect(PRZYKLAD_RODZINA.osoby[0].tytuly).toHaveLength(1);
  });

  it('etap czytany z przykładu to „w ciąży”', () => {
    expect(odczytajOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {})).toBe('w_ciazy');
  });

  it('„nie wiem” przy pytaniu o 20 osób zapisuje brak wartości', () => {
    const r = zapiszOdpowiedz(def('platnik_powyzej_20'), PRZYKLAD_RODZINA, { osoba: 0, tytul: 0 }, undefined);
    expect(r.osoby[0].tytuly[0].platnikPowyzej20).toBeUndefined();
  });

  it('ustanie umowy: „tak” tworzy obiekt, „nie” go usuwa', () => {
    const tak = zapiszOdpowiedz(def('ustanie_umowy'), PRZYKLAD_RODZINA, { osoba: 0, tytul: 0 }, true);
    expect(tak.osoby[0].tytuly[0].ustanie).toBeDefined();
    expect(widocznePytania(PYTANIA, tak).map((p) => p.def.id)).toContain('ustanie_data');
    const nie = zapiszOdpowiedz(def('ustanie_umowy'), tak, { osoba: 0, tytul: 0 }, false);
    expect(nie.osoby[0].tytuly[0].ustanie).toBeUndefined();
  });
});

describe('walidujOdpowiedz', () => {
  it('puste pole wymagane → WYMAGANE', () => {
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), '', KONTEKST).map((b) => b.kod)).toEqual(['WYMAGANE']);
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), undefined, KONTEKST).map((b) => b.kod)).toEqual(['WYMAGANE']);
    expect(walidujOdpowiedz(def('rola'), undefined, KONTEKST).map((b) => b.kod)).toEqual(['WYMAGANE']);
  });

  it('pole opcjonalne może zostać puste', () => {
    expect(walidujOdpowiedz(def('dziecko_masa'), undefined, KONTEKST)).toEqual([]);
  });

  it('każdy błąd ma komunikat dla rodzica', () => {
    const [blad] = walidujOdpowiedz(def('wynagrodzenie_miesieczne'), -1, KONTEKST);
    expect(blad.komunikat.length).toBeGreaterThan(10);
  });

  it('ujemna kwota → KWOTA_UJEMNA, zero jest w porządku', () => {
    expect(walidujOdpowiedz(def('wynagrodzenie_miesieczne'), -100, KONTEKST).map((b) => b.kod)).toEqual(['KWOTA_UJEMNA']);
    expect(walidujOdpowiedz(def('wynagrodzenie_miesieczne'), 0, KONTEKST)).toEqual([]);
    expect(walidujOdpowiedz(def('wynagrodzenie_miesieczne'), Number.NaN, KONTEKST).map((b) => b.kod)).toEqual(['NIE_LICZBA']);
  });

  it('przewidywany poród za trzy lata → DATA_ZA_POZNO', () => {
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), '2029-11-21', KONTEKST).map((b) => b.kod)).toEqual(['DATA_ZA_POZNO']);
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), '2027-06-01', KONTEKST)).toEqual([]);
  });

  it('data porodu dziecka, które już się urodziło, nie może być w przyszłości', () => {
    expect(walidujOdpowiedz(def('data_porodu'), '2026-11-22', KONTEKST).map((b) => b.kod)).toEqual(['DATA_ZA_POZNO']);
    expect(walidujOdpowiedz(def('data_porodu'), '2026-11-21', KONTEKST)).toEqual([]);
  });

  it('zakres dat liczymy od dataAnalizy, nie od zegara', () => {
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), '2021-03-01', { dataAnalizy: '2020-11-21' })).toEqual([]);
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), '2021-03-01', KONTEKST).map((b) => b.kod)).toEqual(['DATA_ZA_WCZESNIE']);
  });

  it('nieistniejąca data → ZLA_DATA', () => {
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), '2027-02-30', KONTEKST).map((b) => b.kod)).toEqual(['ZLA_DATA']);
    expect(walidujOdpowiedz(def('data_porodu_przewidywana'), '1.12.2026', KONTEKST).map((b) => b.kod)).toEqual(['ZLA_DATA']);
  });

  it('liczba dzieci poniżej 1 → ZA_MALO', () => {
    expect(walidujOdpowiedz(def('liczba_dzieci'), 0, KONTEKST).map((b) => b.kod)).toEqual(['ZA_MALO']);
  });

  it('wybór spoza listy → ZLA_OPCJA', () => {
    expect(walidujOdpowiedz(def('rola'), 'babcia', KONTEKST).map((b) => b.kod)).toEqual(['ZLA_OPCJA']);
  });

  it('lista miesięcy: błąd wskazuje konkretny wiersz', () => {
    const bledy = walidujOdpowiedz(
      def('podstawa_miesiace'),
      [
        { miesiac: '2026-09', kwota: 8000 },
        { miesiac: '2026-10', kwota: -5 },
        { miesiac: '2026-10', kwota: 8000 },
        { miesiac: '2027-01', kwota: 8000 },
        { miesiac: '2026-08', kwota: 8000, dniPrzepracowane: 25, dniObowiazku: 21 },
      ],
      KONTEKST,
    );
    expect(bledy).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kod: 'KWOTA_UJEMNA', pole: '[1].kwota' }),
        expect.objectContaining({ kod: 'MIESIAC_POWTORZONY', pole: '[2].miesiac' }),
        expect.objectContaining({ kod: 'MIESIAC_W_PRZYSZLOSCI', pole: '[3].miesiac' }),
        expect.objectContaining({ kod: 'DNI_PONAD_OBOWIAZEK', pole: '[4].dniPrzepracowane' }),
      ]),
    );
    expect(bledy).toHaveLength(4);
  });

  it('zwolnienie kończące się przed początkiem → OKRES_ODWROCONY', () => {
    const bledy = walidujOdpowiedz(def('zwolnienia_w_ciazy'), [{ od: '2026-10-10', do: '2026-10-01', kodB: true }], KONTEKST);
    expect(bledy.map((b) => [b.kod, b.pole])).toEqual([['OKRES_ODWROCONY', '[0].do']]);
  });

  it('data wcześniejsza niż inna data z profilu → DATA_PRZED_INNA', () => {
    const r = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].naCzasOkreslony', true);
    const bledy = walidujOdpowiedz(def('etat_do'), '2022-01-01', { dataAnalizy: r.dataAnalizy, rodzina: r, zakres: { osoba: 0, tytul: 0 } });
    expect(bledy.map((b) => b.kod)).toEqual(['DATA_PRZED_INNA']);
  });
});

describe('walidujAnkiete', () => {
  it('przykład wzorcowy przechodzi', () => {
    const wynik = walidujAnkiete(PYTANIA, PRZYKLAD_RODZINA);
    expect(wynik.bledy).toEqual([]);
    expect(wynik.poprawna).toBe(true);
  });

  it('nowy tytuł bez daty początku daje błąd przy konkretnym polu', () => {
    const r = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, ['umowa_o_prace', 'zlecenie']);
    const wynik = walidujAnkiete(PYTANIA, r);
    expect(wynik.poprawna).toBe(false);
    expect(wynik.bledy).toEqual(
      expect.arrayContaining([expect.objectContaining({ pytanieId: 'tytul_od', sciezka: 'osoby[0].tytuly[1].od', kod: 'WYMAGANE' })]),
    );
  });

  it('ukryte pytania nie są walidowane', () => {
    // zła wartość w polu, którego przy etacie nie pokazujemy
    const r = zapiszWartosc(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].zadeklarowanaPodstawa', -50);
    expect(walidujAnkiete(PYTANIA, r).poprawna).toBe(true);
  });
});

describe('czyWypelnione', () => {
  it('pusta lista to niewypełnione, lista z elementem i liczba 0 to wypełnione', () => {
    expect(czyWypelnione([])).toBe(false);
    expect(czyWypelnione([1])).toBe(true);
    expect(czyWypelnione(0)).toBe(true);
    expect(czyWypelnione('')).toBe(false);
    expect(czyWypelnione(undefined)).toBe(false);
  });
});

describe('warunki pytań (etap, tytuł, chorobowe)', () => {
  const O0 = { osoba: 0, tytul: 0 };
  const etat = (r: Rodzina = PRZYKLAD_RODZINA) => r;
  const bezChorobowego = (rodzaj: 'umowa_o_prace' | 'zlecenie' | 'dzialalnosc' | 'wspolpraca' | 'inny') => {
    let r = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, [rodzaj]);
    r = zapiszWartosc(r, 'osoby[0].tytuly[0].chorobowe', 'brak');
    return r;
  };
  const zChorobowym = (rodzaj: 'zlecenie' | 'dzialalnosc' | 'wspolpraca') => {
    let r = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, [rodzaj]);
    r = zapiszOdpowiedz(def('chorobowe_dobrowolne'), r, O0, true);
    return r;
  };

  it('Za życiem: w ciąży nie pytamy, a krok „po urodzeniu” nie ma ekranu otwierającego', () => {
    const wCiazy = etat();
    expect(wCiazy.zdarzenie.przewidywana).toBe(true);
    expect(ids(wCiazy)).not.toContain('dziecko_za_zyciem');
    for (const tryb of ['telefon', 'komputer'] as const) {
      const k = kolejkaEkranow(PYTANIA, wCiazy, tryb);
      expect(k.some((e) => e.rodzaj !== 'koniec' && e.krok === 'po_porodzie')).toBe(false);
    }
  });

  it('Za życiem: pytamy po porodzie i przy przyjęciu dziecka', () => {
    const urodzone = zapiszOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {}, 'urodzone');
    expect(ids(urodzone)).toContain('dziecko_za_zyciem');
    const przyjecie = zapiszOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {}, 'przyjecie');
    expect(ids(przyjecie)).toContain('dziecko_za_zyciem');
  });

  it('odroczony obowiązek szkolny: tylko przy rodzinie zastępczej niezawodowej', () => {
    const przyjecie = zapiszOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {}, 'przyjecie');
    expect(ids(przyjecie)).not.toContain('dziecko_odroczony_obowiazek'); // przysposobienie
    const niezawodowa = zapiszOdpowiedz(def('typ_przyjecia'), przyjecie, {}, 'rodzina_zastepcza_niezawodowa');
    expect(ids(niezawodowa)).toContain('dziecko_odroczony_obowiazek');
    const zawodowa = zapiszOdpowiedz(def('typ_przyjecia'), przyjecie, {}, 'rodzina_zastepcza_zawodowa');
    expect(ids(zawodowa)).not.toContain('dziecko_odroczony_obowiazek');
  });

  it('pytanie o płatnika: etat, zlecenie i inny tytuł z chorobowym; nie przy działalności i współpracy', () => {
    expect(ids(etat())).toContain('platnik_powyzej_20');
    expect(ids(zChorobowym('zlecenie'))).toContain('platnik_powyzej_20');
    let inny = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, ['inny']);
    inny = zapiszOdpowiedz(def('chorobowe_inny'), inny, O0, 'obowiazkowe');
    expect(ids(inny)).toContain('platnik_powyzej_20');
    expect(ids(zChorobowym('dzialalnosc'))).not.toContain('platnik_powyzej_20');
    expect(ids(zChorobowym('wspolpraca'))).not.toContain('platnik_powyzej_20');
  });

  it('pytanie o płatnika: znika bez chorobowego i po ustaniu ubezpieczenia', () => {
    expect(ids(bezChorobowego('zlecenie'))).not.toContain('platnik_powyzej_20');
    const ustanie = zapiszOdpowiedz(def('ustanie_umowy'), etat(), O0, true);
    expect(ids(ustanie)).toContain('ustanie_data');
    expect(ids(ustanie)).not.toContain('platnik_powyzej_20');
  });

  it('pytania o chorobowe są przed pytaniem o płatnika (kolejność ekranów)', () => {
    const miejsce = (id: string) => PYTANIA.findIndex((p) => p.id === id);
    expect(miejsce('chorobowe_dobrowolne')).toBeLessThan(miejsce('platnik_powyzej_20'));
    expect(miejsce('chorobowe_inny')).toBeLessThan(miejsce('platnik_powyzej_20'));
  });

  it('bez chorobowego nie pytamy o ustanie, podstawę ani zarobki, ale pytamy o samo chorobowe', () => {
    const lista = ids(bezChorobowego('zlecenie'));
    expect(lista).toContain('chorobowe_dobrowolne');
    for (const id of ['ustanie_umowy', 'tryb_podstawy', 'wynagrodzenie_miesieczne', 'podstawa_miesiace']) expect(lista).not.toContain(id);
    const firma = ids(bezChorobowego('dzialalnosc'));
    for (const id of ['ustanie_firmy', 'tryb_podstawy', 'dzialalnosc_podstawa']) expect(firma).not.toContain(id);
    const inny = ids(bezChorobowego('inny'));
    expect(inny).toContain('chorobowe_inny');
    expect(inny).not.toContain('tryb_podstawy');
  });

  it('etat ma od razu chorobowe obowiązkowe, więc dostaje wszystkie pytania zależne od chorobowego', () => {
    const lista = ids(etat());
    for (const id of ['ustanie_umowy', 'tryb_podstawy', 'wynagrodzenie_miesieczne']) expect(lista).toContain(id);
  });

  it('po odpowiedzi „tak” o dobrowolne chorobowe pojawiają się pytania o zarobki i ustanie', () => {
    const zlecenie = ids(zChorobowym('zlecenie'));
    for (const id of ['ustanie_umowy', 'tryb_podstawy', 'wynagrodzenie_miesieczne']) expect(zlecenie).toContain(id);
    const firma = ids(zChorobowym('dzialalnosc'));
    for (const id of ['ustanie_firmy', 'tryb_podstawy', 'dzialalnosc_podstawa']) expect(firma).toContain(id);
  });

  it('tryb „miesiąc po miesiącu” z pustą listą nadal pokazuje listę miesięcy, nie kwotę', () => {
    const r = zapiszOdpowiedz(def('tryb_podstawy'), etat(), O0, 'miesiace');
    const lista = ids(r);
    expect(lista).toContain('podstawa_miesiace');
    expect(lista).not.toContain('wynagrodzenie_miesieczne');
  });

  it('zwolnienia w ciąży i PIT-2 dopiero, gdy jest jakiś tytuł ubezpieczenia', () => {
    const bezTytulow = zapiszOdpowiedz(def('tytuly_rodzaje'), PRZYKLAD_RODZINA, { osoba: 0 }, []);
    expect(bezTytulow.osoby[0].tytuly).toEqual([]);
    const urodzoneBez = zapiszOdpowiedz(def('etap'), bezTytulow, {}, 'urodzone');
    const lista = ids(urodzoneBez);
    expect(lista).not.toContain('zwolnienia_w_ciazy');
    expect(lista).not.toContain('pit2');
    const z = ids(zapiszOdpowiedz(def('etap'), PRZYKLAD_RODZINA, {}, 'urodzone'));
    expect(z).toContain('zwolnienia_w_ciazy');
    expect(z).toContain('pit2');
  });

  it('nazwy kroków: zwolnienia w ciąży i po urodzeniu dziecka', () => {
    expect(KROKI_ANKIETY.find((k) => k.id === 'ciaza')?.tytul).toBe('Zwolnienia lekarskie w ciąży');
    expect(KROKI_ANKIETY.find((k) => k.id === 'po_porodzie')?.tytul).toBe('Po urodzeniu dziecka');
  });

  it('pojęcia z wyjaśnieniem: wszystkie z pojęciem i treścią', () => {
    for (const id of ['tryb_podstawy', 'platnik_powyzej_20', 'chorobowe_dobrowolne', 'dziecko_szpital', 'typ_przyjecia', 'dziecko_odroczony_obowiazek', 'urlop_wychowawczy', 'pit2', 'zwolnienia_w_ciazy', 'dziecko_za_zyciem']) {
      const w = def(id).wyjasnienie;
      expect(w?.pojecie.length, id).toBeGreaterThan(0);
      expect(w?.tresc.length, id).toBeGreaterThan(0);
    }
  });
});
