/**
 * D5: wnioski do pracodawcy. Treść według rozporządzenia Dz.U. 2025 poz. 322 (dalej „rozp.”);
 * wniosek o wariant 81,5% – UZ art. 30a. Testy sprawdzają obecność wymaganych elementów.
 */
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import type { KodDokumentu, ZapytanieWniosek } from '../../engine/types';
import { KODY_PRACODAWCA, wniosekDoPracodawcy } from '../pracodawca';
import { BladWniosku } from '../wspolne';
import { DZIECKO2_DANE, DZIECKO_DANE, para, wzorzec } from './dane';

vi.setConfig({ testTimeout: 30_000 });

async function wniosek(kod: KodDokumentu, z: ZapytanieWniosek) {
  const w = await wniosekDoPracodawcy(kod, z);
  return { ...w, tekst: w.tresc.join('\n') };
}

/** Tata przejmuje urlop macierzyński po 14 tygodniach mamy (poród już był). */
function przejecie(osobaId: 'mama' | 'tata'): ZapytanieWniosek {
  const z = para(osobaId);
  z.rodzina.zdarzenie.przewidywana = false;
  z.plan.odcinki = [
    { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08' },
    { id: 'm2', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' },
  ];
  return z;
}

/** Mama przyjmuje dziecko (ur. 2022-06-01) na wychowanie i występuje o przysposobienie (2026-10-05). */
function przysposobienie(): ZapytanieWniosek {
  const z = para('mama');
  z.rodzina.osoby[0].rola = 'przyjmujacy';
  z.rodzina.zdarzenie = {
    typ: 'przysposobienie',
    data: '2026-10-05',
    przewidywana: false,
    dzieci: [{ dataUrodzenia: '2022-06-01', dane: { imie: 'Ola', nazwisko: 'Nowak', miejsceUrodzenia: 'Gdańsk' } }],
  };
  z.plan.odcinki = [{ id: 'w1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-10-05', do: '2026-12-06' }];
  return z;
}

describe('wniosekDoPracodawcy – elementy wspólne', () => {
  it('lista kodów obejmuje 8 wniosków z ZADANIA (D5) i wniosek o urlop na warunkach macierzyńskiego', () => {
    expect([...KODY_PRACODAWCA].sort()).toEqual(
      [
        'wniosek_na_warunkach_macierzynskiego',
        'wniosek_rodzicielski',
        'wniosek_ojcowski',
        'wniosek_rezygnacja_matki',
        'wniosek_przejecie_macierzynskiego',
        'wniosek_uzupelniajacy',
        'wniosek_laczenie_z_praca',
        'wniosek_macierzynski_przed_porodem',
        'wniosek_815',
      ].sort(),
    );
  });

  it('każdy wniosek: imię i nazwisko, miejscowość i data, pracodawca, podpis; PDF na jednej stronie A4', async () => {
    const zapytania: Record<(typeof KODY_PRACODAWCA)[number], ZapytanieWniosek> = {
      wniosek_macierzynski_przed_porodem: para('mama', 'm1'),
      wniosek_rodzicielski: para('mama', 'r1'),
      wniosek_rezygnacja_matki: przejecie('mama'),
      wniosek_przejecie_macierzynskiego: przejecie('tata'),
      wniosek_uzupelniajacy: (() => {
        const z = para('mama');
        z.plan.odcinki.push({ id: 'u1', osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-06', do: '2027-05-31' });
        return { ...z, odcinekId: 'u1' };
      })(),
      wniosek_ojcowski: para('tata', 'o1'),
      wniosek_laczenie_z_praca: (() => {
        const z = para('mama', 'r1');
        z.plan.odcinki.find((o) => o.id === 'r1')!.wymiarPracy = 0.5;
        return z;
      })(),
      wniosek_815: (() => {
        const z = para('mama');
        z.plan.wariant815 = true;
        return z;
      })(),
      wniosek_na_warunkach_macierzynskiego: przysposobienie(),
    };
    for (const kod of KODY_PRACODAWCA) {
      const z = zapytania[kod];
      const osoba = z.rodzina.osoby.find((o) => o.id === z.osobaId)!;
      const { tekst, pdf, doUzupelnienia } = await wniosek(kod, z);
      expect(tekst, kod).toContain(`${osoba.dane!.imie} ${osoba.dane!.nazwisko}`);
      expect(tekst, kod).toContain('21.11.2026');
      expect(tekst, kod).toContain(osoba.dane!.adres?.miejscowosc ?? '…');
      expect(tekst, kod).toMatch(/podpis/i);
      expect(tekst, kod).toMatch(/Załączniki/);
      const doc = await PDFDocument.load(pdf);
      expect(doc.getPageCount(), kod).toBe(1);
      expect(doUzupelnienia.join('\n'), kod).not.toMatch(/osobaId|odcinek|undefined/);
    }
  });

  it('polskie znaki w nazwisku nie psują PDF-u', async () => {
    const z = para('mama', 'r1');
    z.rodzina.osoby[0].dane!.nazwisko = 'Żółć Łęcka-Święcicka';
    const { tekst, pdf } = await wniosek('wniosek_rodzicielski', z);
    expect(tekst).toContain('Anna Żółć Łęcka-Święcicka');
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });

  it('nieznane dane: luki „…” w treści i opis po ludzku w doUzupelnienia', async () => {
    const z = wzorzec();
    z.odcinekId = 'r1';
    const { tekst, doUzupelnienia } = await wniosek('wniosek_rodzicielski', z);
    expect(tekst).toContain('……');
    expect(doUzupelnienia.join('\n')).toMatch(/[Mm]iejscowość/);
    expect(doUzupelnienia.join('\n')).toMatch(/[Ii]mię i nazwisko dziecka/);
  });

  it('kod spoza listy (ZAM, Z-3) albo osoba spoza rodziny: błąd danych', async () => {
    await expect(wniosekDoPracodawcy('ZAM', wzorzec())).rejects.toBeInstanceOf(BladWniosku);
    await expect(wniosekDoPracodawcy('Z-3', wzorzec())).rejects.toBeInstanceOf(BladWniosku);
    await expect(wniosekDoPracodawcy('wniosek_rodzicielski', { ...wzorzec(), osobaId: 'x' })).rejects.toBeInstanceOf(
      BladWniosku,
    );
  });
});

describe('wniosekDoPracodawcy – elementy wymagane rozporządzeniem', () => {
  it('część macierzyńskiego przed porodem (rozp. § 2): data początku, zaświadczenie lekarskie', async () => {
    const { tekst } = await wniosek('wniosek_macierzynski_przed_porodem', para('mama', 'm1'));
    expect(tekst).toContain('art. 180 § 2');
    expect(tekst).toContain('od dnia 17.11.2026');
    expect(tekst).toContain('01.12.2026'); // przewidywana data porodu
    expect(tekst).toMatch(/[Kk]opia zaświadczenia lekarskiego.*przewidywan/);
  });

  it('rodzicielski (rozp. § 15): okres, dotychczas wykorzystany urlop i liczba części, oświadczenie o drugim rodzicu, odpis aktu', async () => {
    const { tekst } = await wniosek('wniosek_rodzicielski', para('mama', 'r1'));
    expect(tekst).toContain('art. 182¹d § 1');
    expect(tekst).toContain('od 06.04.2027 do 30.09.2027');
    expect(tekst).toMatch(/[Dd]otychczas wykorzystany urlop rodzicielski: brak/);
    expect(tekst).toMatch(/[Ll]iczba wykorzystanych części: 0/);
    expect(tekst).toMatch(/drugi rodzic dziecka nie zamierza korzystać z urlopu rodzicielskiego/);
    expect(tekst).toMatch(/[Oo]dpis skrócony aktu urodzenia/);
    expect(tekst).not.toMatch(/Za życiem/);
  });

  it('rodzicielski – trzecia część: części obojga rodziców razem i okres drugiego rodzica w okresie wniosku', async () => {
    const z = para('mama');
    z.plan.odcinki.push({ id: 'r3', osobaId: 'mama', typ: 'rodzicielski', od: '2027-11-01', do: '2027-12-31', czescNr: 3 });
    z.odcinekId = 'r3';
    const { tekst } = await wniosek('wniosek_rodzicielski', z);
    expect(tekst).toContain('od 06.04.2027 do 30.09.2027'); // część mamy
    expect(tekst).toMatch(/od 01\.10\.2027 do 02\.12\.2027 \(drugi rodzic\)/); // część taty, zaczęta wcześniej
    // KP art. 182¹d § 2; limit 5 części dotyczy obojga rodziców razem (odpowiedź ZUS na pytania 35 i 39)
    expect(tekst).toMatch(/[Ll]iczba wykorzystanych części: 2/);
    expect(tekst).toMatch(/drugi rodzic dziecka zamierza korzystać z urlopu rodzicielskiego.*od 01\.11\.2027 do 02\.12\.2027/);
  });

  it('rodzicielski – część taty liczy też wcześniejszą część mamy', async () => {
    const { tekst } = await wniosek('wniosek_rodzicielski', para('tata', 'r2'));
    expect(tekst).toContain('(część 2)');
    expect(tekst).toMatch(/od 06\.04\.2027 do 30\.09\.2027 \(drugi rodzic\)/);
    expect(tekst).toMatch(/[Ll]iczba wykorzystanych części: 1/);
  });

  it('rodzicielski z „Za życiem”: kopia zaświadczenia w załącznikach', async () => {
    const z = para('mama', 'r1');
    z.rodzina.zdarzenie.dzieci = [{ zaZyciem: true }];
    const { tekst } = await wniosek('wniosek_rodzicielski', z);
    expect(tekst).toMatch(/[Kk]opia zaświadczenia.*„Za życiem”/);
  });

  it('rodzicielski przy przysposobieniu: oświadczenie o dacie przyjęcia i dokument z sądu', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].rola = 'przyjmujacy';
    z.rodzina.zdarzenie = { typ: 'przysposobienie', data: '2026-10-05', przewidywana: false, dzieci: [{ dataUrodzenia: '2022-06-01' }] };
    z.odcinekId = 'r1';
    const { tekst } = await wniosek('wniosek_rodzicielski', z);
    expect(tekst).toMatch(/przyjęci[ae].*05\.10\.2026/);
    expect(tekst).toMatch(/sąd/);
  });

  it('rezygnacja matki (rozp. § 3): termin powrotu do pracy, kopia wniosku ojca', async () => {
    const { tekst } = await wniosek('wniosek_rezygnacja_matki', przejecie('mama'));
    expect(tekst).toContain('art. 180 § 8');
    expect(tekst).toMatch(/wracam do pracy od dnia 09\.03\.2027/);
    expect(tekst).toMatch(/[Kk]opia wniosku ojca dziecka/);
  });

  it('rezygnacja matki z orzeczeniem (rozp. § 4): kopia orzeczenia', async () => {
    const z = przejecie('mama');
    z.rodzina.osoby[0].zdrowie = { orzeczenieNiezdolnosciSamodzielnejEgzystencji: true };
    const { tekst } = await wniosek('wniosek_rezygnacja_matki', z);
    expect(tekst).toMatch(/[Kk]opia prawomocnego orzeczenia o niezdolności do samodzielnej egzystencji/);
  });

  it('przejęcie przez ojca (rozp. § 5): dane dziecka, oświadczenie o urlopie przed porodem, okres, załączniki', async () => {
    const { tekst, doUzupelnienia } = await wniosek('wniosek_przejecie_macierzynskiego', przejecie('tata'));
    expect(tekst).toContain('art. 180 § 9');
    expect(tekst).toContain('Piotr Przykładowy');
    expect(tekst).toContain('od 09.03.2027 do 19.04.2027');
    expect(tekst).toMatch(/[Dd]ata urodzenia dziecka: 01\.12\.2026/);
    expect(tekst).toMatch(/przed porodem.*nie wykorzystała/);
    expect(tekst).toMatch(/[Oo]dpis skrócony aktu urodzenia/);
    expect(tekst).toMatch(/[Oo]świadczenie matki dziecka o zamiarze rezygnacji/);
    expect(doUzupelnienia.join('\n')).toMatch(/[Ii]mię i nazwisko dziecka/);
  });

  it('przejęcie – matka zaczęła urlop przed porodem: okres przed porodem w oświadczeniu', async () => {
    const z = przejecie('tata');
    z.plan.odcinki[0].od = '2026-11-17';
    const { tekst } = await wniosek('wniosek_przejecie_macierzynskiego', z);
    expect(tekst).toMatch(/przed porodem.*od 17\.11\.2026 do 30\.11\.2026/);
  });

  it('przejęcie po śmierci matki (rozp. § 8): oświadczenie o dacie zgonu', async () => {
    const z = przejecie('tata');
    z.rodzina.osoby[0].zdrowie = { zgon: '2027-01-10' };
    z.plan.odcinki = [{ id: 'm2', osobaId: 'tata', typ: 'macierzynski', od: '2027-01-11', do: '2027-04-19' }];
    const { tekst } = await wniosek('wniosek_przejecie_macierzynskiego', z);
    expect(tekst).toMatch(/zgon.*10\.01\.2027|10\.01\.2027.*zgon|zmarła.*10\.01\.2027/);
    expect(tekst).toContain('od dnia 11.01.2027');
  });

  it('przejęcie, gdy matka jest w szpitalu (rozp. § 6): zobowiązanie do informacji o wypisie, zaświadczenie ze szpitala', async () => {
    const z = przejecie('tata');
    z.rodzina.osoby[0].zdrowie = { pobytWSzpitalu: [{ od: '2027-03-09', do: '2027-03-31' }] };
    const { tekst } = await wniosek('wniosek_przejecie_macierzynskiego', z);
    expect(tekst).toMatch(/poinformowa.*opuszczeni|wypis/);
    expect(tekst).toMatch(/[Zz]aświadczenie o terminie przyjęcia/);
  });

  it('uzupełniający (rozp. § 14): koniec macierzyńskiego, okres, zaświadczenie ze szpitala, oświadczenie o drugim rodzicu', async () => {
    const z = para('mama');
    z.plan.odcinki.push({ id: 'u1', osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-06', do: '2027-05-31' });
    z.odcinekId = 'u1';
    const { tekst } = await wniosek('wniosek_uzupelniajacy', z);
    expect(tekst).toContain('art. 180² § 4');
    expect(tekst).toMatch(/[Uu]rlop macierzyński kończy się 05\.04\.2027/);
    expect(tekst).toContain('od 06.04.2027 do 31.05.2027');
    expect(tekst).toMatch(/[Zz]aświadczenie ze szpitala/);
    expect(tekst).toMatch(/drugi rodzic dziecka nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego/);
  });

  it('ojcowski (rozp. § 17): okres, oświadczenie o wcześniejszym urlopie ojcowskim, odpis aktu', async () => {
    const { tekst } = await wniosek('wniosek_ojcowski', para('tata', 'o1'));
    expect(tekst).toContain('art. 182³ § 2');
    expect(tekst).toContain('od 07.12.2026 do 20.12.2026');
    expect(tekst).toMatch(/nie korzystałem dotychczas z urlopu ojcowskiego/);
    expect(tekst).toMatch(/[Oo]dpis skrócony aktu urodzenia/);
  });

  it('ojcowski – druga część: oświadczenie z okresem pierwszej części', async () => {
    const z = para('tata');
    z.plan.odcinki.push({ id: 'o2', osobaId: 'tata', typ: 'ojcowski', od: '2027-06-01', do: '2027-06-07', czescNr: 2 });
    z.odcinekId = 'o2';
    const { tekst } = await wniosek('wniosek_ojcowski', z);
    expect(tekst).toMatch(/korzystałem z urlopu ojcowskiego od 07\.12\.2026 do 20\.12\.2026/);
  });

  it('łączenie z pracą (rozp. § 16): wymiar czasu pracy, okres, oświadczenie o części z wydłużenia', async () => {
    const z = para('mama', 'r1');
    z.plan.odcinki.find((o) => o.id === 'r1')!.wymiarPracy = 0.5;
    const { tekst, doUzupelnienia } = await wniosek('wniosek_laczenie_z_praca', z);
    expect(tekst).toContain('art. 182¹e § 2');
    expect(tekst).toContain('1/2 etatu');
    expect(tekst).toContain('od 06.04.2027 do 30.09.2027');
    expect(tekst).toMatch(/proporcjonalnego wydłużenia/);
    expect(doUzupelnienia.join('\n')).toMatch(/wydłuż/);
  });

  it('wariant 81,5% (UZ art. 30a): pełny wymiar urlopów, data porodu, okresy', async () => {
    const z = para('mama');
    z.rodzina.zdarzenie.przewidywana = false;
    z.plan.wariant815 = true;
    const { tekst } = await wniosek('wniosek_815', z);
    expect(tekst).toContain('art. 30a ust. 1');
    expect(tekst).toMatch(/w pełnym wymiarze/);
    expect(tekst).toMatch(/[Dd]ata porodu: 01\.12\.2026/);
    expect(tekst).toContain('od 17.11.2026 do 05.04.2027');
    expect(tekst).toContain('od 06.04.2027 do 30.09.2027');
  });

  it('wariant 81,5% składa matka albo osoba przyjmująca dziecko – nie ojciec', async () => {
    await expect(wniosekDoPracodawcy('wniosek_815', para('tata'))).rejects.toBeInstanceOf(BladWniosku);
  });

  it('na warunkach macierzyńskiego – przysposobienie (rozp. § 18): imię i nazwisko, dziecko z datą urodzenia, okres, dokumenty z sądu', async () => {
    const { tekst, doUzupelnienia } = await wniosek('wniosek_na_warunkach_macierzynskiego', przysposobienie());
    expect(tekst).toContain('art. 183 § 1¹');
    expect(tekst).toContain('Anna Przykładowa');
    expect(tekst).toMatch(/urlopu na warunkach urlopu macierzyńskiego od 05\.10\.2026 do 06\.12\.2026/);
    expect(tekst).toMatch(/Ola Nowak, data urodzenia dziecka: 01\.06\.2022/);
    expect(tekst).toMatch(/przysposobienia/);
    expect(tekst).toMatch(/przyjęci[ae].*05\.10\.2026/);
    expect(tekst).toMatch(/[Kk]opia wniosku o wszczęcie postępowania w sprawie przysposobienia/);
    expect(tekst).toMatch(/sąd/);
    expect(doUzupelnienia.join('\n')).not.toMatch(/dziecka/);
  });

  it('na warunkach macierzyńskiego – rodzina zastępcza niezawodowa (KP art. 183 § 1); odroczony obowiązek szkolny', async () => {
    const z = przysposobienie();
    z.rodzina.zdarzenie.typ = 'rodzina_zastepcza_niezawodowa';
    z.rodzina.zdarzenie.dzieci[0].odroczonyObowiazekSzkolny = true;
    const { tekst } = await wniosek('wniosek_na_warunkach_macierzynskiego', z);
    expect(tekst).toMatch(/art\. 183 § 1 i § 6/);
    expect(tekst).toMatch(/rodzina zastępcza/);
    expect(tekst).toMatch(/orzeczenia sądu opiekuńczego o umieszczeniu dziecka/);
    expect(tekst).toMatch(/odroczeniu obowiązku szkolnego/);
  });

  it('na warunkach macierzyńskiego: przy porodzie i rodzinie zastępczej zawodowej – błąd danych', async () => {
    await expect(wniosekDoPracodawcy('wniosek_na_warunkach_macierzynskiego', para('mama'))).rejects.toBeInstanceOf(BladWniosku);
    const z = przysposobienie();
    z.rodzina.zdarzenie.typ = 'rodzina_zastepcza_zawodowa';
    await expect(wniosekDoPracodawcy('wniosek_na_warunkach_macierzynskiego', z)).rejects.toBeInstanceOf(BladWniosku);
  });
});

describe('wniosekDoPracodawcy – dane dziecka z kontraktu', () => {
  it('rodzicielski: imię i nazwisko dziecka z `Dziecko.dane`, bez braku', async () => {
    const z = para('mama', 'r1');
    z.rodzina.zdarzenie.przewidywana = false;
    z.rodzina.zdarzenie.dzieci = [{ dane: structuredClone(DZIECKO_DANE) }];
    const { tekst, doUzupelnienia } = await wniosek('wniosek_rodzicielski', z);
    expect(tekst).toContain('Dziecko: Jan Przykładowy, data urodzenia dziecka: 01.12.2026.');
    expect(doUzupelnienia.join('\n')).not.toMatch(/dziecka/);
  });

  it('bliźnięta: oboje dzieci z imionami', async () => {
    const z = przejecie('tata');
    z.rodzina.zdarzenie.dzieci = [{ dane: structuredClone(DZIECKO_DANE) }, { dane: structuredClone(DZIECKO2_DANE) }];
    const { tekst, doUzupelnienia } = await wniosek('wniosek_przejecie_macierzynskiego', z);
    expect(tekst).toContain('Dzieci: Jan Przykładowy, data urodzenia: 01.12.2026; Zofia Maria Przykładowa, data urodzenia: 01.12.2026.');
    expect(doUzupelnienia.join('\n')).not.toMatch(/[Ii]mię i nazwisko dziecka/);
  });

  it('jedno z bliźniąt bez imienia: luka i brak', async () => {
    const z = przejecie('tata');
    z.rodzina.zdarzenie.dzieci = [{ dane: structuredClone(DZIECKO_DANE) }, {}];
    const { tekst, doUzupelnienia } = await wniosek('wniosek_przejecie_macierzynskiego', z);
    expect(tekst).toContain('Jan Przykładowy');
    expect(tekst).toContain('……');
    expect(doUzupelnienia.join('\n')).toMatch(/[Ii]mię i nazwisko dziecka/);
  });
});
