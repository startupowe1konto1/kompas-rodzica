/**
 * D4: odczyt wgranego wniosku PDF (edytowalny ZAM wypełniony na komputerze) → dane do profilu.
 *
 * Czytamy wyłącznie pola formularza (AcroForm). Bez OCR i bez rozpoznawania pisma: skan albo wydruk
 * nie ma pól, więc prosimy o przepisanie danych. Plik przetwarzamy w pamięci – nie zapisujemy go
 * na dysku i nigdzie dalej nie wysyłamy.
 */
import {
  EncryptedPDFError,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  type PDFField,
} from 'pdf-lib';
import { roznicaDni } from '../engine/daty';
import type {
  CzesciowaOsoba,
  DaneOsobowe,
  DataISO,
  Dziecko,
  Odcinek,
  OdpowiedzOdczytuWniosku,
  Osoba,
  PochodzenieDanej,
  Rola,
  TypOdcinka,
  ZdarzenieDziecka,
} from '../engine/types';
import { BladWniosku, dataZKratek, datyWTekscie, pierwszaDataWTekscie, tylkoCyfry } from './wspolne';
import { usunXFAiPodpisAdobe } from './zam';
import { kluczZNazwy, opisPola, POLA_ZAM, type KluczZAM } from './zam-mapowanie';

/** Największy plik, jaki przyjmujemy (wypełniony ZAM ma ok. 0,6 MB). */
export const MAKS_ROZMIAR_PLIKU = 10 * 1024 * 1024;

export const KOMUNIKAT_SKAN =
  'To wygląda na skan. Nie czytamy pisma odręcznego – proszę przepisać dane do formularza, to zajmie chwilę.';
const KOMUNIKAT_NIE_PDF = 'To nie jest plik PDF. Proszę wgrać wniosek ZAM zapisany jako PDF.';
const KOMUNIKAT_USZKODZONY =
  'Plik PDF jest uszkodzony i nie da się go otworzyć. Warto zapisać wniosek jeszcze raz i wgrać nowy plik.';
const KOMUNIKAT_HASLO = 'Plik PDF jest zabezpieczony hasłem. Proszę zapisać wniosek bez hasła i wgrać go ponownie.';

/** Pola, których nie warto pokazywać jako „nieprzeniesione” – nie są daną o rodzicu ani dziecku. */
const POMIJANE: KluczZAM[] = ['Page5.Data'];

/** Pliki PDF zaczynają się od „%PDF-” (dopuszczamy kilka bajtów śmieci przed nagłówkiem). */
function czyPDF(plik: Uint8Array): boolean {
  const poczatek = new TextDecoder('latin1').decode(plik.subarray(0, 1024));
  return poczatek.includes('%PDF-');
}

export async function odczytajWniosek(plik: Uint8Array): Promise<OdpowiedzOdczytuWniosku> {
  if (plik.length > MAKS_ROZMIAR_PLIKU) throw new BladWniosku('Plik jest za duży. Wniosek ZAM ma mniej niż 1 MB.');
  if (!czyPDF(plik)) throw new BladWniosku(KOMUNIKAT_NIE_PDF);

  let pola: PDFField[];
  try {
    const doc = await PDFDocument.load(plik, { updateMetadata: false });
    if (doc.getPageCount() === 0) throw new BladWniosku(KOMUNIKAT_USZKODZONY);
    usunXFAiPodpisAdobe(doc);
    pola = doc.getForm().getFields();
  } catch (e) {
    if (e instanceof BladWniosku) throw e;
    if (e instanceof EncryptedPDFError) throw new BladWniosku(KOMUNIKAT_HASLO);
    throw new BladWniosku(KOMUNIKAT_USZKODZONY);
  }

  if (pola.length === 0) {
    return { rozpoznano: false, pochodzenie: [], nieodczytane: [], komunikat: KOMUNIKAT_SKAN };
  }

  const zam = pola.filter((p) => kluczZNazwy(p.getName())).length;
  if (zam < Object.keys(POLA_ZAM).length / 2) {
    return {
      rozpoznano: true,
      formularz: 'nieznany',
      pochodzenie: [],
      nieodczytane: pola.filter(maWartosc).map((p) => p.getName()),
      komunikat:
        'To nie jest wniosek ZAM. Dane przenosimy tylko z edytowalnego wniosku ZAM ze strony ZUS – resztę danych można wpisać w aplikacji.',
    };
  }
  return odczytajZAM(pola);
}

function tekstPola(pole: PDFField): string | undefined {
  if (!(pole instanceof PDFTextField)) return undefined;
  try {
    return pole.getText()?.trim() || undefined;
  } catch {
    return undefined; // pole z formatowaniem (rich text) – traktujemy jak puste
  }
}

function maWartosc(pole: PDFField): boolean {
  if (pole instanceof PDFTextField) return tekstPola(pole) !== undefined;
  if (pole instanceof PDFCheckBox) return pole.isChecked();
  if (pole instanceof PDFRadioGroup) return pole.getSelected() !== undefined;
  if (pole instanceof PDFDropdown || pole instanceof PDFOptionList) return pole.getSelected().length > 0;
  return false;
}

/**
 * Miejsca w ścieżkach `pochodzenie` i w `odcinki[].osobaId`. Którą osobę z rodziny wskazują, ustala UI przy scalaniu
 * z profilem: `{osoba}` – wnioskodawca, `{drugaOsoba}` – drugi rodzic (albo matka przy przejęciu urlopu),
 * `{tytul}` – tytuł ubezpieczenia, który wskaże rodzic.
 */
const OSOBA = '{osoba}';
const DRUGA_OSOBA = '{drugaOsoba}';

type DaneDziecka = NonNullable<Dziecko['dane']>;
type Odczytany = Omit<Odcinek, 'id'>;

/** Odwrotne mapowanie ZAM → profil, płatnik, druga osoba i szkic planu. */
function odczytajZAM(pola: PDFField[]): OdpowiedzOdczytuWniosku {
  const teksty = new Map<KluczZAM, string>();
  const zaznaczone = new Set<KluczZAM>();
  for (const pole of pola) {
    const klucz = kluczZNazwy(pole.getName());
    if (!klucz) continue;
    const tekst = tekstPola(pole);
    if (tekst !== undefined) teksty.set(klucz, tekst);
    if (pole instanceof PDFCheckBox && pole.isChecked()) zaznaczone.add(klucz);
  }

  const pochodzenie: PochodzenieDanej[] = [];
  const przeniesione = new Set<KluczZAM>();
  const dane: DaneOsobowe = {};
  const zdarzenie: Partial<ZdarzenieDziecka> = {};
  const zrodlo = (sciezka: string) => pochodzenie.push({ sciezka, zrodlo: 'formularz_pdf' });

  /** Przenosi wartość, gdy jest poprawna, i zapisuje skąd pochodzi. */
  function przenies<T>(klucz: KluczZAM, sciezka: string, wartosc: T | undefined, zapisz: (v: T) => void): void {
    if (wartosc === undefined) return;
    zapisz(wartosc);
    przeniesione.add(klucz);
    zrodlo(sciezka);
  }
  const tekst = (k: KluczZAM) => teksty.get(k);
  const osoba = (pole: string) => `osoby[${OSOBA}].dane.${pole}`;

  // Strona 1 – dane wnioskodawcy [rozp. Dz.U. 2026 poz. 1316, zał. 6 pkt 3]
  const pesel = tylkoCyfry(tekst('Page1.PESEL'));
  przenies('Page1.PESEL', osoba('pesel'), pesel?.length === 11 ? pesel : undefined, (v) => (dane.pesel = v));
  const dataUr = tekst('Page1.Dataurodzenia');
  przenies('Page1.Dataurodzenia', osoba('dataUrodzenia'), dataUr && dataZKratek(dataUr), (v) => (dane.dataUrodzenia = v));
  przenies('Page1.Rodzajseriainumerdokumentu', osoba('dokumentTozsamosci'), tekst('Page1.Rodzajseriainumerdokumentu'), (v) => (dane.dokumentTozsamosci = v));
  przenies('Page1.Imie', osoba('imie'), tekst('Page1.Imie'), (v) => (dane.imie = v));
  przenies('Page1.Nazwisko', osoba('nazwisko'), tekst('Page1.Nazwisko'), (v) => (dane.nazwisko = v));
  const adres: NonNullable<DaneOsobowe['adres']> = {};
  przenies('Page1.Ulica', osoba('adres.ulica'), tekst('Page1.Ulica'), (v) => (adres.ulica = v));
  przenies('Page1.Numerdomu', osoba('adres.nrDomu'), tekst('Page1.Numerdomu'), (v) => (adres.nrDomu = v));
  przenies('Page1.Numerlokalu', osoba('adres.nrLokalu'), tekst('Page1.Numerlokalu'), (v) => (adres.nrLokalu = v));
  przenies('Page1.Kodpocztowy', osoba('adres.kod'), tekst('Page1.Kodpocztowy'), (v) => (adres.kod = v));
  przenies('Page1.Poczta', osoba('adres.miejscowosc'), tekst('Page1.Poczta'), (v) => (adres.miejscowosc = v));
  przenies('Page1.Nazwapaństwa', osoba('adres.panstwo'), tekst('Page1.Nazwapaństwa'), (v) => (adres.panstwo = v));
  if (Object.keys(adres).length) dane.adres = adres;
  przenies('Page1.Numertelefonu', osoba('telefon'), tekst('Page1.Numertelefonu'), (v) => (dane.telefon = v));
  // Strona 2 – rachunek [zał. 6 pkt 17]
  const rachunek = tylkoCyfry(tekst('Page2.Numerrachunku'));
  przenies('Page2.Numerrachunku', osoba('rachunekBankowy'), rachunek?.length === 26 ? rachunek : undefined, (v) => (dane.rachunekBankowy = v));

  // Strona 1 – płatnik składek [zał. 6 pkt 1–2]. REGON-u nie ma w odpowiedzi odczytu – zostaje na liście.
  const platnik: NonNullable<OdpowiedzOdczytuWniosku['platnik']> = {};
  const tytul = (pole: string) => `osoby[${OSOBA}].tytuly[{tytul}].${pole}`;
  przenies('Page1.Nazwaplatnika', tytul('nazwaPlatnika'), tekst('Page1.Nazwaplatnika'), (v) => (platnik.nazwa = v));
  const nip = tylkoCyfry(tekst('Page1.NIP'));
  przenies('Page1.NIP', tytul('nipPlatnika'), nip?.length === 10 ? nip : undefined, (v) => (platnik.nip = v));

  // Okoliczności – rodzaj zdarzenia i jego data [zał. 6 pkt 5, 8, 10]
  const ustaw = <K extends keyof ZdarzenieDziecka>(klucz: KluczZAM, pole: K, wartosc: ZdarzenieDziecka[K] | undefined) =>
    przenies(klucz, `zdarzenie.${pole}`, wartosc, (v) => (zdarzenie[pole] = v));
  const dataZ = (k: KluczZAM) => {
    const s = tekst(k);
    return s ? dataZKratek(s) : undefined;
  };
  const dataDziecka = (...klucze: KluczZAM[]) => {
    for (const k of klucze) {
      const d = pierwszaDataWTekscie(tekst(k) ?? '');
      if (d) return d;
    }
    return undefined;
  };
  const urodzone =
    zaznaczone.has('Page2.ZaznaczX1a') || zaznaczone.has('Page3._3') || zaznaczone.has('Page3._4') || zaznaczone.has('Page4._5');

  if (zaznaczone.has('Page2.ZaznaczX1b') || zaznaczone.has('Page2.ZaznaczX1c')) {
    const klucz = zaznaczone.has('Page2.ZaznaczX1b') ? 'Page2.ZaznaczX1b' : 'Page2.ZaznaczX1c';
    ustaw(klucz, 'typ', klucz === 'Page2.ZaznaczX1b' ? 'przysposobienie' : 'rodzina_zastepcza_niezawodowa');
    ustaw('Page2.Data', 'data', dataZ('Page2.Data'));
    zdarzenie.przewidywana = false;
  } else if (urodzone) {
    const klucz = (['Page2.ZaznaczX1a', 'Page3._3', 'Page3._4', 'Page4._5'] as const).find((k) => zaznaczone.has(k))!;
    ustaw(klucz, 'typ', 'porod');
    // Data urodzenia dziecka jest w polu „Dane dziecka” (tekst) – to data porodu.
    const data = dataDziecka(...POLA_DZIECI);
    if (data) {
      zdarzenie.data = data;
      zrodlo('zdarzenie.data');
    }
    zdarzenie.przewidywana = false;
  } else if (zaznaczone.has('Page3._2')) {
    ustaw('Page3._2', 'typ', 'porod');
    ustaw('Page3.Data2a', 'data', dataZ('Page3.Data2a'));
    zdarzenie.przewidywana = true;
  }
  if (zdarzenie.przewidywana !== undefined) zrodlo('zdarzenie.przewidywana');

  // Dane dzieci [zał. 6 pkt 8] i „Za życiem” [pkt 9]
  const dzieci = odczytajDzieci(tekst, zaznaczone, przeniesione, zrodlo, zdarzenie.typ !== undefined && zdarzenie.typ !== 'porod');
  if (dzieci.length) zdarzenie.dzieci = dzieci;

  // Zakres wniosku (strona 2) → szkic planu [zał. 6 pkt 7, 15, 16]
  const odcinki = odcinkiZakresu(tekst, zaznaczone, przeniesione);
  // Wariant 81,5% [UZ art. 30a]. Brak zaznaczenia nie znaczy „nie” (wniosek o 81,5% można złożyć osobno),
  // więc przenosimy tylko zaznaczenie.
  const wariant815 = zaznaczone.has('Page2.informuje') ? true : undefined;
  if (wariant815) przeniesione.add('Page2.informuje');

  // Strona 5 – oświadczenie przy urlopie ojcowskim (TAK2/NIE2 według położenia na stronie, zob. zam-mapowanie.ts)
  const oswiadczenia: NonNullable<Osoba['oswiadczenia']> = {};
  if (zaznaczone.has('Page5.TAK2') !== zaznaczone.has('Page5.NIE2')) {
    const tak = zaznaczone.has('Page5.TAK2');
    przenies(tak ? 'Page5.TAK2' : 'Page5.NIE2', `osoby[${OSOBA}].oswiadczenia.ojcowskiZInnegoTytulu`, tak, (v) => (oswiadczenia.ojcowskiZInnegoTytulu = v));
  }

  const drugaOsoba = odczytajDrugaOsobe(tekst, przenies, przeniesione, zrodlo);

  const wypelnione = [...new Set([...teksty.keys(), ...zaznaczone])];
  const nieodczytane = (Object.keys(POLA_ZAM) as KluczZAM[])
    .filter((k) => wypelnione.includes(k) && !przeniesione.has(k) && !POMIJANE.includes(k))
    .map(opisPola);

  const maDane = Object.keys(dane).length > 0;
  const maOswiadczenia = Object.keys(oswiadczenia).length > 0;
  const maZdarzenie = Object.keys(zdarzenie).length > 0;
  const maPlatnika = Object.keys(platnik).length > 0;
  const przeniesiono = maDane || maOswiadczenia || maZdarzenie || maPlatnika || drugaOsoba !== undefined || odcinki.length > 0;
  return {
    rozpoznano: true,
    formularz: 'ZAM',
    osoba: maDane || maOswiadczenia ? { ...(maDane && { dane }), ...(maOswiadczenia && { oswiadczenia }) } : undefined,
    zdarzenie: maZdarzenie ? zdarzenie : undefined,
    platnik: maPlatnika ? platnik : undefined,
    drugaOsoba,
    odcinki: odcinki.length ? odcinki : undefined,
    wariant815,
    pochodzenie,
    nieodczytane,
    komunikat: komunikat(przeniesiono, nieodczytane.length > 0),
  };
}

/** Pola „Dane dziecka” w kolejności okoliczności 1, 3, 4, 5. */
const POLA_DZIECI = ['Page3.Tekst1', 'Page3.Tekst13B', 'Page4.Tekst4c', 'Page4.Tekst4b'] as const satisfies readonly KluczZAM[];

/** Pole wyboru „Za życiem” → pole z imionami dzieci, które mają zaświadczenie. */
const IMIONA_ZA_ZYCIEM = {
  'Page3.ZaznaczX1': 'Page3.podajimie1',
  'Page3.ZaznaczX1d': 'Page3.podajimie',
  'Page4.ZaznaczX1d': 'Page4.podajimie',
} as const satisfies Partial<Record<KluczZAM, KluczZAM>>;

/**
 * Dane dzieci z pola „Dane dziecka” (tekst: „Jan Kowalski, ur. 01.12.2026, Łódź”, każde dziecko w osobnej linii)
 * i oświadczenie „Za życiem”. Przy przyjęciu dziecka data z tekstu to data urodzenia dziecka (`Dziecko.dataUrodzenia`);
 * przy porodzie – data zdarzenia, odczytana wyżej.
 */
function odczytajDzieci(
  tekst: (k: KluczZAM) => string | undefined,
  zaznaczone: Set<KluczZAM>,
  przeniesione: Set<KluczZAM>,
  zrodlo: (sciezka: string) => void,
  przyjecie: boolean,
): Dziecko[] {
  const dzieci: Dziecko[] = [];
  const zrodlaDanych = POLA_DZIECI.filter((k) => tekst(k));
  if (zrodlaDanych.length) {
    const t = tekst(zrodlaDanych[0])!;
    const odczytane = dzieciZTekstu(t);
    for (const { dane, data } of odczytane) {
      const i = dzieci.length;
      const dziecko: Dziecko = {};
      if (Object.keys(dane).length) {
        dziecko.dane = dane;
        for (const pole of Object.keys(dane)) zrodlo(`zdarzenie.dzieci[${i}].dane.${pole}`);
      }
      if (przyjecie && data) {
        dziecko.dataUrodzenia = data;
        zrodlo(`zdarzenie.dzieci[${i}].dataUrodzenia`);
      }
      if (Object.keys(dziecko).length) dzieci.push(dziecko);
    }
    // Pole uznajemy za przeniesione, gdy z każdej linii odczytaliśmy imię albo nazwisko. To samo pole w innej
    // okoliczności (ten sam tekst) też jest przeniesione.
    if (odczytane.length && odczytane.every((d) => d.dane.imie || d.dane.nazwisko)) {
      for (const k of zrodlaDanych) if (tekst(k) === t) przeniesione.add(k);
    }
  }

  const kluczZaZyciem = (Object.keys(IMIONA_ZA_ZYCIEM) as (keyof typeof IMIONA_ZA_ZYCIEM)[]).find((k) => zaznaczone.has(k));
  if (kluczZaZyciem) {
    const kluczImion = IMIONA_ZA_ZYCIEM[kluczZaZyciem];
    const imiona = (tekst(kluczImion) ?? '').split(/\s*[,;]\s*|\s+i\s+/).map((s) => s.trim()).filter(Boolean);
    const oznacz = (i: number) => {
      dzieci[i].zaZyciem = true;
      zrodlo(`zdarzenie.dzieci[${i}].zaZyciem`);
    };
    if (imiona.length) {
      const male = (s?: string) => s?.toLocaleLowerCase('pl');
      for (const imie of imiona) {
        let i = dzieci.findIndex((d) => male(d.dane?.imie) === male(imie));
        if (i < 0) i = dzieci.findIndex((d) => male(d.dane?.imie?.split(/\s+/)[0]) === male(imie));
        if (i < 0) {
          i = dzieci.push({ dane: { imie } }) - 1;
          zrodlo(`zdarzenie.dzieci[${i}].dane.imie`);
        }
        oznacz(i);
      }
      przeniesione.add(kluczZaZyciem);
      przeniesione.add(kluczImion);
    } else if (dzieci.length <= 1) {
      // Bez imion wiemy, którego dziecka dotyczy zaświadczenie, tylko gdy dziecko jest jedno.
      if (!dzieci.length) dzieci.push({});
      oznacz(0);
      przeniesione.add(kluczZaZyciem);
    }
  }
  return dzieci;
}

/**
 * Druga osoba: drugi rodzic ze strony 5 [zał. 6 pkt 6], a przy przejęciu urlopu macierzyńskiego – matka dziecka
 * ze strony 4 (okoliczność 5) [zał. 6 pkt 13]. Gdy obie są tą samą osobą (zgodny PESEL), łączymy dane.
 */
function odczytajDrugaOsobe(
  tekst: (k: KluczZAM) => string | undefined,
  przenies: <T>(klucz: KluczZAM, sciezka: string, wartosc: T | undefined, zapisz: (v: T) => void) => void,
  przeniesione: Set<KluczZAM>,
  zrodlo: (sciezka: string) => void,
): CzesciowaOsoba | undefined {
  const d: DaneOsobowe = {};
  const sciezka = (pole: string) => `osoby[${DRUGA_OSOBA}].dane.${pole}`;
  const pesel = tylkoCyfry(tekst('Page5.PESEL'));
  przenies('Page5.PESEL', sciezka('pesel'), pesel?.length === 11 ? pesel : undefined, (v) => (d.pesel = v));
  const dataUr = tekst('Page5.Dataurodzenia');
  przenies('Page5.Dataurodzenia', sciezka('dataUrodzenia'), dataUr && dataZKratek(dataUr), (v) => (d.dataUrodzenia = v));
  przenies('Page5.Rodzajseriainumerdokumentu', sciezka('dokumentTozsamosci'), tekst('Page5.Rodzajseriainumerdokumentu'), (v) => (d.dokumentTozsamosci = v));
  przenies('Page5.Imie', sciezka('imie'), tekst('Page5.Imie'), (v) => (d.imie = v));
  przenies('Page5.Nazwisko', sciezka('nazwisko'), tekst('Page5.Nazwisko'), (v) => (d.nazwisko = v));

  let rola: Rola | undefined;
  const tekstMatki = tekst('Page4.Tekst13');
  const matka = tekstMatki ? osobaZTekstu(tekstMatki) : undefined;
  if (matka && (!d.pesel || !matka.pesel || matka.pesel === d.pesel)) {
    for (const pole of ['imie', 'nazwisko', 'pesel', 'dokumentTozsamosci', 'dataUrodzenia'] as const) {
      if (d[pole] === undefined && matka[pole] !== undefined) {
        d[pole] = matka[pole];
        zrodlo(sciezka(pole));
      }
    }
    rola = 'matka';
    zrodlo(`osoby[${DRUGA_OSOBA}].rola`);
    przeniesione.add('Page4.Tekst13');
  }
  if (!Object.keys(d).length) return undefined;
  return rola ? { rola, dane: d } : { dane: d };
}

/** Okresy „od dd.mm.rrrr do dd.mm.rrrr” (albo kolejne pary dat). Nieparzysta liczba dat albo koniec przed początkiem → nie umiemy. */
function okresyZTekstu(s: string): { od: DataISO; do: DataISO }[] | undefined {
  const daty = datyWTekscie(s);
  if (daty.length === 0 || daty.length % 2 !== 0) return undefined;
  const okresy: { od: DataISO; do: DataISO }[] = [];
  for (let i = 0; i < daty.length; i += 2) {
    if (roznicaDni(daty[i], daty[i + 1]) < 0) return undefined;
    okresy.push({ od: daty[i], do: daty[i + 1] });
  }
  return okresy;
}

/** Zakres wniosku ze strony 2 → szkic odcinków wnioskodawcy (bez identyfikatorów) [zał. 6 pkt 7, 15, 16]. */
function odcinkiZakresu(
  tekst: (k: KluczZAM) => string | undefined,
  zaznaczone: Set<KluczZAM>,
  przeniesione: Set<KluczZAM>,
): Odczytany[] {
  const wynik: Odczytany[] = [];
  const dodaj = (typ: TypOdcinka, kluczOkresu: KluczZAM, kluczWyboru: KluczZAM[], kluczCzesci?: KluczZAM) => {
    const okresy = okresyZTekstu(tekst(kluczOkresu) ?? '');
    if (!okresy) return;
    const czesci = kluczCzesci ? (tekst(kluczCzesci)?.match(/\d+/g) ?? []).map(Number) : [];
    const zCzesciami = kluczCzesci !== undefined && czesci.length === okresy.length;
    okresy.forEach((o, i) => wynik.push({ osobaId: OSOBA, typ, od: o.od, do: o.do, ...(zCzesciami && { czescNr: czesci[i] }) }));
    przeniesione.add(kluczOkresu);
    for (const k of kluczWyboru) if (zaznaczone.has(k)) przeniesione.add(k);
    if (zCzesciami) przeniesione.add(kluczCzesci);
  };
  // Okres urlopu macierzyńskiego i urlopu na warunkach macierzyńskiego to jedno pole – rodzaj mówi pole wyboru,
  // a gdy nic nie zaznaczono – okoliczność (przyjęcie dziecka). Oba zaznaczone: nie wiemy, który to okres.
  const mac = zaznaczone.has('Page2.macierzynskiego');
  const naWar = zaznaczone.has('Page2.nawarunkach');
  const przyjecie = zaznaczone.has('Page2.ZaznaczX1b') || zaznaczone.has('Page2.ZaznaczX1c');
  if (!(mac && naWar)) {
    const typ = naWar || (!mac && przyjecie) ? 'na_warunkach_macierzynskiego' : 'macierzynski';
    dodaj(typ, 'Page2.Okres', ['Page2.macierzynskiego', 'Page2.nawarunkach']);
  }
  dodaj('rodzicielski', 'Page2.Okres2', ['Page2.rodzicielskiego'], 'Page2.czesc');
  dodaj('uzupelniajacy', 'Page2.Okres3', ['Page2.uzMacierzynskiego']);
  dodaj('ojcowski', 'Page2.Okres4', ['Page2.ojcowskiego'], 'Page2.Numerlokalu2');
  return wynik.sort((a, b) => roznicaDni(b.od, a.od));
}

/** „Anna Maria Kowalska” → imię „Anna Maria”, nazwisko „Kowalska” (nazwiska dwuczłonowe piszemy z łącznikiem). */
function podzielNazwe(nazwa: string): { imie?: string; nazwisko?: string } {
  const slowa = nazwa.trim().split(/\s+/).filter(Boolean);
  if (slowa.length === 0) return {};
  if (slowa.length === 1) return { imie: slowa[0] };
  return { imie: slowa.slice(0, -1).join(' '), nazwisko: slowa.at(-1) };
}

/** Linie „Imię Nazwisko, ur. dd.mm.rrrr, miejsce urodzenia” → dane dzieci (część bez cyfr: imię i nazwisko, potem miejsce). */
function dzieciZTekstu(s: string): { dane: DaneDziecka; data?: DataISO }[] {
  return s
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linia) => {
      const [nazwa, miejsce] = linia
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c && !/\d/.test(c));
      const dane: DaneDziecka = nazwa ? podzielNazwe(nazwa) : {};
      const m = miejsce?.replace(/^(ur\.|urodzon[aey]|w)\s+/i, '').trim();
      if (m) dane.miejsceUrodzenia = m;
      return { dane, data: pierwszaDataWTekscie(linia) };
    });
}

/** Dane matki ze strony 4: „Imię Nazwisko, PESEL 12345678901” albo „Imię Nazwisko, dokument, ur. dd.mm.rrrr”. */
function osobaZTekstu(s: string): DaneOsobowe | undefined {
  const czesci = s.split(',').map((c) => c.trim()).filter(Boolean);
  if (!czesci.length || /\d/.test(czesci[0])) return undefined;
  const d: DaneOsobowe = podzielNazwe(czesci[0]);
  const dokument: string[] = [];
  for (const c of czesci.slice(1)) {
    const cyfry = c.replace(/\D/g, '');
    const data = pierwszaDataWTekscie(c);
    if (cyfry.length === 11 && (/PESEL/i.test(c) || /^\d{11}$/.test(c))) d.pesel = cyfry;
    else if (data) d.dataUrodzenia = data;
    else dokument.push(c);
  }
  if (dokument.length) d.dokumentTozsamosci = dokument.join(', ');
  return d;
}

function komunikat(przeniesiono: boolean, pominieto: boolean): string {
  if (!przeniesiono && !pominieto) return 'Wniosek ZAM jest pusty – nie ma w nim danych do przeniesienia.';
  if (!przeniesiono) return 'We wniosku ZAM nie ma danych, które umiemy przenieść do profilu. Można je wpisać w aplikacji.';
  const reszta = pominieto ? ' Części pól nie przenosimy – są na liście poniżej. Te dane można wpisać w aplikacji.' : '';
  return `Przenieśliśmy dane z wniosku ZAM do profilu. Przed przejściem dalej warto je sprawdzić.${reszta}`;
}
