/**
 * Mapowanie danych z kontraktu na pola wniosku ZAM (wzór ZUS po 24.10.2026:
 * `materialy/ZUS/wzory-formularzy/ZAM_edytowalny.pdf`, lista pól: `docs/zam-pola.json`).
 * Zakres danych we wniosku: rozporządzenie Dz.U. 2026 poz. 1316, § 12 i załącznik nr 6 (dalej „zał. 6”).
 *
 * Uwaga na nazwy pól w PDF – bywają mylące. Znaczenie pola ustalamy po jego położeniu na stronie
 * (sprawdzone na wyrenderowanych stronach), a nie po nazwie ani opisie:
 *  - `Page2.Numerlokalu2` to „która część urlopu ojcowskiego”;
 *  - na stronie 3 pola `skroceniem`, `przerwaniem4A`, `przerwaniem4B`, `podjeciem` to kategorie
 *    urodzenia przy uzupełniającym urlopie (nazwy skopiowano z okoliczności 5 na stronie 4);
 *  - na stronie 5 `TAK2`/`NIE2`/`Okres1` to oświadczenie o urlopie ojcowskim, a `TAK`/`NIE`/`Okres` –
 *    informacja o drugim rodzicu (tooltipy w PDF mówią co innego; docs/zrodla-danych.md, pytanie 13).
 *
 * Czego nie wiemy, zostawiamy puste i dopisujemy do `doUzupelnienia` (opis po ludzku ze stroną formularza).
 */
import { dodajDni, czyWOkresie } from '../engine/daty';
import { parametryNaDzien, WERSJE_DOMYSLNE } from '../engine/params';
import type {
  DaneOsobowe,
  Odcinek,
  Osoba,
  Parametry,
  PrzyczynaUstania,
  TypOdcinka,
  TytulUbezpieczenia,
  ZapytanieWniosek,
  ZdarzenieDziecka,
} from '../engine/types';
import { BladWniosku, dataPL, dataWKratkach, okresPL, tylkoCyfry } from './wspolne';

export type TypPola = 'tekst' | 'checkbox';

export interface DefinicjaPola {
  typ: TypPola;
  strona: 1 | 2 | 3 | 4 | 5;
  /** Co to za pole – po ludzku. Trafia do `doUzupelnienia` (D3) i `nieodczytane` (D4). */
  etykieta: string;
}

const t = (strona: DefinicjaPola['strona'], etykieta: string): DefinicjaPola => ({ typ: 'tekst', strona, etykieta });
const x = (strona: DefinicjaPola['strona'], etykieta: string): DefinicjaPola => ({ typ: 'checkbox', strona, etykieta });

/** Wszystkie 85 pól ZAM. Klucz = `StronaN.nazwa` (jak `skrot` w docs/zam-pola.json). */
export const POLA_ZAM = {
  // Strona 1 – Twoje dane [zał. 6 pkt 3]
  'Page1.PESEL': t(1, 'PESEL wnioskodawcy'),
  'Page1.Dataurodzenia': t(1, 'Data urodzenia wnioskodawcy (gdy nie ma PESEL-u)'),
  'Page1.Rodzajseriainumerdokumentu': t(1, 'Dokument tożsamości wnioskodawcy: rodzaj, seria i numer (gdy nie ma PESEL-u)'),
  'Page1.Imie': t(1, 'Imię wnioskodawcy'),
  'Page1.Nazwisko': t(1, 'Nazwisko wnioskodawcy'),
  'Page1.Ulica': t(1, 'Ulica'),
  'Page1.Numerdomu': t(1, 'Numer domu'),
  'Page1.Numerlokalu': t(1, 'Numer lokalu'),
  'Page1.Kodpocztowy': t(1, 'Kod pocztowy'),
  'Page1.Poczta': t(1, 'Miejscowość'),
  'Page1.Nazwapaństwa': t(1, 'Państwo (przy adresie za granicą)'),
  'Page1.Numertelefonu': t(1, 'Numer telefonu'),
  // Strona 1 – płatnik składek [zał. 6 pkt 1–2]
  'Page1.NIP': t(1, 'NIP płatnika składek'),
  'Page1.REGON': t(1, 'REGON płatnika składek'),
  'Page1.PESEL_1': t(1, 'PESEL płatnika składek'),
  'Page1.Rodzajseriainumerdokumentu_1': t(1, 'Dokument tożsamości płatnika składek'),
  'Page1.Nazwaplatnika': t(1, 'Nazwa płatnika składek'),
  // Strona 2 – rachunek [zał. 6 pkt 17] i zakres wniosku [pkt 7, 15, 16]
  'Page2.Numerrachunku': t(2, 'Numer rachunku bankowego'),
  'Page2.macierzynskiego': x(2, 'Zasiłek za urlop macierzyński'),
  'Page2.nawarunkach': x(2, 'Zasiłek za urlop na warunkach urlopu macierzyńskiego'),
  'Page2.Okres': t(2, 'Okres urlopu macierzyńskiego (od–do)'),
  'Page2.rodzicielskiego': x(2, 'Zasiłek za urlop rodzicielski'),
  'Page2.Okres2': t(2, 'Okres urlopu rodzicielskiego (od–do)'),
  'Page2.czesc': t(2, 'Która część urlopu rodzicielskiego'),
  'Page2.uzMacierzynskiego': x(2, 'Zasiłek za uzupełniający urlop macierzyński'),
  'Page2.Okres3': t(2, 'Okres uzupełniającego urlopu macierzyńskiego (od–do)'),
  'Page2.ojcowskiego': x(2, 'Zasiłek za urlop ojcowski'),
  'Page2.Okres4': t(2, 'Okres urlopu ojcowskiego (od–do)'),
  'Page2.Numerlokalu2': t(2, 'Która część urlopu ojcowskiego'),
  'Page2.Data2': t(2, 'Data końca zasiłku za urlop macierzyński (przy uzupełniającym urlopie)'),
  'Page2.informuje': x(2, 'Pełny wymiar urlopu macierzyńskiego i rodzicielskiego (wariant 81,5%)'),
  // Strona 2 – informacja o ubezpieczeniu [zał. 6 pkt 4]
  'Page2.TAK': x(2, 'Działalność: z ubezpieczeniem chorobowym (TAK)'),
  'Page2.NIE': x(2, 'Działalność: bez ubezpieczenia chorobowego (NIE)'),
  // Okoliczność 1 – urodzenie albo przyjęcie dziecka [zał. 6 pkt 5, 8, 9]
  'Page2.ZaznaczX1a': x(2, 'Urodzenie dziecka'),
  'Page2.ZaznaczX1b': x(2, 'Przyjęcie dziecka na wychowanie i wniosek o przysposobienie'),
  'Page2.Data': t(2, 'Data przyjęcia dziecka na wychowanie'),
  'Page2.ZaznaczX1c': x(2, 'Przyjęcie dziecka w ramach rodziny zastępczej'),
  'Page3.Tekst1': t(3, 'Dane dziecka: imię i nazwisko, data i miejsce urodzenia'),
  'Page3.ZaznaczX1': x(3, 'Oświadczenie o zaświadczeniu „Za życiem”'),
  'Page3.podajimie1': t(3, 'Imiona dzieci z zaświadczeniem „Za życiem”'),
  // Okoliczność 2 – przewidywana data porodu [zał. 6 pkt 10]
  'Page3._2': x(3, 'Wniosek w związku z przewidywaną datą porodu'),
  'Page3.Data2a': t(3, 'Przewidywana data porodu'),
  // Okoliczność 3 – urodzenie po ustaniu zatrudnienia [zał. 6 pkt 11]
  'Page3._3': x(3, 'Urodzenie dziecka po ustaniu zatrudnienia'),
  'Page3.upadlosc': x(3, 'Pracodawca ogłosił upadłość'),
  'Page3.likwidacje': x(3, 'Pracodawca ogłosił likwidację'),
  'Page3.rozwiazal': x(3, 'Pracodawca rozwiązał umowę z naruszeniem prawa (wyrok sądu)'),
  'Page3.zmarl': x(3, 'Pracodawca zmarł'),
  'Page3.Tekst13B': t(3, 'Dane dziecka (urodzenie po ustaniu zatrudnienia)'),
  'Page3.ZaznaczX1d': x(3, 'Oświadczenie o zaświadczeniu „Za życiem” (urodzenie po ustaniu zatrudnienia)'),
  'Page3.podajimie': t(3, 'Imiona dzieci z zaświadczeniem „Za życiem” (urodzenie po ustaniu zatrudnienia)'),
  // Okoliczność 4 – pobyt dziecka w szpitalu, uzupełniający urlop [zał. 6 pkt 12]
  'Page3._4': x(3, 'Urodzenie dziecka i jego pobyt w szpitalu (uzupełniający urlop macierzyński)'),
  'Page3.skroceniem': x(3, 'Poród przed ukończeniem 28. tygodnia ciąży'),
  'Page3.przerwaniem4A': x(3, 'Masa urodzeniowa dziecka nie większa niż 1000 g'),
  'Page3.przerwaniem4B': x(3, 'Poród między 28. a 37. tygodniem ciąży i masa ponad 1000 g'),
  'Page3.podjeciem': x(3, 'Poród po 37. tygodniu ciąży i pobyt dziecka w szpitalu'),
  'Page3.Tekst4a': t(3, 'Okres pobytu dziecka w szpitalu (od–do)'),
  'Page4.Tekst4c': t(4, 'Dane dziecka (uzupełniający urlop macierzyński)'),
  // Okoliczność 5 – sytuacja matki dziecka [zał. 6 pkt 13]
  'Page4._5': x(4, 'Sytuacja matki dziecka'),
  'Page4.skroceniem': x(4, 'Matka skróciła zasiłek po wykorzystaniu co najmniej 14 tygodni'),
  'Page4.przerwaniem4A': x(4, 'Matka przerwała zasiłek z powodu pobytu w szpitalu'),
  'Page4.przerwaniem4B': x(4, 'Matka przerwała zasiłek z powodu orzeczenia o niezdolności do samodzielnej egzystencji'),
  'Page4.podjeciem': x(4, 'Matka podjęła pracę (co najmniej pół etatu)'),
  'Page4.porzuceniem': x(4, 'Matka porzuciła dziecko'),
  'Page4.smiercia': x(4, 'Śmierć matki'),
  'Page4.Data5': t(4, 'Data sytuacji matki'),
  'Page4.Tekst4b': t(4, 'Dane dziecka (sytuacja matki)'),
  'Page4.ZaznaczX1d': x(4, 'Oświadczenie o zaświadczeniu „Za życiem” (sytuacja matki)'),
  'Page4.podajimie': t(4, 'Imiona dzieci z zaświadczeniem „Za życiem” (sytuacja matki)'),
  'Page4.Tekst13': t(4, 'Dane matki dziecka: imię, nazwisko i PESEL'),
  // Okoliczność 6 – wypisanie ze szpitala
  'Page5._6': x(5, 'Wypisanie ze szpitala'),
  'Page5.Data6': t(5, 'Data wypisania ze szpitala'),
  'Page5.mnie5': x(5, 'Wypisanie ze szpitala: osoby składającej wniosek'),
  'Page5.dziecka5': x(5, 'Wypisanie ze szpitala: dziecka'),
  // Strona 5 – oświadczenie przy urlopie ojcowskim
  'Page5.TAK2': x(5, 'Urlop ojcowski: zasiłek z innego tytułu był pobierany (TAK)'),
  'Page5.NIE2': x(5, 'Urlop ojcowski: zasiłku z innego tytułu nie pobierano (NIE)'),
  'Page5.Okres1': t(5, 'Urlop ojcowski: tytuł i okres zasiłku z innego tytułu'),
  // Strona 5 – informacja o drugim rodzicu [zał. 6 pkt 14] i jego dane [pkt 6]
  'Page5.TAK': x(5, 'Drugi rodzic będzie korzystał z zasiłku za urlop rodzicielski (TAK)'),
  'Page5.NIE': x(5, 'Drugi rodzic nie będzie korzystał z zasiłku za urlop rodzicielski (NIE)'),
  'Page5.Okres': t(5, 'Okres zasiłku drugiego rodzica (od–do)'),
  'Page5.PESEL': t(5, 'PESEL drugiego rodzica'),
  'Page5.Dataurodzenia': t(5, 'Data urodzenia drugiego rodzica (gdy nie ma PESEL-u)'),
  'Page5.Rodzajseriainumerdokumentu': t(5, 'Dokument tożsamości drugiego rodzica (gdy nie ma PESEL-u)'),
  'Page5.Imie': t(5, 'Imię drugiego rodzica'),
  'Page5.Nazwisko': t(5, 'Nazwisko drugiego rodzica'),
  'Page5.Data': t(5, 'Data wypełnienia wniosku'),
} as const satisfies Record<string, DefinicjaPola>;

export type KluczZAM = keyof typeof POLA_ZAM;

/** 'Page1.PESEL' → 'topmostSubform[0].Page1[0].PESEL[0]' (pełna nazwa pola w PDF). */
export function pelnaNazwaPola(klucz: KluczZAM): string {
  const [strona, pole] = klucz.split('.');
  return `topmostSubform[0].${strona}[0].${pole}[0]`;
}

const KLUCZE_PO_NAZWIE = new Map((Object.keys(POLA_ZAM) as KluczZAM[]).map((k) => [pelnaNazwaPola(k), k]));

/** Pełna nazwa pola z PDF → klucz mapowania; pole spoza ZAM → undefined. */
export function kluczZNazwy(nazwa: string): KluczZAM | undefined {
  return KLUCZE_PO_NAZWIE.get(nazwa);
}

/** Opis pola dla rodzica: „Twój PESEL (strona 1)”. */
export function opisPola(klucz: KluczZAM): string {
  return `${POLA_ZAM[klucz].etykieta} (strona ${POLA_ZAM[klucz].strona})`;
}

// ───────────────────────── Dane → wartości pól ─────────────────────────

export interface WartosciZAM {
  teksty: Partial<Record<KluczZAM, string>>;
  zaznaczone: KluczZAM[];
  doUzupelnienia: string[];
}

/** Typy odcinków, za które wnioskuje się o zasiłek macierzyński na ZAM [zał. 6 pkt 7]. */
const TYPY_ZAM: TypOdcinka[] = ['macierzynski', 'na_warunkach_macierzynskiego', 'rodzicielski', 'uzupelniajacy', 'ojcowski'];

/** Okoliczność 3: ubezpieczenie ustało przed porodem z jednej z tych przyczyn [UZ art. 30 ust. 1; zał. 6 pkt 11]. */
const OKOLICZNOSC_3: Partial<Record<PrzyczynaUstania, KluczZAM>> = {
  upadlosc: 'Page3.upadlosc',
  likwidacja: 'Page3.likwidacje',
  naruszenie_prawa_wyrok: 'Page3.rozwiazal',
  smierc_pracodawcy: 'Page3.zmarl',
};


class Zbieracz {
  readonly teksty: Partial<Record<KluczZAM, string>> = {};
  readonly zaznaczone: KluczZAM[] = [];
  readonly braki: string[] = [];

  tekst(klucz: KluczZAM, wartosc: string): void {
    this.teksty[klucz] = wartosc;
  }
  /** Wpisz, a gdy nie ma wartości – dopisz pole do uzupełnienia. */
  tekstAlboBrak(klucz: KluczZAM, wartosc: string | undefined): void {
    const w = wartosc?.trim();
    if (w) this.tekst(klucz, w);
    else this.brak(opisPola(klucz));
  }
  zaznacz(klucz: KluczZAM): void {
    if (!this.zaznaczone.includes(klucz)) this.zaznaczone.push(klucz);
  }
  brak(opis: string): void {
    if (!this.braki.includes(opis)) this.braki.push(opis);
  }
}

/** Wylicza wartości pól ZAM z danych rodziny i planu. Czysta funkcja – PDF wypełnia `wypelnijZAM`. */
export function wartosciZAM(zapytanie: ZapytanieWniosek, wersje: Parametry[] = WERSJE_DOMYSLNE): WartosciZAM {
  const { rodzina, osobaId } = zapytanie;
  const p = parametryNaDzien(rodzina.zdarzenie.data, wersje);
  const osoba = rodzina.osoby.find((o) => o.id === osobaId);
  if (!osoba) throw new BladWniosku(`W danych rodziny nie ma osoby "${osobaId}".`);
  const odcinki = odcinkiWniosku(zapytanie);
  const tytul = tytulWniosku(osoba, odcinki);
  const drugi = drugiRodzic(zapytanie);
  const w = new Zbieracz();

  daneWnioskodawcy(w, osoba.dane ?? {});
  danePlatnika(w, osoba, tytul);
  rachunek(w, osoba.dane?.rachunekBankowy);
  zakres(w, zapytanie, osoba, odcinki);
  informacjaOUbezpieczeniu(w, tytul);
  okolicznosci(w, zapytanie, osoba, odcinki, tytul, p);
  stronaPiata(w, zapytanie, osoba, odcinki, drugi);

  w.tekst('Page5.Data', dataWKratkach(rodzina.dataAnalizy));
  w.brak('Podpis wnioskodawcy (strona 5) – po wydrukowaniu');
  return { teksty: w.teksty, zaznaczone: w.zaznaczone, doUzupelnienia: w.braki };
}

/** Odcinki, o które wnioskuje osoba: jeden wskazany (`odcinekId`) albo wszystkie jej odcinki z typów ZAM. */
function odcinkiWniosku({ plan, osobaId, odcinekId }: ZapytanieWniosek): Odcinek[] {
  if (odcinekId !== undefined) {
    const o = plan.odcinki.find((x) => x.id === odcinekId);
    if (!o) throw new BladWniosku(`W planie nie ma odcinka "${odcinekId}".`);
    if (o.osobaId !== osobaId) throw new BladWniosku(`Odcinek "${odcinekId}" należy do innej osoby.`);
    if (!TYPY_ZAM.includes(o.typ)) throw new BladWniosku(`Za odcinek typu "${o.typ}" nie wnioskuje się na ZAM.`);
    return [o];
  }
  return plan.odcinki.filter((o) => o.osobaId === osobaId && TYPY_ZAM.includes(o.typ)).sort((a, b) => (a.od < b.od ? -1 : 1));
}

/** Tytuł ubezpieczenia, z którego płynie zasiłek: wskazany w odcinku albo pierwszy z ubezpieczeniem chorobowym. */
function tytulWniosku(osoba: Osoba, odcinki: Odcinek[]): TytulUbezpieczenia | undefined {
  const id = odcinki.find((o) => o.tytulId)?.tytulId;
  return (
    osoba.tytuly.find((t) => t.id === id) ?? osoba.tytuly.find((t) => t.chorobowe !== 'brak') ?? osoba.tytuly[0]
  );
}

/** Drugi rodzic (albo inny członek rodziny) – pierwsza inna osoba w rodzinie, rodzice mają pierwszeństwo. */
function drugiRodzic({ rodzina, osobaId }: ZapytanieWniosek): Osoba | undefined {
  const inni = rodzina.osoby.filter((o) => o.id !== osobaId);
  return inni.find((o) => o.rola !== 'inny_czlonek_rodziny') ?? inni[0];
}

function imieINazwisko(d: DaneOsobowe | undefined): string | undefined {
  const s = [d?.imie, d?.nazwisko].filter(Boolean).join(' ').trim();
  return s || undefined;
}

// Strona 1 – dane wnioskodawcy [zał. 6 pkt 3]
function daneWnioskodawcy(w: Zbieracz, d: DaneOsobowe): void {
  const pesel = tylkoCyfry(d.pesel);
  if (pesel?.length === 11) {
    w.tekst('Page1.PESEL', pesel);
  } else {
    // Bez PESEL-u formularz chce daty urodzenia i dokumentu tożsamości (rodzaj, seria i numer).
    const dokument = d.dokumentTozsamosci?.trim();
    if (dokument) w.tekst('Page1.Rodzajseriainumerdokumentu', dokument);
    else w.brak('PESEL wnioskodawcy, a gdy go nie ma: rodzaj, seria i numer dokumentu tożsamości (strona 1)');
    if (d.dataUrodzenia) w.tekst('Page1.Dataurodzenia', dataWKratkach(d.dataUrodzenia));
    else w.brak(opisPola('Page1.Dataurodzenia'));
  }
  w.tekstAlboBrak('Page1.Imie', d.imie);
  w.tekstAlboBrak('Page1.Nazwisko', d.nazwisko);

  const a = d.adres;
  if (!a || !(a.ulica || a.nrDomu || a.kod || a.miejscowosc)) {
    w.brak('Adres zamieszkania wnioskodawcy: ulica, numer domu i lokalu, kod pocztowy, miejscowość (strona 1)');
  } else {
    if (a.ulica) w.tekst('Page1.Ulica', a.ulica);
    w.tekstAlboBrak('Page1.Numerdomu', a.nrDomu);
    if (a.nrLokalu) w.tekst('Page1.Numerlokalu', a.nrLokalu);
    w.tekstAlboBrak('Page1.Kodpocztowy', a.kod);
    w.tekstAlboBrak('Page1.Poczta', a.miejscowosc);
    // Państwo wpisujemy tylko przy adresie za granicą; brak = Polska.
    const panstwo = a.panstwo?.trim();
    if (panstwo && panstwo.toLocaleLowerCase('pl') !== 'polska') w.tekst('Page1.Nazwapaństwa', panstwo);
  }
  // Telefon jest dobrowolny – nie dopisujemy go do braków.
  if (d.telefon?.trim()) w.tekst('Page1.Numertelefonu', d.telefon.trim());
}

// Strona 1 – płatnik składek [zał. 6 pkt 1–2]
function danePlatnika(w: Zbieracz, osoba: Osoba, tytul: TytulUbezpieczenia | undefined): void {
  const nip = tylkoCyfry(tytul?.nipPlatnika);
  const regon = tylkoCyfry(tytul?.regonPlatnika);
  if (nip?.length === 10) w.tekst('Page1.NIP', nip);
  // REGON tylko wtedy, gdy płatnik nie ma NIP-u (opis pola we wzorze ZUS). REGON ma 9 albo 14 cyfr.
  else if (regon?.length === 9 || regon?.length === 14) w.tekst('Page1.REGON', regon);
  else w.brak('NIP płatnika składek (a gdy go nie ma: REGON) – pracodawcy, zleceniodawcy albo własnej firmy (strona 1)');
  // Przy działalności płatnikiem jesteś Ty: „nazwa albo imię i nazwisko płatnika”.
  const wlasna = tytul?.rodzaj === 'dzialalnosc' ? imieINazwisko(osoba.dane) : undefined;
  w.tekstAlboBrak('Page1.Nazwaplatnika', tytul?.nazwaPlatnika ?? wlasna);
}

// Strona 2 – rachunek [zał. 6 pkt 17]; pole dobrowolne (bez niego ZUS wysyła przekaz pocztowy).
function rachunek(w: Zbieracz, nr: string | undefined): void {
  const cyfry = tylkoCyfry(nr);
  if (cyfry?.length === 26) w.tekst('Page2.Numerrachunku', cyfry);
  else w.brak('Numer rachunku bankowego, jeśli zasiłek ma trafiać na konto (strona 2)');
}

function okresy(odcinki: Odcinek[]): string {
  return odcinki.map((o) => okresPL(o.od, o.do)).join('\n');
}

/** Numery części (rodzicielski 1–5, ojcowski 1–2): z silnika, a gdy go brak – kolejność odcinków osoby. */
function czesci(odcinki: Odcinek[], wszystkieOsoby: Odcinek[]): string {
  return odcinki
    .map((o) => o.czescNr ?? wszystkieOsoby.filter((x) => x.typ === o.typ && x.od <= o.od).length)
    .join(', ');
}

// Strona 2 – zakres wniosku [zał. 6 pkt 7, 15, 16]
function zakres(w: Zbieracz, { plan }: ZapytanieWniosek, osoba: Osoba, odcinki: Odcinek[]): void {
  if (odcinki.length === 0) {
    w.brak('Za jaki urlop i za jaki okres ma być wypłacony zasiłek (strona 2)');
    return;
  }
  const typu = (typ: TypOdcinka) => odcinki.filter((o) => o.typ === typ);
  const odcinkiOsoby = plan.odcinki.filter((o) => o.osobaId === osoba.id);

  const mac = typu('macierzynski');
  const naWar = typu('na_warunkach_macierzynskiego');
  if (mac.length) w.zaznacz('Page2.macierzynskiego');
  if (naWar.length) w.zaznacz('Page2.nawarunkach');
  if (mac.length || naWar.length) w.tekst('Page2.Okres', okresy([...mac, ...naWar]));

  const rodz = typu('rodzicielski');
  if (rodz.length) {
    w.zaznacz('Page2.rodzicielskiego');
    w.tekst('Page2.Okres2', okresy(rodz));
    w.tekst('Page2.czesc', czesci(rodz, odcinkiOsoby));
  }

  const uzup = typu('uzupelniajacy');
  if (uzup.length) {
    w.zaznacz('Page2.uzMacierzynskiego');
    w.tekst('Page2.Okres3', okresy(uzup));
    // Uzupełniający urlop przypada bezpośrednio po macierzyńskim [KP art. 180² § 1, § 6].
    const przed = dodajDni(uzup[0].od, -1);
    const macierzynski =
      plan.odcinki.find((o) => (o.typ === 'macierzynski' || o.typ === 'na_warunkach_macierzynskiego') && o.do === przed) ??
      odcinkiOsoby.filter((o) => o.typ === 'macierzynski' || o.typ === 'na_warunkach_macierzynskiego').at(-1);
    if (macierzynski) w.tekst('Page2.Data2', dataWKratkach(macierzynski.do));
    else w.brak(opisPola('Page2.Data2'));
  }

  const ojc = typu('ojcowski');
  if (ojc.length) {
    w.zaznacz('Page2.ojcowskiego');
    w.tekst('Page2.Okres4', okresy(ojc));
    w.tekst('Page2.Numerlokalu2', czesci(ojc, odcinkiOsoby));
  }

  // Wariant 81,5%: wniosek matki (albo osoby przyjmującej dziecko) [UZ art. 30a ust. 1–2, art. 31 ust. 3 i 3g].
  const moze815 = osoba.rola === 'matka' || osoba.rola === 'przyjmujacy';
  if (plan.wariant815 && moze815 && (mac.length || naWar.length || rodz.length)) w.zaznacz('Page2.informuje');
}

// Strona 2 – „informacje o ubezpieczeniu”: tylko działalność i współpraca [zał. 6 pkt 4].
function informacjaOUbezpieczeniu(w: Zbieracz, tytul: TytulUbezpieczenia | undefined): void {
  if (tytul?.rodzaj !== 'dzialalnosc' && tytul?.rodzaj !== 'wspolpraca') return;
  w.zaznacz(tytul.chorobowe === 'brak' ? 'Page2.NIE' : 'Page2.TAK');
}

// Okoliczności 1–5 [zał. 6 pkt 5, 8–13]
function okolicznosci(
  w: Zbieracz,
  zapytanie: ZapytanieWniosek,
  osoba: Osoba,
  odcinki: Odcinek[],
  tytul: TytulUbezpieczenia | undefined,
  p: Parametry,
): void {
  const { zdarzenie } = zapytanie.rodzina;
  const zaZyciem = zdarzenie.dzieci.some((d) => d.zaZyciem);
  const daneDziecka = (klucz: KluczZAM) => wpiszDaneDzieci(w, klucz, zdarzenie);
  const zaZyciemImiona = (klucz: KluczZAM) => wpiszImionaZaZyciem(w, klucz, zdarzenie);

  // Okoliczność 5: osoba inna niż matka przejmuje urlop macierzyński [KP art. 180 § 4–17; UZ art. 29 ust. 3–10].
  const przejecie = osoba.rola !== 'matka' && odcinki.some((o) => o.typ === 'macierzynski');
  if (przejecie) {
    sytuacjaMatki(w, zapytanie, odcinki);
    daneDziecka('Page4.Tekst4b');
    if (zaZyciem) {
      w.zaznacz('Page4.ZaznaczX1d');
      zaZyciemImiona('Page4.podajimie');
    }
  } else if (zdarzenie.typ === 'porod') {
    const ustanie = tytul?.ustanie;
    const okol3 = ustanie?.przyczyna && ustanie.data < zdarzenie.data ? OKOLICZNOSC_3[ustanie.przyczyna] : undefined;
    const przedPorodem = odcinki.some((o) => o.od < zdarzenie.data);
    if (okol3) {
      // Okoliczność 3: urodzenie po ustaniu zatrudnienia [UZ art. 30 ust. 1].
      w.zaznacz('Page3._3');
      w.zaznacz(okol3);
      daneDziecka('Page3.Tekst13B');
      if (zaZyciem) {
        w.zaznacz('Page3.ZaznaczX1d');
        zaZyciemImiona('Page3.podajimie');
      }
    } else if (zdarzenie.przewidywana && przedPorodem) {
      // Okoliczność 2: zasiłek za okres przed porodem [rozp. Dz.U. 2026 poz. 1316 § 13 ust. 1 pkt 1].
      w.zaznacz('Page3._2');
      w.tekst('Page3.Data2a', dataWKratkach(zdarzenie.data));
    } else {
      // Okoliczność 1a: urodzenie dziecka. Przed porodem dane dziecka uzupełnisz po jego urodzeniu.
      w.zaznacz('Page2.ZaznaczX1a');
      daneDziecka('Page3.Tekst1');
      if (zaZyciem) {
        w.zaznacz('Page3.ZaznaczX1');
        zaZyciemImiona('Page3.podajimie1');
      }
    }
  } else if (zdarzenie.typ === 'przysposobienie' || zdarzenie.typ === 'rodzina_zastepcza_niezawodowa') {
    // Okoliczność 1b/1c: przyjęcie dziecka na wychowanie [UZ art. 29 ust. 1 pkt 2–3].
    w.zaznacz(zdarzenie.typ === 'przysposobienie' ? 'Page2.ZaznaczX1b' : 'Page2.ZaznaczX1c');
    w.tekst('Page2.Data', dataWKratkach(zdarzenie.data));
    daneDziecka('Page3.Tekst1');
    if (zaZyciem) {
      w.zaznacz('Page3.ZaznaczX1');
      zaZyciemImiona('Page3.podajimie1');
    }
  } else {
    // Rodzina zastępcza zawodowa nie ma prawa do zasiłku macierzyńskiego [UZ art. 29 ust. 1 pkt 3].
    w.brak('W związku z czym składany jest wniosek o zasiłek (strony 2–5)');
  }

  if (odcinki.some((o) => o.typ === 'uzupelniajacy')) okolicznosc4(w, zapytanie, p);
}

/**
 * Dane dziecka (dzieci) do pól „Dane dziecka” [zał. 6 pkt 8]: imię i nazwisko, data i miejsce urodzenia,
 * np. „Jan Kowalski, ur. 01.12.2026, Łódź” – każde dziecko w osobnej linii. Miejsca na PESEL dziecka ZAM nie ma.
 * Data urodzenia: `Dziecko.dataUrodzenia` (przyjęcie dziecka), a przy porodzie, który już był – data zdarzenia.
 */
export function daneDzieciTekst(zdarzenie: ZdarzenieDziecka): { tekst?: string; brakuje: string[] } {
  const brakuje = new Set<string>();
  const linie = zdarzenie.dzieci.map((d) => {
    const data = d.dataUrodzenia ?? (zdarzenie.typ === 'porod' && !zdarzenie.przewidywana ? zdarzenie.data : undefined);
    const imie = d.dane?.imie?.trim();
    const nazwisko = d.dane?.nazwisko?.trim();
    const miejsce = d.dane?.miejsceUrodzenia?.trim();
    if (!imie) brakuje.add('imię');
    if (!nazwisko) brakuje.add('nazwisko');
    if (!data) brakuje.add('data urodzenia');
    if (!miejsce) brakuje.add('miejsce urodzenia');
    return [[imie, nazwisko].filter(Boolean).join(' '), data && `ur. ${dataPL(data)}`, miejsce].filter(Boolean).join(', ');
  });
  // Bez imienia ani nazwiska żadnego dziecka pole zostaje puste – rodzic wpisze całość sam, w kolejności z formularza.
  const maNazwe = zdarzenie.dzieci.some((d) => d.dane?.imie?.trim() || d.dane?.nazwisko?.trim());
  const tekst = maNazwe ? linie.join('\n') : undefined;
  return { tekst, brakuje: [...brakuje] };
}

function wpiszDaneDzieci(w: Zbieracz, klucz: KluczZAM, zdarzenie: ZdarzenieDziecka): void {
  const strona = POLA_ZAM[klucz].strona;
  const { tekst, brakuje } = daneDzieciTekst(zdarzenie);
  if (!tekst) {
    w.brak(`Dane dziecka: imię i nazwisko, data i miejsce urodzenia (strona ${strona})`);
    return;
  }
  w.tekst(klucz, tekst);
  if (brakuje.length) w.brak(`Dane dziecka do uzupełnienia: ${brakuje.join(', ')} (strona ${strona})`);
}

/** Imiona dzieci z zaświadczeniem „Za życiem” [zał. 6 pkt 9]. */
function wpiszImionaZaZyciem(w: Zbieracz, klucz: KluczZAM, zdarzenie: ZdarzenieDziecka): void {
  const dzieci = zdarzenie.dzieci.filter((d) => d.zaZyciem);
  const imiona = dzieci.map((d) => d.dane?.imie?.trim()).filter((s): s is string => Boolean(s));
  if (imiona.length) w.tekst(klucz, imiona.join(', '));
  if (imiona.length < dzieci.length) {
    w.brak(`Imiona dzieci z zaświadczeniem „Za życiem” (strona ${POLA_ZAM[klucz].strona})`);
  }
}

// Okoliczność 4: uzupełniający urlop macierzyński [KP art. 180² § 1–3; zał. 6 pkt 12].
function okolicznosc4(w: Zbieracz, { rodzina }: ZapytanieWniosek, p: Parametry): void {
  const dzieci = rodzina.zdarzenie.dzieci;
  w.zaznacz('Page3._4');
  // Przy kilkorgu dzieci liczy się najmniejsza masa i najdłuższy pobyt w szpitalu [KP art. 180² § 2].
  const tygodnie = dzieci.map((d) => d.tydzienCiazy).filter((n): n is number => n !== undefined);
  const masy = dzieci.map((d) => d.masaG).filter((n): n is number => n !== undefined);
  const tydz = tygodnie.length ? Math.min(...tygodnie) : undefined;
  const masa = masy.length ? Math.min(...masy) : undefined;
  // Kategorie z formularza (strona 3) = progi z KP art. 180² § 1 pkt 1–3.
  const g = p.limity.uzupelniajacy;
  if (tydz !== undefined && tydz < g.tydzienCiazyWczesniak) w.zaznacz('Page3.skroceniem');
  else if (masa !== undefined && masa <= g.masaGWczesniak) w.zaznacz('Page3.przerwaniem4A');
  else if (tydz !== undefined && tydz < g.tydzienCiazyDonoszone && masa !== undefined) w.zaznacz('Page3.przerwaniem4B');
  else if (tydz !== undefined && tydz >= g.tydzienCiazyDonoszone) w.zaznacz('Page3.podjeciem');
  else w.brak('Tydzień ciąży w dniu porodu i masa urodzeniowa dziecka – do wyboru kategorii (strona 3)');

  const pobyty = [...new Set(dzieci.flatMap((d) => d.szpital ?? []).map((s) => okresPL(s.od, s.do)))];
  if (pobyty.length) w.tekst('Page3.Tekst4a', pobyty.join('\n'));
  else w.brak(opisPola('Page3.Tekst4a'));
  wpiszDaneDzieci(w, 'Page4.Tekst4c', rodzina.zdarzenie);
}

// Okoliczność 5: sytuacja matki, gdy urlop macierzyński przejmuje ojciec albo członek rodziny [zał. 6 pkt 13].
function sytuacjaMatki(w: Zbieracz, { rodzina, plan }: ZapytanieWniosek, odcinki: Odcinek[]): void {
  w.zaznacz('Page4._5');
  const matka = rodzina.osoby.find((o) => o.rola === 'matka');
  const start = odcinki.find((o) => o.typ === 'macierzynski')!.od;
  const z = matka?.zdrowie;
  const macierzynskiMatki = matka
    ? plan.odcinki.find((o) => o.osobaId === matka.id && o.typ === 'macierzynski' && o.do === dodajDni(start, -1))
    : undefined;

  let wybor: { klucz: KluczZAM; data: string } | undefined;
  if (z?.zgon) wybor = { klucz: 'Page4.smiercia', data: z.zgon }; // KP art. 180 § 14
  else if (z?.porzucenieDziecka) wybor = { klucz: 'Page4.porzuceniem', data: z.porzucenieDziecka }; // KP art. 180 § 15
  else if (z?.pobytWSzpitalu?.some((p) => czyWOkresie(start, p.od, p.do)))
    wybor = { klucz: 'Page4.przerwaniem4A', data: start }; // KP art. 180 § 16
  else if (z?.orzeczenieNiezdolnosciSamodzielnejEgzystencji && macierzynskiMatki)
    wybor = { klucz: 'Page4.przerwaniem4B', data: start }; // KP art. 180 § 8 (po 8 tygodniach)
  else if (macierzynskiMatki) wybor = { klucz: 'Page4.skroceniem', data: start }; // KP art. 180 § 8–9 (po 14 tygodniach)

  if (wybor) {
    w.zaznacz(wybor.klucz);
    w.tekst('Page4.Data5', dataWKratkach(wybor.data));
  } else {
    w.brak('Sytuacja matki dziecka i jej data (strona 4)');
  }

  const d = matka?.dane;
  const pesel = tylkoCyfry(d?.pesel);
  const nazwa = imieINazwisko(d);
  const dokument = d?.dokumentTozsamosci?.trim();
  if (nazwa && pesel?.length === 11) w.tekst('Page4.Tekst13', `${nazwa}, PESEL ${pesel}`);
  // Bez PESEL-u: seria i numer dokumentu tożsamości oraz data urodzenia (opis pola we wzorze ZUS).
  else if (nazwa && dokument && d?.dataUrodzenia) w.tekst('Page4.Tekst13', `${nazwa}, ${dokument}, ur. ${dataPL(d.dataUrodzenia)}`);
  else w.brak('Dane matki dziecka: imię, nazwisko i PESEL (strona 4)');
}

// Strona 5: oświadczenie przy urlopie ojcowskim, informacja o drugim rodzicu [zał. 6 pkt 6, 14].
function stronaPiata(
  w: Zbieracz,
  { plan, osobaId }: ZapytanieWniosek,
  osoba: Osoba,
  odcinki: Odcinek[],
  drugi: Osoba | undefined,
): void {
  if (odcinki.some((o) => o.typ === 'ojcowski')) {
    // Oświadczenie: czy za okres urlopu ojcowskiego był już zasiłek z innego tytułu ubezpieczenia.
    const zInnego = osoba.oswiadczenia?.ojcowskiZInnegoTytulu;
    if (zInnego === true) {
      w.zaznacz('Page5.TAK2');
      // Tytułu i okresu tego zasiłku kontrakt nie ma – rodzic wpisze je sam.
      w.brak(opisPola('Page5.Okres1'));
    } else if (zInnego === false) {
      w.zaznacz('Page5.NIE2');
    } else {
      w.brak('Oświadczenie, czy za okres urlopu ojcowskiego był już wypłacany zasiłek z innego tytułu (strona 5)');
    }
  }
  if (!odcinki.some((o) => o.typ === 'rodzicielski' || o.typ === 'uzupelniajacy')) return;

  const drugiegoRodzica = plan.odcinki
    .filter((o) => o.osobaId !== osobaId && (o.typ === 'rodzicielski' || o.typ === 'uzupelniajacy'))
    .sort((a, b) => (a.od < b.od ? -1 : 1));
  if (drugiegoRodzica.length) {
    w.zaznacz('Page5.TAK');
    w.tekst('Page5.Okres', drugiegoRodzica.map((o) => okresPL(o.od, o.do)).join('; '));
  } else if (drugi) {
    w.zaznacz('Page5.NIE');
  } else {
    w.brak('Czy drugi rodzic będzie korzystał z zasiłku za urlop rodzicielski – TAK albo NIE (strona 5)');
  }

  if (!drugi) {
    w.brak('Dane drugiego rodzica, jeśli dziecko go ma: PESEL, imię i nazwisko (strona 5)');
    return;
  }
  const d = drugi.dane ?? {};
  const pesel = tylkoCyfry(d.pesel);
  if (pesel?.length === 11) {
    w.tekst('Page5.PESEL', pesel);
  } else {
    // Bez PESEL-u: data urodzenia i dokument tożsamości (rodzaj, seria i numer) [zał. 6 pkt 6].
    const dokument = d.dokumentTozsamosci?.trim();
    if (d.dataUrodzenia) w.tekst('Page5.Dataurodzenia', dataWKratkach(d.dataUrodzenia));
    if (dokument) {
      w.tekst('Page5.Rodzajseriainumerdokumentu', dokument);
      if (!d.dataUrodzenia) w.brak(opisPola('Page5.Dataurodzenia'));
    } else if (d.dataUrodzenia) {
      w.brak('PESEL drugiego rodzica, a jeśli go nie ma: dokument tożsamości (strona 5)');
    } else {
      w.brak('PESEL drugiego rodzica (strona 5)');
    }
  }
  w.tekstAlboBrak('Page5.Imie', d.imie);
  w.tekstAlboBrak('Page5.Nazwisko', d.nazwisko);
}
