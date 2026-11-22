/**
 * Symulacje źródeł danych: usługa oddaje tylko to, co według mapy (docs/zrodla-danych.json) naprawdę ma,
 * a czego nie ma, opisuje w `brakuje` etykietami z mapy. Tor D, zadanie D1.
 */
import { describe, expect, it } from 'vitest';
import mapa from '../../../docs/zrodla-danych.json';
import type { OdpowiedzZrodla, Osoba, PersonaTestowa, Rodzina } from '../../engine/types';
import { PERSONY } from '../persony';
import {
  BladSymulacji,
  dokumentyZrodla,
  odpowiedzZrodla,
  rekordyPola,
  SCIEZKI_MAPY,
  symulujZrodlo,
  USLUGI,
  wartoscPola,
  ZALOZENIA,
  jednostkiDanych,
} from '../zrodla';

type RekordMapy = { id: string; etykieta: string; zrodla: { zrodlo: string; status: string }[] };
const rekordy = mapa as RekordMapy[];
const etykiety = rekordy.map((r) => r.etykieta);

function persona(id: string): PersonaTestowa {
  const p = PERSONY.find((x) => x.id === id);
  if (!p) throw new Error(`brak persony ${id}`);
  return p;
}

/** Wszystkie odpowiedzi: każda usługa × każda persona × każda osoba w personie. */
const WSZYSTKIE = PERSONY.flatMap((p) =>
  p.rodzina.osoby.flatMap((o, i) =>
    USLUGI.map((zrodlo) => ({ nazwa: `${zrodlo}/${p.id}/${o.id}`, zrodlo, p, i, odp: symulujZrodlo(zrodlo, p.rodzina, i) })),
  ),
);

function tytuly(odp: OdpowiedzZrodla) {
  return odp.dane.tytuly ?? [];
}

describe('tabele w kodzie zgadzają się z mapą', () => {
  it('każdy rekord użyty w tabeli ścieżek istnieje w mapie', () => {
    const ids = new Set(rekordy.map((r) => r.id));
    const jednostki = PERSONY.flatMap((p) => jednostkiDanych(p.rodzina));
    for (const j of jednostki) for (const r of rekordyPola(j)) expect(ids.has(r.id), r.id).toBe(true);
    for (const w of SCIEZKI_MAPY) {
      if (Array.isArray(w.dane)) for (const id of w.dane) expect(ids.has(id), `${w.wzor} → ${id}`).toBe(true);
    }
  });

  it('każde założenie z mapy (usługa ze statusem „zalozenie”) ma w kodzie jawną decyzję i odwrotnie', () => {
    const wMapie = rekordy.flatMap((r) => r.zrodla.filter((z) => z.status === 'zalozenie').map((z) => `${r.id}/${z.zrodlo}`));
    expect(Object.keys(ZALOZENIA).sort()).toEqual([...wMapie].sort());
  });
});

describe('odpowiedź każdej symulacji', () => {
  it.each(WSZYSTKIE.map((x) => [x.nazwa, x] as const))('%s: ma kształt OdpowiedzZrodla i dane zgodne z personą', (_n, x) => {
    const { odp, p, i, zrodlo } = x;
    expect(odp.zrodlo).toBe(zrodlo);
    expect(odp.symulacja).toBe(true);
    expect(odp.dane.id).toBe(p.rodzina.osoby[i].id);
    // Pochodzenie: tylko ta usługa, tylko pola tej osoby, zdarzenia albo innych osób z `osoby`, wartości takie jak w personie.
    const scalone = { osoby: [] as unknown[], zdarzenie: odp.dane.zdarzenie };
    scalone.osoby[i] = odp.dane;
    const prefiksy = [`osoby[${i}]`, 'zdarzenie'];
    for (const inna of odp.osoby ?? []) {
      const j = p.rodzina.osoby.findIndex((o) => o.id === inna.id);
      expect(j, inna.id).toBeGreaterThanOrEqual(0);
      expect(j).not.toBe(i);
      scalone.osoby[j] = inna;
      prefiksy.push(`osoby[${j}]`);
    }
    const listy = new Set(jednostkiDanych(p.rodzina).filter((j) => j.wiersz.lista).map((j) => j.sciezka));
    for (const { sciezka, zrodlo: z } of odp.pochodzenie) {
      expect(z).toBe(zrodlo);
      expect(prefiksy.some((pr) => sciezka.startsWith(pr)), sciezka).toBe(true);
      const zwrocone = wartoscPola(scalone, sciezka);
      const wPersonie = wartoscPola(p.rodzina, sciezka);
      // Lista (tytuły, dzieci) przychodzi jako szkielet – jej elementy mają własne wpisy.
      if (listy.has(sciezka)) expect((zwrocone as unknown[]).length, sciezka).toBe((wPersonie as unknown[]).length);
      else expect(zwrocone, sciezka).toEqual(wPersonie);
    }
    // `brakuje` mówi językiem mapy.
    for (const b of odp.brakuje) expect(etykiety.some((e) => b.startsWith(e)), b).toBe(true);
    expect(new Set(odp.brakuje).size).toBe(odp.brakuje.length);
  });

  it.each(WSZYSTKIE.map((x) => [x.nazwa, x] as const))('%s: każde zwrócone pole ma wpis w pochodzeniu', (_n, x) => {
    const { odp, i } = x;
    const sciezki = odp.pochodzenie.map((q) => q.sciezka);
    const pola = [
      ...Object.keys(odp.dane)
        .filter((k) => k !== 'id' && k !== 'zdarzenie')
        .map((k) => `osoby[${i}].${k}`),
      ...Object.keys(odp.dane.zdarzenie ?? {}).map((k) => `zdarzenie.${k}`),
    ];
    for (const inna of odp.osoby ?? []) {
      const j = x.p.rodzina.osoby.findIndex((o) => o.id === inna.id);
      pola.push(...Object.keys(inna).filter((k) => k !== 'id').map((k) => `osoby[${j}].${k}`));
    }
    for (const pole of pola) {
      expect(sciezki.some((s) => s === pole || s.startsWith(`${pole}.`) || s.startsWith(`${pole}[`)), pole).toBe(true);
    }
  });
});

/** Persona przed porodem z danymi dziecka wpisanymi przez rodzica (imię wybrane, PESEL-u jeszcze nie ma). */
function annaZImieniemDziecka(): Rodzina {
  const anna = persona('anna-etat').rodzina;
  return { ...anna, zdarzenie: { ...anna.zdarzenie, dzieci: [{ dane: { imie: 'Hanna', nazwisko: 'Przykładowa' } }] } };
}

describe('mObywatel', () => {
  it.each(WSZYSTKIE.filter((x) => x.zrodlo === 'mobywatel').map((x) => [x.nazwa, x] as const))(
    '%s: nigdy nie zwraca tytułów ubezpieczenia ani podstaw składek',
    (_n, { odp }) => {
      expect(odp.dane.tytuly).toBeUndefined();
      for (const o of odp.osoby ?? []) expect(o.tytuly).toBeUndefined();
      expect(JSON.stringify([odp.dane, odp.osoby])).not.toContain('podstawaSkladek');
      expect(odp.dane.pobraneZasilki).toBeUndefined();
      expect(odp.pochodzenie.some((q) => q.sciezka.includes('tytuly'))).toBe(false);
    },
  );

  it('anna-etat: daje tożsamość z rejestru PESEL, a o resztę każe zapytać', () => {
    const odp = odpowiedzZrodla('mobywatel', 'anna-etat');
    expect(odp.dane.dane).toMatchObject({ imie: 'Anna', nazwisko: 'Przykładowa', dataUrodzenia: '1994-05-12' });
    expect(odp.dane.dane?.pesel).toMatch(/^\d{11}$/);
    expect(odp.dane.zdarzenie).toBeUndefined();
    expect(odp.brakuje).toContain('Tytuły ubezpieczenia: kod tytułu, okres od–do, płatnik');
    expect(odp.brakuje).toContain('Przewidywana data porodu');
    expect(odp.brakuje).toContain('Wymiar czasu pracy (etat)');
  });

  it('marta-i-piotr: po sporządzeniu aktu urodzenia zna datę urodzenia bliźniąt, ale nie liczbę dzieci', () => {
    const odp = odpowiedzZrodla('mobywatel', 'marta-i-piotr');
    expect(odp.dane.zdarzenie).toMatchObject({ data: '2026-11-09', przewidywana: false });
    expect(odp.brakuje).toContain('Liczba dzieci urodzonych przy jednym porodzie albo przyjętych jednocześnie');
    // Lista dzieci przychodzi z danymi każdego dziecka, ale pochodzenie nie twierdzi, że rejestr zna „poród mnogi”.
    expect(odp.pochodzenie.map((q) => q.sciezka)).not.toContain('zdarzenie.dzieci');
  });

  it('marta-i-piotr: rejestr PESEL daje imię, nazwisko, PESEL i miejsce urodzenia każdego dziecka', () => {
    const odp = odpowiedzZrodla('mobywatel', 'marta-i-piotr');
    const wPersonie = persona('marta-i-piotr').rodzina.zdarzenie.dzieci;
    expect(odp.dane.zdarzenie?.dzieci).toEqual(wPersonie.map((d) => ({ dane: d.dane })));
    expect(odp.dane.zdarzenie?.dzieci?.[1].dane).toMatchObject({ imie: 'Jan', nazwisko: 'Kowalczyk', miejsceUrodzenia: 'Poznań' });
    expect(odp.dane.zdarzenie?.dzieci?.[0].dane?.pesel).toMatch(/^\d{11}$/);
    for (const pole of ['imie', 'nazwisko', 'pesel', 'miejsceUrodzenia']) {
      expect(odp.pochodzenie).toContainEqual({ sciezka: `zdarzenie.dzieci[0].dane.${pole}`, zrodlo: 'mobywatel' });
      expect(odp.pochodzenie).toContainEqual({ sciezka: `zdarzenie.dzieci[1].dane.${pole}`, zrodlo: 'mobywatel' });
    }
    expect(odp.brakuje.some((b) => b.startsWith('PESEL dziecka'))).toBe(false);
    expect(odp.brakuje.some((b) => b.startsWith('Dziecko: imię i nazwisko'))).toBe(false);
  });

  it('przed porodem nie zwraca danych dziecka, nawet gdy rodzic już je wpisał', () => {
    const odp = symulujZrodlo('mobywatel', annaZImieniemDziecka(), 0);
    expect(odp.dane.zdarzenie).toBeUndefined();
    expect(odp.pochodzenie.some((q) => q.sciezka.startsWith('zdarzenie'))).toBe(false);
  });

  it('marta-i-piotr: małżeństwo – rejestr PESEL zna imię i PESEL małżonka (w `osoby`), ale nie jego obecne nazwisko', () => {
    const marta = odpowiedzZrodla('mobywatel', 'marta-i-piotr');
    expect(marta.osoby).toEqual([{ id: 'tata', dane: { imie: 'Piotr', pesel: '89041736255' } }]);
    expect(marta.pochodzenie).toContainEqual({ sciezka: 'osoby[1].dane.imie', zrodlo: 'mobywatel' });
    expect(marta.pochodzenie).toContainEqual({ sciezka: 'osoby[1].dane.pesel', zrodlo: 'mobywatel' });
    expect(marta.pochodzenie.some((q) => q.sciezka === 'osoby[1].dane.nazwisko')).toBe(false);
    const piotr = odpowiedzZrodla('mobywatel', 'marta-i-piotr', 'tata');
    expect(piotr.dane.id).toBe('tata');
    expect(piotr.osoby).toEqual([{ id: 'mama', dane: { imie: 'Marta', pesel: '91103024862' } }]);
  });

  it('para bez ślubu (ewa i tomek): rejestr PESEL nie daje danych drugiego rodzica', () => {
    expect(odpowiedzZrodla('mobywatel', 'ewa-bez-ubezpieczenia-i-tomek').osoby).toBeUndefined();
  });

  it('dane małżonka daje tylko mObywatel, nie eZUS ani e-Urząd Skarbowy', () => {
    for (const z of ['ezus', 'eurzad_skarbowy', 'rsc'] as const) expect(odpowiedzZrodla(z, 'marta-i-piotr').osoby, z).toBeUndefined();
  });
});

describe('eZUS – konto ubezpieczonego', () => {
  const zEzus = WSZYSTKIE.filter((x) => x.zrodlo === 'ezus');

  it.each(zEzus.map((x) => [x.nazwa, x] as const))(
    '%s: nie zwraca składników wynagrodzenia, wymiaru etatu, liczby ubezpieczonych u płatnika ani rachunku',
    (_n, { odp }) => {
      for (const t of tytuly(odp)) {
        expect(t.wymiarEtatu).toBeUndefined();
        expect(t.platnikPowyzej20).toBeUndefined();
        expect(t.wynagrodzenieMiesieczne).toBeUndefined();
        expect(t.skladnikiKwartalne).toBeUndefined();
        expect(t.skladnikRoczny).toBeUndefined();
        expect(t.naCzasOkreslony).toBeUndefined();
        for (const m of t.podstawaSkladek ?? []) expect(Object.keys(m).sort()).toEqual(['kwota', 'miesiac']);
      }
      expect(odp.dane.dane?.rachunekBankowy).toBeUndefined();
    },
  );

  it('anna-etat: tytuł z kodem i okresem, płatnik z NIP i podstawy po miesiącach za 12 miesięcy', () => {
    const odp = odpowiedzZrodla('ezus', 'anna-etat');
    const [t] = tytuly(odp);
    expect(t).toMatchObject({ id: 'etat-1', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2023-03-01' });
    expect(t.nazwaPlatnika).toBe('Przykładowa Firma sp. z o.o.');
    expect(t.nipPlatnika).toMatch(/^\d{10}$/);
    expect(t.podstawaSkladek).toHaveLength(12);
    expect(t.podstawaSkladek?.at(-1)?.miesiac).toBe('2026-10');
    expect(odp.dane.dane?.adres?.miejscowosc).toBeTruthy();
    expect(odp.brakuje).toContain('Wymiar czasu pracy (etat)');
    expect(odp.brakuje).toContain('Ilu ubezpieczonych zgłasza płatnik (decyduje, kto wypłaca zasiłek: pracodawca czy ZUS)');
    expect(odp.brakuje).toContain('Numer rachunku bankowego do wypłaty zasiłku (pole dobrowolne)');
    // Rodzic myśli, że ZUS zna termin porodu – nie zna.
    expect(odp.brakuje).toContain('Przewidywana data porodu');
  });

  it('kasia-zlecenie: zlecenie jeszcze trwa, więc eZUS nie zna daty jego końca', () => {
    const [t] = tytuly(odpowiedzZrodla('ezus', 'kasia-zlecenie'));
    expect(t).toMatchObject({ rodzaj: 'zlecenie', chorobowe: 'dobrowolne' });
    expect(t.do).toBeUndefined();
    expect(odpowiedzZrodla('ezus', 'kasia-zlecenie').brakuje).toContain('Czy umowa jest na czas określony i do kiedy trwa');
  });

  it('koniec tytułu sprzed dnia analizy (wyrejestrowanie) eZUS już widzi', () => {
    const kasia = persona('kasia-zlecenie').rodzina;
    const poKoncu: Rodzina = { ...kasia, dataAnalizy: '2026-12-20' };
    const [t] = tytuly(symulujZrodlo('ezus', poKoncu, 0));
    expect(t.do).toBe(kasia.osoby[0].tytuly[0].do);
  });

  it('ola-firma: działalność z chorobowym od 1 listopada i zadeklarowaną podstawą, saldo składek 0', () => {
    const [t] = tytuly(odpowiedzZrodla('ezus', 'ola-firma'));
    expect(t).toMatchObject({ rodzaj: 'dzialalnosc', chorobowe: 'dobrowolne', chorobowoOd: '2026-11-01', zadluzenieSkladkowe: 0 });
    expect(t.zadeklarowanaPodstawa).toBeGreaterThan(0);
  });

  it('ola-firma: saldo składek z datą salda = dzień analizy (eZUS zna saldo na dziś) i REGON płatnika', () => {
    const odp = odpowiedzZrodla('ezus', 'ola-firma');
    const [t] = tytuly(odp);
    expect(t.zadluzenieSkladkoweNaDzien).toBe(persona('ola-firma').rodzina.dataAnalizy);
    expect(t.regonPlatnika).toBe('221067438');
    expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].tytuly[0].zadluzenieSkladkoweNaDzien', zrodlo: 'ezus' });
    expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].tytuly[0].regonPlatnika', zrodlo: 'ezus' });
    // Zawieszenie działalności eZUS pokazuje tylko pośrednio (przerwa w ubezpieczeniu) – daty ma CEIDG.
    expect(t.zawieszenia).toBeUndefined();
  });

  it('marta-i-piotr: „Świadczenia i przerwy” – wcześniej pobrany zasiłek chorobowy z ZUS', () => {
    const odp = odpowiedzZrodla('ezus', 'marta-i-piotr');
    const wPersonie = persona('marta-i-piotr').rodzina.osoby[0].pobraneZasilki;
    expect(wPersonie?.length).toBeGreaterThan(0);
    expect(odp.dane.pobraneZasilki).toEqual(wPersonie);
    expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].pobraneZasilki', zrodlo: 'ezus' });
    expect(odp.brakuje.some((b) => b.startsWith('Wcześniej pobrane zasiłki'))).toBe(false);
    // Inne usługi pobranych zasiłków nie znają.
    for (const z of ['mobywatel', 'ikp', 'eurzad_skarbowy'] as const) expect(odpowiedzZrodla(z, 'marta-i-piotr').dane.pobraneZasilki, z).toBeUndefined();
  });

  describe('ustanie tytułu ubezpieczenia', () => {
    const anna = persona('anna-etat').rodzina;
    const zUstaniem = (data: string): Rodzina => ({
      ...anna,
      osoby: [{ ...anna.osoby[0], tytuly: [{ ...anna.osoby[0].tytuly[0], do: data, ustanie: { data, przyczyna: 'likwidacja' } }] }],
    });

    it('po wyrejestrowaniu eZUS zna datę ustania, ale nie przyczynę w rozumieniu ZAM – tę wpisuje rodzic', () => {
      const odp = symulujZrodlo('ezus', zUstaniem('2026-10-31'), 0);
      const [t] = tytuly(odp);
      expect(t.ustanie).toEqual({ data: '2026-10-31' });
      expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].tytuly[0].ustanie.data', zrodlo: 'ezus' });
      expect(odp.pochodzenie.some((q) => q.sciezka.endsWith('ustanie.przyczyna'))).toBe(false);
      const brak = odp.brakuje.find((b) => b.startsWith('Ustanie zatrudnienia'));
      expect(brak).toBeDefined();
      expect(brak).toMatch(/przyczyn/);
    });

    it('ustanie, które jeszcze nie nastąpiło, eZUS nie widzi', () => {
      const [t] = tytuly(symulujZrodlo('ezus', zUstaniem('2026-11-30'), 0));
      expect(t.ustanie).toBeUndefined();
    });
  });

  it('ewa-bez-ubezpieczenia-i-tomek: u Ewy eZUS nie ma żadnego zgłoszenia (pusta lista), u Tomka ma etat', () => {
    const ewa = odpowiedzZrodla('ezus', 'ewa-bez-ubezpieczenia-i-tomek');
    expect(ewa.dane.tytuly).toEqual([]);
    // Bez zgłoszenia do ubezpieczeń i bez e-ZLA eZUS nie zna adresu.
    expect(ewa.dane.dane?.adres).toBeUndefined();
    expect(ewa.brakuje.some((b) => b.startsWith('Adres zamieszkania wnioskodawcy'))).toBe(true);
    const tomek = odpowiedzZrodla('ezus', 'ewa-bez-ubezpieczenia-i-tomek', 'tata');
    expect(tytuly(tomek)[0].rodzaj).toBe('umowa_o_prace');
    expect(tomek.pochodzenie.every((q) => q.sciezka.startsWith('osoby[1]') || q.sciezka.startsWith('zdarzenie'))).toBe(true);
  });

  it('składniki z paska płacowego (tryb szczegółowy) eZUS odcina, zostaje miesiąc i kwota', () => {
    const anna = persona('anna-etat').rodzina;
    const [mama] = anna.osoby;
    const zeSkladnikami: Osoba = {
      ...mama,
      tytuly: [
        {
          ...mama.tytuly[0],
          podstawaSkladek: mama.tytuly[0].podstawaSkladek!.map((m) => ({ ...m, skladnikiStale: 7000, skladnikiZmienne: 1000, dniPrzepracowane: 20, dniObowiazku: 21 })),
          skladnikRoczny: 3000,
        },
      ],
    };
    const odp = symulujZrodlo('ezus', { ...anna, osoby: [zeSkladnikami] }, 0);
    const [t] = tytuly(odp);
    expect(t.podstawaSkladek).toEqual(mama.tytuly[0].podstawaSkladek);
    expect(t.skladnikRoczny).toBeUndefined();
    expect(odp.brakuje.some((b) => b.startsWith('Składniki wynagrodzenia'))).toBe(true);
  });
});

describe('e-ZLA', () => {
  it('eZUS: marta-i-piotr – zwolnienia z kodem B i bez niego', () => {
    const odp = odpowiedzZrodla('ezus', 'marta-i-piotr');
    const ezla = odp.dane.zdrowie?.eZLA ?? [];
    expect(ezla.filter((z) => z.kodB)).toEqual([{ od: '2026-11-02', do: '2026-11-08', kodB: true }]);
    expect(ezla.some((z) => !z.kodB)).toBe(true);
    expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].zdrowie.eZLA', zrodlo: 'ezus' });
  });

  it('IKP: zwraca okresy zwolnień bez kodu B (brak kodu = nie wiadomo) i mówi, że kodu B brakuje', () => {
    const odp = odpowiedzZrodla('ikp', 'marta-i-piotr');
    const wPersonie = persona('marta-i-piotr').rodzina.osoby[0].zdrowie?.eZLA ?? [];
    expect(odp.dane.zdrowie?.eZLA).toEqual(wPersonie.map(({ od, do: d }) => ({ od, do: d })));
    for (const z of odp.dane.zdrowie?.eZLA ?? []) expect('kodB' in z).toBe(false);
    expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].zdrowie.eZLA', zrodlo: 'ikp' });
    expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].zdrowie.eZLA[0].od', zrodlo: 'ikp' });
    expect(odp.pochodzenie.some((q) => q.sciezka.endsWith('.kodB'))).toBe(false);
    expect(odp.brakuje).toContain('Kod „B” na zwolnieniu (niezdolność do pracy w ciąży – zasiłek 100%)');
  });
});

describe('zaświadczenia i dokumenty', () => {
  it('ola-firma: zaświadczenie o zadłużeniu na dzień powstania prawa (poród) czeka do dnia po porodzie', () => {
    const ola = persona('ola-firma').rodzina;
    const doc = dokumentyZrodla('ezus', ola, 0).find((d) => d.kod === 'zaswiadczenie_o_zadluzeniu');
    expect(doc).toMatchObject({ naDzien: ola.zdarzenie.data, status: 'oczekuje', wystawienieOd: '2026-12-08' });
    expect(doc?.sciezki).toEqual(['osoby[0].tytuly[0].zadluzenieSkladkowe']);
    const poPorodzie = dokumentyZrodla('ezus', { ...ola, dataAnalizy: '2026-12-10' }, 0).find((d) => d.kod === 'zaswiadczenie_o_zadluzeniu');
    expect(poPorodzie?.status).toBe('wystawione');
    expect(poPorodzie?.wystawienieOd).toBeUndefined();
  });

  it('monika-firma-zaleglosc: eZUS oddaje saldo zaległości i zaświadczenie na dzień powstania prawa', () => {
    const p = persona('monika-firma-zaleglosc');
    const odp = odpowiedzZrodla('ezus', p.id);
    expect(odp.dane.tytuly?.[0]?.zadluzenieSkladkowe).toBe(p.rodzina.osoby[0].tytuly[0].zadluzenieSkladkowe);
    const doc = odp.dokumenty?.find((d) => d.kod === 'zaswiadczenie_o_zadluzeniu');
    expect(doc).toMatchObject({ naDzien: p.rodzina.zdarzenie.data, status: 'oczekuje' });
  });

  it('na etacie nie ma zaświadczenia o zadłużeniu (dotyczy tylko działalności i współpracy)', () => {
    const kody = dokumentyZrodla('ezus', persona('anna-etat').rodzina, 0).map((d) => d.kod);
    expect(kody).toContain('potwierdzenie_danych_z_zus');
    expect(kody).not.toContain('zaswiadczenie_o_zadluzeniu');
  });

  it('potwierdzenie z danymi z ZUS jest wystawione na dzień analizy i obejmuje tytuły; e-ZLA osobno', () => {
    const marta = persona('marta-i-piotr').rodzina;
    const docs = dokumentyZrodla('ezus', marta, 0);
    const potw = docs.find((d) => d.kod === 'potwierdzenie_danych_z_zus');
    expect(potw).toMatchObject({ status: 'wystawione', naDzien: '2026-11-21' });
    expect(potw?.sciezki).toContain('osoby[0].tytuly[0].podstawaSkladek');
    const ezla = docs.find((d) => d.kod === 'e_zla')?.sciezki ?? [];
    expect(ezla).toContain('osoby[0].zdrowie.eZLA');
    expect(ezla.every((s) => s.startsWith('osoby[0].zdrowie.eZLA'))).toBe(true);
  });

  it('odpowiedź usługi ma dokumenty: zaświadczenie o zadłużeniu „oczekuje”, potwierdzenie z danymi z ZUS „wystawione”', () => {
    const docs = odpowiedzZrodla('ezus', 'ola-firma').dokumenty ?? [];
    expect(docs.find((d) => d.kod === 'zaswiadczenie_o_zadluzeniu')).toMatchObject({ status: 'oczekuje', naDzien: '2026-12-07' });
    expect(docs.find((d) => d.kod === 'potwierdzenie_danych_z_zus')).toMatchObject({ status: 'wystawione', naDzien: '2026-11-21' });
  });

  it('odpowiedź odpisu aktu ma dokument: po porodzie „wystawione”, przed porodem „oczekuje”', () => {
    expect(odpowiedzZrodla('rsc', 'marta-i-piotr').dokumenty?.[0]).toMatchObject({ kod: 'odpis_aktu_urodzenia', status: 'wystawione' });
    expect(odpowiedzZrodla('rsc', 'anna-etat').dokumenty?.[0]).toMatchObject({ kod: 'odpis_aktu_urodzenia', status: 'oczekuje' });
  });

  it('usługa bez dokumentów (mObywatel) nie ma pola dokumenty', () => {
    expect(odpowiedzZrodla('mobywatel', 'anna-etat').dokumenty).toBeUndefined();
  });
});

describe('odpis aktu urodzenia (rejestr stanu cywilnego)', () => {
  it('marta-i-piotr: daje datę urodzenia oraz imię, nazwisko i miejsce urodzenia dzieci; PESEL dziecka ma rejestr PESEL', () => {
    const odp = odpowiedzZrodla('rsc', 'marta-i-piotr');
    const dzieci = persona('marta-i-piotr').rodzina.zdarzenie.dzieci;
    expect(odp.dane).toEqual({
      id: 'mama',
      zdarzenie: {
        data: '2026-11-09',
        przewidywana: false,
        dzieci: dzieci.map((d) => ({ dane: { imie: d.dane?.imie, nazwisko: d.dane?.nazwisko, miejsceUrodzenia: d.dane?.miejsceUrodzenia } })),
      },
    });
    expect(odp.brakuje.some((b) => b.startsWith('Dziecko: imię i nazwisko, data i miejsce urodzenia'))).toBe(false);
    expect(odp.brakuje).toContain('PESEL dziecka');
    expect(odp.brakuje).toContain('Liczba dzieci urodzonych przy jednym porodzie albo przyjętych jednocześnie');
    // Odpis dotyczy dziecka: nie wymienia danych rodzica jako brakujących.
    expect(odp.brakuje).not.toContain('Tytuły ubezpieczenia: kod tytułu, okres od–do, płatnik');
    expect(dokumentyZrodla('rsc', persona('marta-i-piotr').rodzina, 0)[0]).toMatchObject({ kod: 'odpis_aktu_urodzenia', status: 'wystawione' });
  });

  it('przed porodem aktu nie ma: nic nie zwraca, odpis czeka na poród', () => {
    const odp = odpowiedzZrodla('rsc', 'anna-etat');
    expect(odp.dane).toEqual({ id: 'mama' });
    expect(odp.brakuje).toContain('Przewidywana data porodu');
    expect(dokumentyZrodla('rsc', persona('anna-etat').rodzina, 0)[0]).toMatchObject({ status: 'oczekuje', wystawienieOd: '2026-12-01' });
  });

  it('przed porodem nie zwraca danych dziecka wpisanych przez rodzica (aktu jeszcze nie ma)', () => {
    const odp = symulujZrodlo('rsc', annaZImieniemDziecka(), 0);
    expect(odp.dane).toEqual({ id: 'mama' });
    expect(odp.pochodzenie).toEqual([]);
  });

  it('adopcja-joanna: przed uprawomocnieniem przysposobienia odpis nie przychodzi, wiek dziecka jest z dokumentów sądu', () => {
    const odp = odpowiedzZrodla('rsc', 'adopcja-joanna');
    expect(odp.dane.zdarzenie).toBeUndefined();
    expect(dokumentyZrodla('rsc', persona('adopcja-joanna').rodzina, 0)[0].status).toBe('oczekuje');
  });
});

describe('e-Urząd Skarbowy i inne usługi', () => {
  it('e-Urząd Skarbowy: daje rachunek i adres oraz niepełny tytuł własnej firmy – tylko nazwę, NIP i REGON', () => {
    const odp = odpowiedzZrodla('eurzad_skarbowy', 'ola-firma');
    expect(odp.dane.dane?.rachunekBankowy).toMatch(/^\d{26}$/);
    expect(odp.dane.dane?.adres).toBeDefined();
    const firma = persona('ola-firma').rodzina.osoby[0].tytuly[0];
    expect(odp.dane.tytuly).toEqual([
      { id: firma.id, nazwaPlatnika: firma.nazwaPlatnika, nipPlatnika: firma.nipPlatnika, regonPlatnika: firma.regonPlatnika },
    ]);
    // Pochodzenie pole po polu – bez wpisu „cała lista tytułów”, bo tę zna tylko eZUS.
    expect(odp.pochodzenie.map((q) => q.sciezka)).not.toContain('osoby[0].tytuly');
    expect(odp.pochodzenie).toContainEqual({ sciezka: 'osoby[0].tytuly[0].nipPlatnika', zrodlo: 'eurzad_skarbowy' });
    expect(odp.brakuje.some((b) => b.startsWith('Nazwa płatnika'))).toBe(false);
    expect(odp.brakuje).toContain('Tytuły ubezpieczenia: kod tytułu, okres od–do, płatnik');
    expect(odp.brakuje).toContain('Działalność gospodarcza: data rozpoczęcia, zawieszenia i wznowienia, status');
  });

  it('e-Urząd Skarbowy: płatnika na etacie nie zna (to nie jest własna działalność)', () => {
    expect(odpowiedzZrodla('eurzad_skarbowy', 'anna-etat').dane.tytuly).toBeUndefined();
  });

  it('CEIDG: ola-firma – data rozpoczęcia i okresy zawieszenia działalności, nic poza tym', () => {
    const odp = odpowiedzZrodla('ceidg', 'ola-firma');
    const firma = persona('ola-firma').rodzina.osoby[0].tytuly[0];
    expect(firma.zawieszenia?.length).toBeGreaterThan(0);
    expect(odp.dane).toEqual({ id: 'mama', tytuly: [{ id: firma.id, od: firma.od, zawieszenia: firma.zawieszenia }] });
    expect(odp.pochodzenie).toEqual(
      expect.arrayContaining([
        { sciezka: 'osoby[0].tytuly[0].od', zrodlo: 'ceidg' },
        { sciezka: 'osoby[0].tytuly[0].zawieszenia', zrodlo: 'ceidg' },
      ]),
    );
    expect(odp.brakuje.some((b) => b.startsWith('Działalność gospodarcza'))).toBe(false);
    expect(odp.brakuje).toContain('Działalność: zaległości w składkach (saldo na koncie płatnika)');
  });

  it('CEIDG: osoba bez działalności – nic', () => {
    const odp = odpowiedzZrodla('ceidg', 'anna-etat');
    expect(odp.dane).toEqual({ id: 'mama' });
    expect(odp.pochodzenie).toEqual([]);
  });

  it('login.gov.pl: imię, nazwisko i data urodzenia – bez PESEL (to założenie) i bez adresu', () => {
    const odp = odpowiedzZrodla('login_gov', 'anna-etat');
    expect(Object.keys(odp.dane.dane ?? {}).sort()).toEqual(['dataUrodzenia', 'imie', 'nazwisko']);
    expect(odp.brakuje).toContain('PESEL osoby, która składa wniosek');
  });

  it('Emp@tia: do zasiłków nic nie daje i niczego nie wymienia', () => {
    const odp = odpowiedzZrodla('empatia', 'anna-etat');
    expect(odp.dane).toEqual({ id: 'mama' });
    expect(odp.pochodzenie).toEqual([]);
    expect(odp.brakuje).toEqual([]);
  });
});

describe('błędy', () => {
  function blad(fn: () => unknown): BladSymulacji {
    try {
      fn();
    } catch (e) {
      if (e instanceof BladSymulacji) return e;
      throw e;
    }
    throw new Error('oczekiwano błędu');
  }

  it('nieznana persona → 404', () => {
    expect(blad(() => odpowiedzZrodla('ezus', 'nie-ma-takiej')).status).toBe(404);
  });

  it('nieznana osoba w personie → 404', () => {
    expect(blad(() => odpowiedzZrodla('ezus', 'anna-etat', 'tata')).status).toBe(404);
  });

  it('nieznane źródło → 400, także źródło, które nie jest e-usługą', () => {
    expect(blad(() => odpowiedzZrodla('pue' as never, 'anna-etat')).status).toBe(400);
    expect(blad(() => odpowiedzZrodla('uzytkownik', 'anna-etat')).status).toBe(400);
    expect(blad(() => odpowiedzZrodla('pracodawca', 'anna-etat')).status).toBe(400);
  });
});
