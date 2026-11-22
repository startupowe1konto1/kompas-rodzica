import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PDFCheckBox, PDFDocument, PDFName, PDFTextField } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { wypelnijZAM } from '../zam';
import { kluczZNazwy, opisPola, pelnaNazwaPola, POLA_ZAM, type KluczZAM } from '../zam-mapowanie';
import { BladWniosku } from '../wspolne';
import { DZIECKO2_DANE, DZIECKO_DANE, para, wzorzec } from './dane';

const WZOR = path.join(process.cwd(), 'materialy', 'ZUS', 'wzory-formularzy', 'ZAM_edytowalny.pdf');

// Każdy test wczytuje i zapisuje PDF (ok. 0,5 s); przy obciążonym komputerze 5 s domyślnego limitu to za mało.
vi.setConfig({ testTimeout: 30_000 });

/** Czyta wypełnione pola PDF: teksty i zaznaczone pola wyboru, po kluczach z mapowania. */
async function pola(pdf: Uint8Array) {
  const doc = await PDFDocument.load(pdf);
  const teksty: Partial<Record<KluczZAM, string>> = {};
  const zaznaczone: KluczZAM[] = [];
  for (const pole of doc.getForm().getFields()) {
    const klucz = kluczZNazwy(pole.getName());
    if (!klucz) continue;
    if (pole instanceof PDFTextField && pole.getText()) teksty[klucz] = pole.getText();
    if (pole instanceof PDFCheckBox && pole.isChecked()) zaznaczone.push(klucz);
  }
  return { doc, teksty, zaznaczone };
}

describe('mapowanie pól ZAM', () => {
  it('każde pole z mapowania jest we wzorze ZUS i odwrotnie (85 pól, zgodne typy)', async () => {
    const doc = await PDFDocument.load(readFileSync(WZOR));
    doc.catalog.getAcroForm()?.dict.delete(PDFName.of('XFA'));
    const wzor = new Map(doc.getForm().getFields().map((p) => [p.getName(), p]));
    const klucze = Object.keys(POLA_ZAM) as KluczZAM[];
    expect(klucze).toHaveLength(85);
    expect(wzor.size).toBe(85);
    for (const klucz of klucze) {
      const pole = wzor.get(pelnaNazwaPola(klucz));
      expect(pole, klucz).toBeDefined();
      expect(pole instanceof PDFCheckBox ? 'checkbox' : 'tekst', klucz).toBe(POLA_ZAM[klucz].typ);
      expect(kluczZNazwy(pelnaNazwaPola(klucz))).toBe(klucz);
    }
  });

  it('zgadza się z listą pól w docs/zam-pola.json', () => {
    const lista = JSON.parse(readFileSync(path.join(process.cwd(), 'docs', 'zam-pola.json'), 'utf8')) as {
      nazwa: string;
      skrot: string;
      typ: string;
      strona: number;
    }[];
    for (const p of lista) {
      const klucz = p.skrot as KluczZAM;
      expect(POLA_ZAM[klucz], p.skrot).toBeDefined();
      expect(pelnaNazwaPola(klucz)).toBe(p.nazwa);
      expect(POLA_ZAM[klucz].typ).toBe(p.typ);
      expect(POLA_ZAM[klucz].strona).toBe(p.strona);
    }
  });
});

describe('wypelnijZAM', () => {
  it('wzorzec: dane mamy, płatnik, okresy urlopów i data wypełnienia', async () => {
    const { pdf } = await wypelnijZAM(wzorzec());
    const { teksty, zaznaczone } = await pola(pdf);
    expect(teksty['Page1.Imie']).toBe('Anna');
    expect(teksty['Page1.Nazwisko']).toBe('Przykładowa');
    // Bez PESEL-u wpisujemy datę urodzenia (ddmmrrrr, pole z kratkami).
    expect(teksty['Page1.Dataurodzenia']).toBe('12051994');
    expect(teksty['Page1.PESEL']).toBeUndefined();
    expect(teksty['Page1.Nazwaplatnika']).toBe('Przykładowa Firma sp. z o.o.');
    expect(zaznaczone).toContain('Page2.macierzynskiego');
    expect(teksty['Page2.Okres']).toBe('od 01.12.2026 do 19.04.2027');
    expect(zaznaczone).toContain('Page2.rodzicielskiego');
    expect(teksty['Page2.Okres2']).toBe('od 20.04.2027 do 29.11.2027');
    expect(teksty['Page2.czesc']).toBe('1');
    expect(teksty['Page5.Data']).toBe('21112026');
    // Urlop zaczyna się w dniu porodu: okoliczność 1 (urodzenie), a nie 2 (przewidywana data).
    expect(zaznaczone).toContain('Page2.ZaznaczX1a');
    expect(zaznaczone).not.toContain('Page3._2');
    expect(zaznaczone).not.toContain('Page2.informuje');
  });

  it('wzorzec: braki są opisane po ludzku, bez nazw pól PDF', async () => {
    const { doUzupelnienia } = await wypelnijZAM(wzorzec());
    const tekst = doUzupelnienia.join('\n');
    expect(tekst).toMatch(/PESEL/);
    expect(tekst).toMatch(/NIP płatnika/);
    expect(tekst).toMatch(/adres/i);
    expect(tekst).toMatch(/[Dd]ane dziecka/);
    expect(tekst).toMatch(/podpis/i);
    expect(tekst).toMatch(/drugi rodzic/i);
    expect(tekst).not.toMatch(/Page\d|topmostSubform|\[0\]/);
    expect(new Set(doUzupelnienia).size).toBe(doUzupelnienia.length);
  });

  it('pełne dane: PESEL, adres, telefon, rachunek; data urodzenia zostaje pusta', async () => {
    const { pdf, doUzupelnienia } = await wypelnijZAM(para('mama'));
    const { teksty } = await pola(pdf);
    expect(teksty['Page1.PESEL']).toBe('94051212345');
    expect(teksty['Page1.Dataurodzenia']).toBeUndefined();
    expect(teksty['Page1.Ulica']).toBe('Słoneczna');
    expect(teksty['Page1.Numerdomu']).toBe('12');
    expect(teksty['Page1.Numerlokalu']).toBe('4');
    expect(teksty['Page1.Kodpocztowy']).toBe('00-950');
    expect(teksty['Page1.Poczta']).toBe('Łódź');
    expect(teksty['Page1.Numertelefonu']).toBe('600100200');
    expect(teksty['Page1.NIP']).toBe('5250001009');
    expect(teksty['Page2.Numerrachunku']).toBe('61109010140000071219812874');
    const tekst = doUzupelnienia.join('\n');
    expect(tekst).not.toMatch(/PESEL \(/);
    expect(tekst).not.toMatch(/NIP/);
    expect(tekst).not.toMatch(/rachunk/);
  });

  it('polskie znaki: „Żółć Łęcka-Święcicka” w nazwisku nie rzuca błędu i jest w wyniku', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].dane = { imie: 'Źdźbło', nazwisko: 'Żółć Łęcka-Święcicka' };
    const { pdf } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page1.Nazwisko']).toBe('Żółć Łęcka-Święcicka');
    expect(teksty['Page1.Imie']).toBe('Źdźbło');
  });

  it('urlop przed porodem: okoliczność 2 z przewidywaną datą porodu', async () => {
    const { pdf } = await wypelnijZAM(para('mama'));
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page3._2');
    expect(teksty['Page3.Data2a']).toBe('01122026');
    expect(zaznaczone).not.toContain('Page2.ZaznaczX1a');
    expect(teksty['Page2.Okres']).toBe('od 17.11.2026 do 05.04.2027');
  });

  it('po porodzie: okoliczność 1, dane dziecka zostają do uzupełnienia', async () => {
    const z = para('mama');
    z.rodzina.zdarzenie.przewidywana = false;
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page2.ZaznaczX1a');
    expect(zaznaczone).not.toContain('Page3._2');
    expect(teksty['Page3.Tekst1']).toBeUndefined();
    expect(doUzupelnienia.join('\n')).toMatch(/[Dd]ane dziecka/);
  });

  it('„Za życiem”: zaznaczone oświadczenie, imiona dzieci do uzupełnienia', async () => {
    const z = para('mama');
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.zdarzenie.dzieci = [{ zaZyciem: true }];
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page3.ZaznaczX1');
    expect(doUzupelnienia.join('\n')).toMatch(/Za życiem/);
  });

  it('rodzicielski przy dwojgu rodziców: strona 5 – TAK, okres i dane drugiego rodzica', async () => {
    const { pdf, doUzupelnienia } = await wypelnijZAM(para('mama'));
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page5.TAK');
    expect(zaznaczone).not.toContain('Page5.NIE');
    expect(teksty['Page5.Okres']).toBe('od 01.10.2027 do 02.12.2027');
    expect(teksty['Page5.PESEL']).toBe('92030354321');
    expect(teksty['Page5.Imie']).toBe('Piotr');
    expect(teksty['Page5.Nazwisko']).toBe('Przykładowy');
    expect(doUzupelnienia.join('\n')).not.toMatch(/drugi rodzic/i);
  });

  it('drugi rodzic bez rodzicielskiego w planie: strona 5 – NIE', async () => {
    const z = para('mama');
    z.plan.odcinki = z.plan.odcinki.filter((o) => o.id !== 'r2');
    const { pdf } = await wypelnijZAM(z);
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page5.NIE');
    expect(zaznaczone).not.toContain('Page5.TAK');
    expect(teksty['Page5.Okres']).toBeUndefined();
  });

  it('ojcowski: okres, część, płatnik taty; oświadczenie o innym tytule do uzupełnienia', async () => {
    const { pdf, doUzupelnienia } = await wypelnijZAM(para('tata', 'o1'));
    const { teksty, zaznaczone } = await pola(pdf);
    expect(teksty['Page1.Imie']).toBe('Piotr');
    expect(teksty['Page1.NIP']).toBe('1234563218');
    expect(teksty['Page1.Nazwaplatnika']).toBe('Mała Firma Kowalski');
    expect(zaznaczone).toContain('Page2.ojcowskiego');
    expect(teksty['Page2.Okres4']).toBe('od 07.12.2026 do 20.12.2026');
    expect(teksty['Page2.Numerlokalu2']).toBe('1');
    // Jeden odcinek we wniosku: żadnego innego okresu.
    expect(zaznaczone).not.toContain('Page2.rodzicielskiego');
    expect(zaznaczone).not.toContain('Page2.macierzynskiego');
    expect(zaznaczone).not.toContain('Page5.TAK2');
    expect(zaznaczone).not.toContain('Page5.NIE2');
    expect(doUzupelnienia.join('\n')).toMatch(/ojcowsk/);
  });

  it('wszystkie urlopy taty naraz: ojcowski i rodzicielski, drugi rodzic (mama) z rodzicielskim', async () => {
    const { pdf } = await wypelnijZAM(para('tata'));
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toEqual(expect.arrayContaining(['Page2.ojcowskiego', 'Page2.rodzicielskiego', 'Page5.TAK']));
    expect(teksty['Page2.Okres2']).toBe('od 01.10.2027 do 02.12.2027');
    expect(teksty['Page2.czesc']).toBe('2');
    expect(teksty['Page5.Okres']).toBe('od 06.04.2027 do 30.09.2027');
    expect(teksty['Page5.Imie']).toBe('Anna');
  });

  it('uzupełniający: wcześniak (30. tydzień, 1500 g) – kategoria 28–37 tyg. i > 1000 g, szpital, koniec macierzyńskiego', async () => {
    const z = para('mama');
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.zdarzenie.dzieci = [{ tydzienCiazy: 30, masaG: 1500, szpital: [{ od: '2026-12-01', do: '2027-01-10' }] }];
    z.plan.odcinki.push({ id: 'u1', osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-06', do: '2027-05-31' });
    z.odcinekId = 'u1';
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toEqual(expect.arrayContaining(['Page2.uzMacierzynskiego', 'Page3._4', 'Page3.przerwaniem4B']));
    expect(zaznaczone).not.toContain('Page3.skroceniem');
    expect(zaznaczone).not.toContain('Page3.przerwaniem4A');
    expect(teksty['Page2.Okres3']).toBe('od 06.04.2027 do 31.05.2027');
    expect(teksty['Page2.Data2']).toBe('05042027');
    expect(teksty['Page3.Tekst4a']).toBe('od 01.12.2026 do 10.01.2027');
    expect(doUzupelnienia.join('\n')).toMatch(/[Dd]ane dziecka/);
  });

  it('uzupełniający: poród przed 28. tygodniem i masa do 1000 g', async () => {
    const z = para('mama');
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.zdarzenie.dzieci = [{ tydzienCiazy: 26, masaG: 800 }];
    z.plan.odcinki.push({ id: 'u1', osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-06', do: '2027-05-31' });
    z.odcinekId = 'u1';
    const { zaznaczone } = await pola((await wypelnijZAM(z)).pdf);
    expect(zaznaczone).toContain('Page3.skroceniem');
  });

  it('przejęcie macierzyńskiego przez tatę po 14 tygodniach: okoliczność 5, skrócenie, data i dane matki', async () => {
    const z = para('tata');
    z.rodzina.zdarzenie.przewidywana = false;
    z.plan.odcinki = [
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08', tytulId: 'etat-1' },
      { id: 'm2', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19', tytulId: 'etat-t' },
    ];
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toEqual(expect.arrayContaining(['Page2.macierzynskiego', 'Page4._5', 'Page4.skroceniem']));
    expect(zaznaczone).not.toContain('Page2.ZaznaczX1a');
    expect(teksty['Page2.Okres']).toBe('od 09.03.2027 do 19.04.2027');
    expect(teksty['Page4.Data5']).toBe('09032027');
    expect(teksty['Page4.Tekst13']).toBe('Anna Przykładowa, PESEL 94051212345');
    expect(doUzupelnienia.join('\n')).toMatch(/[Dd]ane dziecka/);
  });

  it('przejęcie po śmierci matki: okoliczność 5, data zgonu', async () => {
    const z = para('tata');
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.osoby[0].zdrowie = { zgon: '2027-01-10' };
    z.plan.odcinki = [{ id: 'm2', osobaId: 'tata', typ: 'macierzynski', od: '2027-01-11', do: '2027-04-19' }];
    const { teksty, zaznaczone } = await pola((await wypelnijZAM(z)).pdf);
    expect(zaznaczone).toEqual(expect.arrayContaining(['Page4._5', 'Page4.smiercia']));
    expect(teksty['Page4.Data5']).toBe('10012027');
  });

  it('przysposobienie: okoliczność 1 – przyjęcie dziecka, data przyjęcia', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].rola = 'przyjmujacy';
    z.rodzina.zdarzenie = { typ: 'przysposobienie', data: '2026-10-05', przewidywana: false, dzieci: [{ dataUrodzenia: '2022-06-01' }] };
    z.plan.odcinki = [{ id: 'w1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-10-05', do: '2026-12-06' }];
    const { teksty, zaznaczone } = await pola((await wypelnijZAM(z)).pdf);
    expect(zaznaczone).toEqual(expect.arrayContaining(['Page2.nawarunkach', 'Page2.ZaznaczX1b']));
    expect(zaznaczone).not.toContain('Page2.ZaznaczX1a');
    expect(teksty['Page2.Data']).toBe('05102026');
    expect(teksty['Page2.Okres']).toBe('od 05.10.2026 do 06.12.2026');
  });

  it('poród po ustaniu zatrudnienia przez likwidację pracodawcy: okoliczność 3', async () => {
    const z = wzorzec();
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.osoby[0].tytuly[0].ustanie = { data: '2026-09-30', przyczyna: 'likwidacja' };
    const { zaznaczone } = await pola((await wypelnijZAM(z)).pdf);
    expect(zaznaczone).toEqual(expect.arrayContaining(['Page3._3', 'Page3.likwidacje']));
    expect(zaznaczone).not.toContain('Page2.ZaznaczX1a');
  });

  it('działalność z chorobowym: TAK w informacji o ubezpieczeniu; nazwa płatnika = imię i nazwisko', async () => {
    const z = wzorzec();
    const t = z.rodzina.osoby[0].tytuly[0];
    t.rodzaj = 'dzialalnosc';
    t.chorobowe = 'dobrowolne';
    delete t.nazwaPlatnika;
    const { teksty, zaznaczone } = await pola((await wypelnijZAM(z)).pdf);
    expect(zaznaczone).toContain('Page2.TAK');
    expect(zaznaczone).not.toContain('Page2.NIE');
    expect(teksty['Page1.Nazwaplatnika']).toBe('Anna Przykładowa');
  });

  it('etat: pytanie o działalność zostaje puste', async () => {
    const { zaznaczone } = await pola((await wypelnijZAM(wzorzec())).pdf);
    expect(zaznaczone).not.toContain('Page2.TAK');
    expect(zaznaczone).not.toContain('Page2.NIE');
  });

  it('wariant 81,5%: zaznaczona informacja o pełnym wymiarze urlopów', async () => {
    const z = wzorzec();
    z.plan.wariant815 = true;
    const { zaznaczone } = await pola((await wypelnijZAM(z)).pdf);
    expect(zaznaczone).toContain('Page2.informuje');
  });

  it('kilka części rodzicielskiego: każda w osobnej linii, numery części razem', async () => {
    const z = para('mama');
    z.plan.odcinki = z.plan.odcinki.filter((o) => o.osobaId === 'mama' && o.typ !== 'rodzicielski');
    z.plan.odcinki.push(
      { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-06', do: '2027-06-30', czescNr: 1 },
      { id: 'r3', osobaId: 'mama', typ: 'rodzicielski', od: '2027-09-01', do: '2027-10-31', czescNr: 2 },
    );
    const { teksty } = await pola((await wypelnijZAM(z)).pdf);
    expect(teksty['Page2.Okres2']).toBe('od 06.04.2027 do 30.06.2027\nod 01.09.2027 do 31.10.2027');
    expect(teksty['Page2.czesc']).toBe('1, 2');
  });

  it('błędy danych: nieznana osoba, odcinek innej osoby albo nieistniejący', async () => {
    await expect(wypelnijZAM({ ...wzorzec(), osobaId: 'ktos' })).rejects.toBeInstanceOf(BladWniosku);
    await expect(wypelnijZAM(para('mama', 'o1'))).rejects.toBeInstanceOf(BladWniosku);
    await expect(wypelnijZAM(para('mama', 'nie-ma'))).rejects.toBeInstanceOf(BladWniosku);
  });

  it('wynik nie ma XFA ani podpisu rozszerzeń Adobe (czytniki pokażą wpisane wartości)', async () => {
    const { pdf } = await wypelnijZAM(wzorzec());
    const doc = await PDFDocument.load(pdf);
    expect(doc.catalog.has(PDFName.of('Perms'))).toBe(false);
    expect(doc.catalog.getAcroForm()?.dict.has(PDFName.of('XFA'))).toBe(false);
    expect(doc.getPageCount()).toBe(7);
  });
});

describe('wypelnijZAM – pola z nowego kontraktu', () => {
  /** Poród już był (1.12.2026), dane dziecka znane. */
  function poPorodzie(osobaId: 'mama' | 'tata' = 'mama', odcinekId?: string) {
    const z = para(osobaId, odcinekId);
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.zdarzenie.dzieci = [{ dane: structuredClone(DZIECKO_DANE) }];
    return z;
  }

  it('dane dziecka: imię i nazwisko, data i miejsce urodzenia w okoliczności 1, bez braku', async () => {
    const { pdf, doUzupelnienia } = await wypelnijZAM(poPorodzie());
    const { teksty } = await pola(pdf);
    expect(teksty['Page3.Tekst1']).toBe('Jan Przykładowy, ur. 01.12.2026, Łódź');
    expect(doUzupelnienia.join('\n')).not.toMatch(/[Dd]ane dziecka/);
  });

  it('bliźnięta: dane każdego dziecka w osobnej linii', async () => {
    const z = poPorodzie();
    z.rodzina.zdarzenie.dzieci.push({ dane: structuredClone(DZIECKO2_DANE) });
    const { teksty } = await pola((await wypelnijZAM(z)).pdf);
    expect(teksty['Page3.Tekst1']).toBe('Jan Przykładowy, ur. 01.12.2026, Łódź\nZofia Maria Przykładowa, ur. 01.12.2026, Łódź');
  });

  it('niepełne dane dziecka: wpisujemy to, co wiemy, a brak mówi, czego brakuje', async () => {
    const z = poPorodzie();
    z.rodzina.zdarzenie.dzieci = [{ dane: { imie: 'Jan', nazwisko: 'Przykładowy' } }];
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page3.Tekst1']).toBe('Jan Przykładowy, ur. 01.12.2026');
    expect(doUzupelnienia.join('\n')).toMatch(/[Dd]ane dziecka.*miejsce urodzenia/);
  });

  it('przed porodem (okoliczność 1 przy przewidywanej dacie): data urodzenia dziecka zostaje do uzupełnienia', async () => {
    const z = wzorzec();
    z.rodzina.zdarzenie.dzieci = [{ dane: structuredClone(DZIECKO_DANE) }];
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page3.Tekst1']).toBe('Jan Przykładowy, Łódź');
    expect(doUzupelnienia.join('\n')).toMatch(/[Dd]ane dziecka.*data urodzenia/);
  });

  it('przysposobienie: data urodzenia dziecka z `Dziecko.dataUrodzenia`', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].rola = 'przyjmujacy';
    z.rodzina.zdarzenie = {
      typ: 'przysposobienie',
      data: '2026-10-05',
      przewidywana: false,
      dzieci: [{ dataUrodzenia: '2022-06-01', dane: { imie: 'Ola', nazwisko: 'Nowak', miejsceUrodzenia: 'Gdańsk' } }],
    };
    z.plan.odcinki = [{ id: 'w1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-10-05', do: '2026-12-06' }];
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page3.Tekst1']).toBe('Ola Nowak, ur. 01.06.2022, Gdańsk');
    expect(doUzupelnienia.join('\n')).not.toMatch(/[Dd]ane dziecka/);
  });

  it('„Za życiem” z imieniem dziecka: imię w polu oświadczenia, bez braku', async () => {
    const z = poPorodzie();
    z.rodzina.zdarzenie.dzieci[0].zaZyciem = true;
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty, zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page3.ZaznaczX1');
    expect(teksty['Page3.podajimie1']).toBe('Jan');
    expect(doUzupelnienia.join('\n')).not.toMatch(/Za życiem/);
  });

  it('uzupełniający: dane dziecka także na stronie 4', async () => {
    const z = poPorodzie();
    Object.assign(z.rodzina.zdarzenie.dzieci[0], { tydzienCiazy: 30, masaG: 1500, szpital: [{ od: '2026-12-01', do: '2027-01-10' }] });
    z.plan.odcinki.push({ id: 'u1', osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-06', do: '2027-05-31' });
    z.odcinekId = 'u1';
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page4.Tekst4c']).toBe('Jan Przykładowy, ur. 01.12.2026, Łódź');
    expect(doUzupelnienia.join('\n')).not.toMatch(/[Dd]ane dziecka/);
  });

  it('przejęcie przez tatę: dane dziecka w okoliczności 5', async () => {
    const z = poPorodzie('tata');
    z.plan.odcinki = [
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08' },
      { id: 'm2', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' },
    ];
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page4.Tekst4b']).toBe('Jan Przykładowy, ur. 01.12.2026, Łódź');
    expect(doUzupelnienia.join('\n')).not.toMatch(/[Dd]ane dziecka/);
  });

  it('przejęcie: matka bez PESEL-u – dokument tożsamości i data urodzenia w danych matki', async () => {
    const z = poPorodzie('tata');
    const mama = z.rodzina.osoby[0].dane!;
    delete mama.pesel;
    mama.dokumentTozsamosci = 'paszport AB1234567';
    z.plan.odcinki = [
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08' },
      { id: 'm2', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' },
    ];
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page4.Tekst13']).toBe('Anna Przykładowa, paszport AB1234567, ur. 12.05.1994');
    expect(doUzupelnienia.join('\n')).not.toMatch(/[Dd]ane matki/);
  });

  it('PESEL-u dziecka nie wpisujemy – formularz nie ma na niego miejsca', async () => {
    const { pdf } = await wypelnijZAM(poPorodzie());
    const { teksty } = await pola(pdf);
    expect(Object.values(teksty).join('\n')).not.toContain(DZIECKO_DANE.pesel);
  });

  it('płatnik bez NIP-u: REGON zamiast NIP-u, bez braku', async () => {
    const z = para('mama');
    const t = z.rodzina.osoby[0].tytuly[0];
    delete t.nipPlatnika;
    t.regonPlatnika = '123-456-785';
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page1.REGON']).toBe('123456785');
    expect(teksty['Page1.NIP']).toBeUndefined();
    expect(doUzupelnienia.join('\n')).not.toMatch(/NIP|REGON/);
  });

  it('płatnik z NIP-em: REGON zostaje pusty', async () => {
    const z = para('mama');
    z.rodzina.osoby[0].tytuly[0].regonPlatnika = '123456785';
    const { teksty } = await pola((await wypelnijZAM(z)).pdf);
    expect(teksty['Page1.NIP']).toBe('5250001009');
    expect(teksty['Page1.REGON']).toBeUndefined();
  });

  it('bez PESEL-u: dokument tożsamości i data urodzenia wnioskodawcy, bez braku PESEL-u', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].dane = { ...z.rodzina.osoby[0].dane, dokumentTozsamosci: 'paszport AB1234567' };
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page1.Rodzajseriainumerdokumentu']).toBe('paszport AB1234567');
    expect(teksty['Page1.Dataurodzenia']).toBe('12051994');
    expect(doUzupelnienia.join('\n')).not.toMatch(/PESEL wnioskodawcy/);
  });

  it('z PESEL-em: dokumentu tożsamości nie wpisujemy', async () => {
    const z = para('mama');
    z.rodzina.osoby[0].dane!.dokumentTozsamosci = 'paszport AB1234567';
    const { teksty } = await pola((await wypelnijZAM(z)).pdf);
    expect(teksty['Page1.Rodzajseriainumerdokumentu']).toBeUndefined();
  });

  it('drugi rodzic bez PESEL-u: dokument tożsamości i data urodzenia na stronie 5', async () => {
    const z = para('mama');
    const tata = z.rodzina.osoby[1].dane!;
    delete tata.pesel;
    tata.dokumentTozsamosci = 'dowód osobisty ABC123456';
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { teksty } = await pola(pdf);
    expect(teksty['Page5.Rodzajseriainumerdokumentu']).toBe('dowód osobisty ABC123456');
    expect(teksty['Page5.Dataurodzenia']).toBe('03031992');
    expect(teksty['Page5.PESEL']).toBeUndefined();
    expect(doUzupelnienia.join('\n')).not.toMatch(/drugiego rodzica/);
  });

  it('adres za granicą: nazwa państwa; Polska – pole puste', async () => {
    const z = para('mama');
    z.rodzina.osoby[0].dane!.adres = { ulica: 'Hauptstraße', nrDomu: '5', kod: '10115', miejscowosc: 'Berlin', panstwo: 'Niemcy' };
    const { teksty } = await pola((await wypelnijZAM(z)).pdf);
    expect(teksty['Page1.Nazwapaństwa']).toBe('Niemcy');
    const pl = para('mama');
    pl.rodzina.osoby[0].dane!.adres!.panstwo = 'Polska';
    expect((await pola((await wypelnijZAM(pl)).pdf)).teksty['Page1.Nazwapaństwa']).toBeUndefined();
  });

  it('ojcowski: oświadczenie „nie pobierałem zasiłku z innego tytułu” – NIE2, bez braku', async () => {
    const z = para('tata', 'o1');
    z.rodzina.osoby[1].oswiadczenia = { ojcowskiZInnegoTytulu: false };
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page5.NIE2');
    expect(zaznaczone).not.toContain('Page5.TAK2');
    expect(doUzupelnienia.join('\n')).not.toMatch(/ojcowsk/);
  });

  it('ojcowski: zasiłek z innego tytułu był – TAK2, tytuł i okres do uzupełnienia', async () => {
    const z = para('tata', 'o1');
    z.rodzina.osoby[1].oswiadczenia = { ojcowskiZInnegoTytulu: true };
    const { pdf, doUzupelnienia } = await wypelnijZAM(z);
    const { zaznaczone } = await pola(pdf);
    expect(zaznaczone).toContain('Page5.TAK2');
    expect(zaznaczone).not.toContain('Page5.NIE2');
    expect(doUzupelnienia).toContain(opisPola('Page5.Okres1'));
  });

  it('wniosek bez ojcowskiego: oświadczenia o ojcowskim nie zaznaczamy', async () => {
    const z = para('mama');
    z.rodzina.osoby[0].oswiadczenia = { ojcowskiZInnegoTytulu: false };
    const { zaznaczone } = await pola((await wypelnijZAM(z)).pdf);
    expect(zaznaczone).not.toContain('Page5.NIE2');
  });
});
