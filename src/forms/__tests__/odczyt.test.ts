import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PDFDocument, PDFName, StandardFonts } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { KOMUNIKAT_SKAN, odczytajWniosek } from '../odczyt';
import { BladWniosku } from '../wspolne';
import { wypelnijZAM } from '../zam';
import { opisPola, pelnaNazwaPola } from '../zam-mapowanie';
import { DZIECKO2_DANE, DZIECKO_DANE, MAMA_DANE, para, wzorzec } from './dane';

const WZOR = path.join(process.cwd(), 'materialy', 'ZUS', 'wzory-formularzy', 'ZAM_edytowalny.pdf');

// Każdy test wczytuje i zapisuje PDF (ok. 0,5 s); przy obciążonym komputerze 5 s domyślnego limitu to za mało.
vi.setConfig({ testTimeout: 30_000 });

describe('odczytajWniosek', () => {
  it('w obie strony: ZAM wypełniony przez aplikację wraca z tymi samymi danymi', async () => {
    const { pdf } = await wypelnijZAM(para('mama'));
    const w = await odczytajWniosek(pdf);
    expect(w.rozpoznano).toBe(true);
    expect(w.formularz).toBe('ZAM');
    // Przy PESEL-u data urodzenia nie trafia do ZAM; rachunek wraca bez spacji.
    const { dataUrodzenia: _pominieta, ...bezDaty } = MAMA_DANE;
    void _pominieta;
    expect(w.osoba?.dane).toEqual({ ...bezDaty, rachunekBankowy: '61109010140000071219812874' });
    expect(w.zdarzenie).toEqual({ typ: 'porod', data: '2026-12-01', przewidywana: true });
    expect(w.pochodzenie.length).toBeGreaterThan(0);
    expect(w.pochodzenie.every((p) => p.zrodlo === 'formularz_pdf')).toBe(true);
    expect(w.pochodzenie.map((p) => p.sciezka)).toEqual(
      expect.arrayContaining(['osoby[{osoba}].dane.pesel', 'osoby[{osoba}].dane.adres.miejscowosc', 'zdarzenie.data']),
    );
    // Okresy urlopów, płatnik i drugi rodzic mają już miejsce w odpowiedzi.
    expect(w.nieodczytane).not.toEqual(
      expect.arrayContaining([opisPola('Page2.Okres'), opisPola('Page1.NIP'), opisPola('Page5.Imie')]),
    );
    // Informacji o drugim rodzicu (TAK i okres jego zasiłku) nie ma gdzie przenieść – lista po ludzku.
    expect(w.nieodczytane).toEqual(expect.arrayContaining([opisPola('Page5.TAK'), opisPola('Page5.Okres')]));
    expect(w.nieodczytane.join('\n')).not.toMatch(/topmostSubform|\[0\]/);
    expect(w.komunikat).toBeTruthy();
  });

  it('w obie strony: płatnik, drugi rodzic, okresy urlopów, wariant 81,5%, dane dzieci i „Za życiem”', async () => {
    const z = para('mama');
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.zdarzenie.dzieci = [{ dane: structuredClone(DZIECKO_DANE), zaZyciem: true }, { dane: structuredClone(DZIECKO2_DANE) }];
    z.plan.wariant815 = true;
    const w = await odczytajWniosek((await wypelnijZAM(z)).pdf);
    expect(w.platnik).toEqual({ nazwa: 'Przykładowa Firma sp. z o.o.', nip: '5250001009' });
    expect(w.drugaOsoba).toEqual({ dane: { imie: 'Piotr', nazwisko: 'Przykładowy', pesel: '92030354321' } });
    expect(w.odcinki).toEqual([
      { osobaId: '{osoba}', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05' },
      { osobaId: '{osoba}', typ: 'rodzicielski', od: '2027-04-06', do: '2027-09-30', czescNr: 1 },
    ]);
    expect(w.wariant815).toBe(true);
    // PESEL-u dziecka ZAM nie ma, więc nie wraca.
    expect(w.zdarzenie).toEqual({
      typ: 'porod',
      data: '2026-12-01',
      przewidywana: false,
      dzieci: [
        { dane: { imie: 'Jan', nazwisko: 'Przykładowy', miejsceUrodzenia: 'Łódź' }, zaZyciem: true },
        { dane: { imie: 'Zofia Maria', nazwisko: 'Przykładowa', miejsceUrodzenia: 'Łódź' } },
      ],
    });
    expect(w.pochodzenie.map((p) => p.sciezka)).toEqual(
      expect.arrayContaining([
        'osoby[{osoba}].tytuly[{tytul}].nipPlatnika',
        'osoby[{drugaOsoba}].dane.pesel',
        'zdarzenie.dzieci[1].dane.imie',
        'zdarzenie.dzieci[0].zaZyciem',
      ]),
    );
    for (const k of ['Page1.NIP', 'Page1.Nazwaplatnika', 'Page2.Okres', 'Page2.Okres2', 'Page2.czesc', 'Page2.informuje', 'Page3.Tekst1', 'Page3.podajimie1', 'Page5.PESEL'] as const) {
      expect(w.nieodczytane, k).not.toContain(opisPola(k));
    }
  });

  it('w obie strony: ojcowski – oświadczenie, dokument tożsamości, państwo; REGON zostaje na liście', async () => {
    const z = para('tata', 'o1');
    const tata = z.rodzina.osoby[1];
    tata.oswiadczenia = { ojcowskiZInnegoTytulu: false };
    delete tata.dane!.pesel;
    tata.dane!.dokumentTozsamosci = 'paszport AB1234567';
    tata.dane!.adres = { ulica: 'Hauptstraße', nrDomu: '5', kod: '10115', miejscowosc: 'Berlin', panstwo: 'Niemcy' };
    delete tata.tytuly[0].nipPlatnika;
    tata.tytuly[0].regonPlatnika = '123456785';
    const w = await odczytajWniosek((await wypelnijZAM(z)).pdf);
    expect(w.osoba).toEqual({
      dane: {
        imie: 'Piotr',
        nazwisko: 'Przykładowy',
        dataUrodzenia: '1992-03-03',
        dokumentTozsamosci: 'paszport AB1234567',
        adres: { ulica: 'Hauptstraße', nrDomu: '5', kod: '10115', miejscowosc: 'Berlin', panstwo: 'Niemcy' },
      },
      oswiadczenia: { ojcowskiZInnegoTytulu: false },
    });
    expect(w.platnik).toEqual({ nazwa: 'Mała Firma Kowalski' });
    expect(w.odcinki).toEqual([{ osobaId: '{osoba}', typ: 'ojcowski', od: '2026-12-07', do: '2026-12-20', czescNr: 1 }]);
    expect(w.wariant815).toBeUndefined();
    expect(w.drugaOsoba).toBeUndefined();
    // Kontrakt nie ma REGON-u płatnika w odpowiedzi odczytu.
    expect(w.nieodczytane).toContain(opisPola('Page1.REGON'));
    expect(w.nieodczytane).not.toContain(opisPola('Page5.NIE2'));
  });

  it('w obie strony: przejęcie przez tatę – dane matki ze strony 4 jako druga osoba', async () => {
    const z = para('tata');
    z.rodzina.zdarzenie.przewidywana = false;
    z.plan.odcinki = [
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08' },
      { id: 'm2', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' },
    ];
    const w = await odczytajWniosek((await wypelnijZAM(z)).pdf);
    expect(w.drugaOsoba).toEqual({ rola: 'matka', dane: { imie: 'Anna', nazwisko: 'Przykładowa', pesel: '94051212345' } });
    expect(w.odcinki).toEqual([{ osobaId: '{osoba}', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' }]);
    expect(w.nieodczytane).not.toContain(opisPola('Page4.Tekst13'));
  });

  it('w obie strony: przysposobienie – dziecko z datą urodzenia', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].rola = 'przyjmujacy';
    z.rodzina.zdarzenie = {
      typ: 'przysposobienie',
      data: '2026-10-05',
      przewidywana: false,
      dzieci: [{ dataUrodzenia: '2022-06-01', dane: { imie: 'Ola', nazwisko: 'Nowak', miejsceUrodzenia: 'Gdańsk' } }],
    };
    z.plan.odcinki = [{ id: 'w1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-10-05', do: '2026-12-06' }];
    const w = await odczytajWniosek((await wypelnijZAM(z)).pdf);
    expect(w.zdarzenie?.dzieci).toEqual([
      { dataUrodzenia: '2022-06-01', dane: { imie: 'Ola', nazwisko: 'Nowak', miejsceUrodzenia: 'Gdańsk' } },
    ]);
    expect(w.odcinki).toEqual([{ osobaId: '{osoba}', typ: 'na_warunkach_macierzynskiego', od: '2026-10-05', do: '2026-12-06' }]);
  });

  it('w obie strony: polskie znaki i data urodzenia bez PESEL-u', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].dane = { imie: 'Źdźbło', nazwisko: 'Żółć Łęcka-Święcicka', dataUrodzenia: '1994-05-12' };
    const w = await odczytajWniosek((await wypelnijZAM(z)).pdf);
    expect(w.osoba?.dane).toEqual({ imie: 'Źdźbło', nazwisko: 'Żółć Łęcka-Święcicka', dataUrodzenia: '1994-05-12' });
    // Poród w dniu początku urlopu: okoliczność „urodzenie dziecka” – bez daty dziecka (dane dziecka wpisuje rodzic).
    expect(w.zdarzenie).toEqual({ typ: 'porod', przewidywana: false });
  });

  it('przysposobienie: typ zdarzenia i data przyjęcia dziecka', async () => {
    const z = wzorzec();
    z.rodzina.zdarzenie = { typ: 'przysposobienie', data: '2026-10-05', przewidywana: false, dzieci: [{}] };
    z.plan.odcinki = [{ id: 'w1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-10-05', do: '2026-12-06' }];
    const w = await odczytajWniosek((await wypelnijZAM(z)).pdf);
    expect(w.zdarzenie).toEqual({ typ: 'przysposobienie', data: '2026-10-05', przewidywana: false });
  });

  it('„Za życiem” wraca jako cecha dziecka', async () => {
    const z = para('mama');
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.zdarzenie.dzieci = [{ zaZyciem: true }];
    const w = await odczytajWniosek((await wypelnijZAM(z)).pdf);
    expect(w.zdarzenie?.dzieci).toEqual([{ zaZyciem: true }]);
  });

  it('dane dziecka wpisane ręcznie w „Dane dziecka” trafiają do zdarzenia (data, imię, nazwisko, miejsce)', async () => {
    const doc = await PDFDocument.load(readFileSync(WZOR));
    doc.catalog.getAcroForm()?.dict.delete(PDFName.of('XFA'));
    const form = doc.getForm();
    form.getCheckBox(pelnaNazwaPola('Page2.ZaznaczX1a')).check();
    form.getTextField(pelnaNazwaPola('Page2.Okres')).setText('17.11.2026 - 5.04.2027');
    form.getCheckBox(pelnaNazwaPola('Page2.macierzynskiego')).check();
    form.getTextField(pelnaNazwaPola('Page3.Tekst1')).setText('Jan Przykladowy, 3.12.2026, Lodz');
    const w = await odczytajWniosek(await doc.save());
    expect(w.zdarzenie).toEqual({
      typ: 'porod',
      data: '2026-12-03',
      przewidywana: false,
      dzieci: [{ dane: { imie: 'Jan', nazwisko: 'Przykladowy', miejsceUrodzenia: 'Lodz' } }],
    });
    expect(w.odcinki).toEqual([{ osobaId: '{osoba}', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05' }]);
  });

  it('okres, którego nie da się odczytać (data końca przed początkiem), zostaje na liście', async () => {
    const doc = await PDFDocument.load(readFileSync(WZOR));
    doc.catalog.getAcroForm()?.dict.delete(PDFName.of('XFA'));
    const form = doc.getForm();
    form.getCheckBox(pelnaNazwaPola('Page2.rodzicielskiego')).check();
    form.getTextField(pelnaNazwaPola('Page2.Okres2')).setText('od 30.09.2027 do 06.04.2027');
    const w = await odczytajWniosek(await doc.save());
    expect(w.odcinki).toBeUndefined();
    expect(w.nieodczytane).toContain(opisPola('Page2.Okres2'));
  });

  it('pusty wzór ZAM: rozpoznany, bez danych', async () => {
    const w = await odczytajWniosek(new Uint8Array(readFileSync(WZOR)));
    expect(w.rozpoznano).toBe(true);
    expect(w.formularz).toBe('ZAM');
    expect(w.osoba).toBeUndefined();
    expect(w.zdarzenie).toBeUndefined();
    expect(w.pochodzenie).toEqual([]);
    expect(w.nieodczytane).toEqual([]);
  });

  it('PDF bez pól formularza (skan, wydruk): rozpoznano = false i prośba o przepisanie', async () => {
    const doc = await PDFDocument.create();
    const strona = doc.addPage();
    strona.drawText('Wniosek ZAM (skan)', { font: await doc.embedFont(StandardFonts.Helvetica) });
    const w = await odczytajWniosek(await doc.save());
    expect(w.rozpoznano).toBe(false);
    expect(w.komunikat).toBe(KOMUNIKAT_SKAN);
    expect(KOMUNIKAT_SKAN).toBe('To wygląda na skan. Nie czytamy pisma odręcznego – proszę przepisać dane do formularza, to zajmie chwilę.');
    expect(w.pochodzenie).toEqual([]);
    expect(w.nieodczytane).toEqual([]);
  });

  it('inny formularz PDF z polami: rozpoznany jako nieznany, nic nie przenosimy', async () => {
    const doc = await PDFDocument.create();
    const strona = doc.addPage();
    doc.getForm().createTextField('imie').addToPage(strona);
    doc.getForm().getTextField('imie').setText('Anna');
    const w = await odczytajWniosek(await doc.save());
    expect(w.rozpoznano).toBe(true);
    expect(w.formularz).toBe('nieznany');
    expect(w.osoba).toBeUndefined();
    expect(w.nieodczytane).toEqual(['imie']);
  });

  it('plik, który nie jest PDF-em: błąd danych', async () => {
    const tekst = new TextEncoder().encode('To jest zwykły plik tekstowy, a nie PDF.');
    await expect(odczytajWniosek(tekst)).rejects.toBeInstanceOf(BladWniosku);
    await expect(odczytajWniosek(new Uint8Array())).rejects.toBeInstanceOf(BladWniosku);
  });

  it('uszkodzony PDF: błąd danych z komunikatem', async () => {
    const uszkodzony = new TextEncoder().encode('%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n%%EOF urwane');
    await expect(odczytajWniosek(uszkodzony)).rejects.toThrow(/uszkodzony/);
    const urwany = new Uint8Array(readFileSync(WZOR)).slice(0, 2000);
    await expect(odczytajWniosek(urwany)).rejects.toBeInstanceOf(BladWniosku);
  });
});
