/**
 * Kwoty zasiłków za odcinki planu: stawka, stawka dzienna, kawałki o stałej stawce, rozbicie na miesiące,
 * zaliczka na podatek, podwyższenie do kwoty świadczenia rodzicielskiego i ścieżka wyliczenia.
 */
import { czyPoprawna, koniecPoTygodniach, liczbaDni, pierwszyDzienMiesiaca, pozniejsza, rozbijNaMiesiace } from '../daty';
import { parametryNaDzien } from '../params';
import { doGrosza, suma } from '../pieniadze';
import type {
  DataISO, Komunikat, KrokWyliczenia, KwotaOdcinka, MiesiacISO, Odcinek, Osoba, Parametry, Plan, PodstawaWymiaru,
  PoziomKomunikatu, Rodzina, TytulUbezpieczenia, WynikKwot,
} from '../types';
import { dzienPoLimicie, pierwszyRodzic, podzielNaKawalki, type Okres } from './kawalki';
import { proc, procentZ, razyDni, stawkaDzienna, zl } from './liczby';
import { zaliczkaMiesieczna } from './podatek';
import { minimumArt45, obliczPodstawe } from './podstawa';
import { mieszczyPelnyMiesiac } from './podstawaDobrowolne';
import { czyZPodwyzszeniem, dniZasilkuWMiesiacu, podwyzszenieMiesiaca, wzorKwotyOdniesienia } from './podwyzszenie';
import { stawkaOdcinka, type Stawka } from './stawki';

/**
 * Data wcześniejsza niż każda wersja parametrów. Przy błędnej dacie odcinka nie szukamy parametrów po niej:
 * `parametryNaDzien` zwraca wtedy najstarszą wersję, a do rozpoznania, czy odcinek jest płatny, to wystarcza.
 */
const DATA_PRZED_WSZYSTKIMI_WERSJAMI: DataISO = '0001-01-01';

const PRZEPIS_PODWYZSZENIA = 'UZ art. 31 ust. 3a–3c; Poradnik ZUS 2026, s. 19';

interface Rozpoznany {
  osoba: Osoba;
  tytul: TytulUbezpieczenia;
  /** Stawka z pierwszego dnia odcinka (rozpoznanie, czy odcinek jest płatny). */
  stawka: Stawka;
  /** Wymiar pracy z odcinka, o ile mieści się w przedziale od 0 do 1. */
  wymiarPracy?: number;
}

/** Kawałek odcinka o stałej stawce dziennej, liczony parametrami z jego pierwszego dnia. */
interface Kawalek extends Okres {
  dni: number;
  p: Parametry;
  stawka: Stawka;
  podstawa: number;
  /** Podstawę kawałka podniesiono do minimum z art. 45 według płacy minimalnej z jego wersji parametrów (EC-97). */
  minimumZWersji: boolean;
  dzienniePrzedPomniejszeniem: number;
  dziennie: number;
  kwota: number;
}

/** Fragment odcinka przypadający na jeden miesiąc kalendarzowy. */
interface Czesc {
  /** Indeks odcinka w liście rozpoznanych odcinków. */
  i: number;
  osoba: Osoba;
  tytulId: string;
  miesiac: MiesiacISO;
  /** Zasiłek w groszach. */
  grosze: number;
  /** Zasiłek bez pomniejszenia za pracę z UZ art. 31 ust. 4a, w groszach (do porównania przy podwyższeniu). */
  groszeBezPomniejszenia: number;
}

/** Czy tytuł trwa w dniu `dzien`: zaczął się najpóźniej tego dnia i nie skończył się (`do`, `ustanie`) przed nim. */
function aktywnyWDniu(t: TytulUbezpieczenia, dzien: DataISO): boolean {
  return t.od <= dzien && (t.do === undefined || t.do >= dzien) && (t.ustanie === undefined || t.ustanie.data >= dzien);
}

/**
 * Tytuł, z którego płynie zasiłek za odcinek. Wskazany w odcinku (`tytulId`) – także bez ubezpieczenia chorobowego:
 * wtedy undefined i uwaga, bo zasiłek przysługuje tylko z ubezpieczenia chorobowego (UZ art. 29 ust. 1). Gdy `tytulId` brak
 * albo osoba nie ma takiego tytułu: pierwszy tytuł z chorobowym trwający w dniu początku odcinka, a gdy takiego nie ma –
 * pierwszy tytuł z chorobowym.
 */
function znajdzTytul(osoba: Osoba, odcinek: Odcinek): TytulUbezpieczenia | undefined {
  const wskazany = osoba.tytuly.find((t) => t.id === odcinek.tytulId);
  if (wskazany !== undefined) return wskazany.chorobowe === 'brak' ? undefined : wskazany;
  const zChorobowym = osoba.tytuly.filter((t) => t.chorobowe !== 'brak');
  return zChorobowym.find((t) => aktywnyWDniu(t, odcinek.od)) ?? zChorobowym[0];
}

function uwaga(
  kod: string, odcinek: Odcinek, tresc: string, coZrobic: string, poziom: PoziomKomunikatu = 'ostrzezenie', przepis?: string,
): Komunikat {
  return { kod, poziom, tresc, coZrobic, osobaId: odcinek.osobaId, odcinekId: odcinek.id, ...(przepis ? { przepis } : {}) };
}

/** Ograniczenie podstawy (`PodstawaWymiaru.ograniczenia`) → uwaga dla rodzica o brakujących danych. */
const UWAGI_O_DANYCH_PODSTAWY: { ograniczenie: string; kod: string; tresc: string; coZrobic: string }[] = [
  {
    ograniczenie: 'brak_danych_o_przychodzie',
    kod: 'BRAK_DANYCH_O_PRZYCHODZIE',
    tresc: 'Nie mamy danych o wynagrodzeniu ani o podstawie składek z tego tytułu, więc zasiłek policzyliśmy bez nich: od najniższej możliwej podstawy albo od zera. Prawdziwa kwota może być wyższa.',
    coZrobic: 'Proszę uzupełnić wynagrodzenie brutto albo podstawy składek z 12 miesięcy przed urlopem. Te dane są w eZUS albo na pasku wynagrodzenia.',
  },
  {
    ograniczenie: 'podstawa_z_ostatnich_znanych_miesiecy',
    kod: 'PODSTAWA_SZACOWANA',
    tresc: 'Nie mamy podstaw składek z 12 miesięcy przed miesiącem, w którym zaczyna się zasiłek, więc podstawę oszacowaliśmy z ostatnich znanych miesięcy. Płatnik zasiłku albo ZUS może wyliczyć inną kwotę.',
    coZrobic: 'Warto uzupełnić wynagrodzenie albo podstawy składek za miesiące tuż przed urlopem. Te dane są w eZUS albo na pasku wynagrodzenia.',
  },
];

/** Uwagi o brakujących danych podstawy: każda raz na parę osoba + tytuł, z `osobaId`. */
function uwagiODanychPodstawy(podstawy: PodstawaWymiaru[]): Komunikat[] {
  const wynik: Komunikat[] = [];
  const juz = new Set<string>();
  for (const podstawa of podstawy) {
    for (const { ograniczenie, kod, tresc, coZrobic } of UWAGI_O_DANYCH_PODSTAWY) {
      const k = `${podstawa.osobaId}|${podstawa.tytulId}|${kod}`;
      if (!podstawa.ograniczenia.includes(ograniczenie) || juz.has(k)) continue;
      juz.add(k);
      wynik.push({ kod, poziom: 'ostrzezenie', tresc, coZrobic, osobaId: podstawa.osobaId });
    }
  }
  return wynik;
}

const sumaGroszy = (grosze: number[]): number => grosze.reduce((s, g) => s + g, 0);

/**
 * Rozdziela kwotę miesiąca (w groszach) na kawałki proporcjonalnie do ich kwot (w groszach).
 * Wszystkie kawałki poza ostatnim zaokrąglamy w dół, ostatni dostaje resztę, więc suma zgadza się co do grosza.
 */
function rozdzielProporcjonalnie(kwotaGrosze: number, kawalkiGrosze: number[]): number[] {
  const razem = sumaGroszy(kawalkiGrosze);
  const wynik: number[] = [];
  let przydzielone = 0;
  kawalkiGrosze.forEach((k, i) => {
    const ostatni = i === kawalkiGrosze.length - 1;
    const udzial = ostatni || razem === 0 ? kwotaGrosze - przydzielone : Math.floor((kwotaGrosze * k) / razem);
    wynik.push(udzial);
    przydzielone += udzial;
  });
  return wynik;
}

/**
 * Zaliczka na podatek (w groszach) przypadająca na każdą część, liczona od kwot `kwota(c)`.
 * Każdy płatnik liczy zaliczkę osobno za miesiąc (zus.pl, „Podwyższenie kwoty zasiłku macierzyńskiego…”, przykład 4),
 * więc grupujemy po parze osoba + tytuł + miesiąc, a zaliczkę grupy rozdzielamy na części proporcjonalnie do kwot.
 */
function rozliczZaliczki(czesci: Czesc[], kwota: (c: Czesc) => number, wersje: Parametry[]): number[] {
  const wynik = czesci.map(() => 0);
  const grupy = new Map<string, number[]>();
  czesci.forEach((c, j) => {
    const g = `${c.osoba.id}|${c.tytulId}|${c.miesiac}`;
    grupy.set(g, [...(grupy.get(g) ?? []), j]);
  });
  for (const grupa of grupy.values()) {
    const { osoba, tytulId, miesiac } = czesci[grupa[0]];
    // ustawa o PIT art. 31b ust. 1: kwota zmniejszająca tylko po oświadczeniu i łącznie nie więcej niż 1/12,
    // więc stosujemy ją przy pierwszym (wg kolejności tytułów osoby) tytule, z którego w tym miesiącu płynie zasiłek.
    const tytulyZZasilkiem = new Set(czesci.filter((c) => c.osoba.id === osoba.id && c.miesiac === miesiac && kwota(c) > 0).map((c) => c.tytulId));
    const pierwszyTytul = osoba.tytuly.find((t) => tytulyZZasilkiem.has(t.id));
    const zKwotaZmniejszajaca = osoba.pit2 === true && pierwszyTytul?.id === tytulId;
    // parametry z pierwszego dnia miesiąca, za który liczymy zaliczkę
    const pMiesiaca = parametryNaDzien(pierwszyDzienMiesiaca(miesiac), wersje);
    const kwoty = grupa.map((j) => kwota(czesci[j]));
    const zaliczka = zaliczkaMiesieczna(sumaGroszy(kwoty) / 100, zKwotaZmniejszajaca, pMiesiaca);
    rozdzielProporcjonalnie(Math.round(zaliczka * 100), kwoty).forEach((udzial, n) => {
      wynik[grupa[n]] = udzial;
    });
  }
  return wynik;
}

/** Sąsiednie kawałki o tych samych liczbach łączymy: nowa wersja parametrów, która nie zmienia stawki, nie dzieli odcinka. */
function scalKawalki(kawalki: Kawalek[]): Kawalek[] {
  const wynik: Kawalek[] = [];
  for (const k of kawalki) {
    const ostatni = wynik[wynik.length - 1];
    const takieSame =
      ostatni !== undefined &&
      ostatni.stawka.proc === k.stawka.proc &&
      ostatni.stawka.przepis === k.stawka.przepis &&
      ostatni.podstawa === k.podstawa &&
      ostatni.dziennie === k.dziennie;
    if (takieSame) {
      const dni = ostatni.dni + k.dni;
      wynik[wynik.length - 1] = { ...ostatni, do: k.do, dni, kwota: razyDni(ostatni.dziennie, dni) };
    } else {
      wynik.push(k);
    }
  }
  return wynik;
}

/** Ścieżka wyliczenia odcinka: podstawa, stawka i stawka dzienna każdego kawałka, kwota za kawałek i za cały odcinek. */
function sciezkaOdcinka(podstawa: number, kawalki: Kawalek[], wymiarPracy: number | undefined, dni: number, razem: number): KrokWyliczenia[] {
  const sciezka: KrokWyliczenia[] = [{ opis: 'Podstawa wymiaru', wartosc: podstawa }];
  const wiele = kawalki.length > 1;
  kawalki.forEach((k, i) => {
    const poprzedni: Kawalek | undefined = kawalki[i - 1];
    const odKiedy = poprzedni === undefined ? '' : ` od ${k.od}`;
    if (k.podstawa !== (poprzedni?.podstawa ?? podstawa)) {
      sciezka.push(
        k.minimumZWersji
          ? {
              opis: `Podstawa podniesiona do minimalnego wynagrodzenia po odliczeniu składek${odKiedy}`,
              wzor: `płaca minimalna ${zl(k.p.kwoty.placaMinimalna)} (proporcjonalnie do wymiaru etatu) × (100% − ${proc(k.p.kwoty.skladkiPracownikaProc)})`,
              wartosc: k.podstawa,
              przepis: 'UZ art. 45 ust. 1',
            }
          : { opis: `Podstawa wymiaru${odKiedy}`, wartosc: k.podstawa },
      );
    }
    if (poprzedni === undefined || poprzedni.stawka.proc !== k.stawka.proc || poprzedni.stawka.przepis !== k.stawka.przepis) {
      sciezka.push({ opis: `Stawka za ${k.stawka.nazwa}${odKiedy}`, wzor: proc(k.stawka.proc), przepis: k.stawka.przepis });
    }
    // UZ art. 36 ust. 3
    sciezka.push({
      opis: `Stawka dzienna${odKiedy}`,
      wzor: `${zl(k.podstawa)} ÷ ${k.p.kwoty.dniWMiesiacuDoStawkiDziennej} × ${proc(k.stawka.proc)}`,
      wartosc: k.dzienniePrzedPomniejszeniem,
    });
    if (wymiarPracy !== undefined) {
      sciezka.push({
        opis: `Pomniejszenie za pracę w trakcie urlopu${odKiedy}`,
        wzor: `${zl(k.dzienniePrzedPomniejszeniem)} × (100% − ${proc(wymiarPracy * 100)})`,
        wartosc: k.dziennie,
        przepis: 'UZ art. 31 ust. 4a',
      });
    }
    if (wiele) sciezka.push({ opis: `Od ${k.od} do ${k.do}: ${k.dni} × ${zl(k.dziennie)}`, wartosc: k.kwota });
  });
  sciezka.push({
    opis: `Za ${dni} dni`,
    wzor: wiele ? kawalki.map((k) => zl(k.kwota)).join(' + ') : `${dni} × ${zl(kawalki[0].dziennie)}`,
    wartosc: razem,
  });
  return sciezka;
}

export function obliczKwoty(rodzina: Rodzina, plan: Plan, wersje: Parametry[]): WynikKwot {
  const uwagi: Komunikat[] = [];
  const rozpoznane: { odcinek: Odcinek; r: Rozpoznany }[] = [];

  for (const odcinek of plan.odcinki) {
    const datyOk = czyPoprawna(odcinek.od) && czyPoprawna(odcinek.do);
    const p = parametryNaDzien(datyOk ? odcinek.od : DATA_PRZED_WSZYSTKIMI_WERSJAMI, wersje);
    const stawka = stawkaOdcinka(odcinek, plan, p);
    if (!stawka) continue;
    if (!datyOk) {
      uwagi.push(uwaga('ODCINEK_BLEDNA_DATA', odcinek, 'Ten okres ma niepoprawną datę początku lub końca, więc nie policzyliśmy za niego kwoty.', 'Proszę wpisać daty w formacie rok-miesiąc-dzień, np. 2027-04-20.'));
      continue;
    }
    const osoba = rodzina.osoby.find((o) => o.id === odcinek.osobaId);
    if (!osoba) {
      uwagi.push(uwaga('NIEZNANA_OSOBA', odcinek, 'Ten okres jest przypisany do osoby, której nie ma w danych rodziny, więc nie policzyliśmy za niego kwoty.', 'Proszę wybrać osobę z listy albo dodać ją do rodziny.'));
      continue;
    }
    if (odcinek.od > odcinek.do) {
      uwagi.push(uwaga('ODCINEK_ODWROCONY', odcinek, 'Ten okres kończy się przed swoim początkiem, więc nie policzyliśmy za niego kwoty.', 'Proszę poprawić daty tego okresu.'));
      continue;
    }
    const tytul = znajdzTytul(osoba, odcinek);
    if (!tytul) {
      const wskazanyBezChorobowego = osoba.tytuly.some((t) => t.id === odcinek.tytulId);
      uwagi.push(wskazanyBezChorobowego
        ? uwaga('BRAK_TYTULU_Z_CHOROBOWYM', odcinek, 'Tytuł wybrany dla tego okresu nie ma ubezpieczenia chorobowego, więc za ten okres nie policzyliśmy zasiłku.', 'Proszę wybrać tytuł z ubezpieczeniem chorobowym albo sprawdzić dane o ubezpieczeniu tej osoby.')
        : uwaga('BRAK_TYTULU_Z_CHOROBOWYM', odcinek, 'Ta osoba nie ma tytułu z ubezpieczeniem chorobowym, więc za ten okres nie policzyliśmy zasiłku.', 'Warto sprawdzić dane o ubezpieczeniu tej osoby.'));
      continue;
    }
    const wymiarOk = odcinek.wymiarPracy !== undefined && odcinek.wymiarPracy >= 0 && odcinek.wymiarPracy <= 1;
    if (odcinek.wymiarPracy !== undefined && !wymiarOk) {
      uwagi.push(uwaga('WYMIAR_PRACY_POZA_ZAKRESEM', odcinek, 'Wymiar pracy w tym okresie musi być liczbą od 0 do 1 (np. 0,5 to pół etatu), więc policzyliśmy zasiłek bez pomniejszenia za pracę.', 'Proszę poprawić wymiar pracy w tym okresie.'));
    }
    rozpoznane.push({ odcinek, r: { osoba, tytul, stawka, wymiarPracy: wymiarOk ? odcinek.wymiarPracy : undefined } });
  }

  // UZ art. 43: podstawy nie ustala się na nowo, gdy między okresami pobierania zasiłków nie było przerwy albo była
  // krótsza niż miesiąc kalendarzowy. Płatne odcinki pary osoba + tytuł (po dacie początku) dzielimy na łańcuchy:
  // nowy łańcuch zaczyna się po przerwie obejmującej cały miesiąc kalendarzowy (`mieszczyPelnyMiesiac`).
  // Jedna podstawa na łańcuch, na dzień początku jego pierwszego odcinka.
  const para = (r: Rozpoznany) => `${r.osoba.id}|${r.tytul.id}`;
  const odcinkiPary = new Map<string, number[]>();
  rozpoznane.forEach(({ r }, i) => odcinkiPary.set(para(r), [...(odcinkiPary.get(para(r)) ?? []), i]));
  /** Indeks odcinka w `rozpoznane` → klucz jego łańcucha. */
  const lancuchOdcinka: string[] = rozpoznane.map(() => '');
  const poczatekLancucha = new Map<string, DataISO>();
  for (const [k, indeksy] of odcinkiPary) {
    const odDnia = (i: number) => rozpoznane[i].odcinek.od;
    let numer = 0;
    let koniec: DataISO | undefined;
    for (const i of [...indeksy].sort((a, b) => odDnia(a).localeCompare(odDnia(b)))) {
      const { odcinek } = rozpoznane[i];
      if (koniec !== undefined && mieszczyPelnyMiesiac(koniec, odcinek.od)) numer += 1;
      const lancuch = `${k}|${numer}`;
      if (!poczatekLancucha.has(lancuch)) poczatekLancucha.set(lancuch, odcinek.od);
      lancuchOdcinka[i] = lancuch;
      koniec = koniec === undefined ? odcinek.do : pozniejsza(koniec, odcinek.do);
    }
  }
  // Kolejność podstaw w wyniku: kolejność pierwszego użycia łańcucha w planie.
  const podstawy = new Map<string, PodstawaWymiaru>();
  rozpoznane.forEach(({ r }, i) => {
    const lancuch = lancuchOdcinka[i];
    const data = poczatekLancucha.get(lancuch);
    if (!podstawy.has(lancuch) && data !== undefined) podstawy.set(lancuch, obliczPodstawe(r.osoba, r.tytul, data, wersje));
  });
  uwagi.push(...uwagiODanychPodstawy([...podstawy.values()]));

  // UZ art. 31 ust. 3f w zw. z KP art. 182¹a § 4: przy wariancie 81,5% zasiłek za część urlopu rodzicielskiego
  // przysługującą drugiemu rodzicowi wynosi 70%. Ta część to pierwsze `rodzicielskiNieprzenoszalne` tygodni urlopu
  // rodzicielskiego tej osoby, liczone chronologicznie po jej odcinkach. Mapa: osoba → pierwszy dzień po tej części
  // (undefined = cały jej urlop rodzicielski mieści się w tej części).
  const czescDrugiego = new Map<string, DataISO | undefined>();
  if (plan.wariant815) {
    const pierwszy = pierwszyRodzic(rozpoznane.map(({ odcinek }) => odcinek), rodzina.osoby);
    for (const osoba of pierwszy === undefined ? [] : rodzina.osoby.filter((o) => o.id !== pierwszy)) {
      const okresy = rozpoznane.filter(({ odcinek }) => odcinek.osobaId === osoba.id && odcinek.typ === 'rodzicielski').map(({ odcinek }) => odcinek);
      if (okresy.length === 0) continue;
      const poczatek = okresy.reduce((a, o) => (o.od < a ? o.od : a), okresy[0].od);
      const tygodnie = parametryNaDzien(poczatek, wersje).wymiaryTyg.rodzicielskiNieprzenoszalne;
      // liczba dni w tych tygodniach (tydzień = 7 dni kalendarzowych, kontrakt `types.ts`)
      czescDrugiego.set(osoba.id, dzienPoLimicie(okresy, liczbaDni(poczatek, koniecPoTygodniach(poczatek, tygodnie))));
    }
  }

  const graniceWersji = wersje.map((w) => w.obowiazujeOd);
  const policzone = rozpoznane.map(({ odcinek, r }, i) => {
    const podstawa = podstawy.get(lancuchOdcinka[i])?.kwota ?? 0;
    const drugiRodzic = odcinek.typ === 'rodzicielski' && czescDrugiego.has(r.osoba.id);
    const koniecCzesci = drugiRodzic ? czescDrugiego.get(r.osoba.id) : undefined;
    // Kawałki o stałej stawce: granice wersji parametrów (`obowiazujeOd`) i koniec części drugiego rodzica.
    const granice = koniecCzesci === undefined ? graniceWersji : [...graniceWersji, koniecCzesci];
    const kawalki = scalKawalki(
      podzielNaKawalki(odcinek.od, odcinek.do, granice).map((okres): Kawalek => {
        const p = parametryNaDzien(okres.od, wersje);
        const czescDrugiegoRodzica = drugiRodzic && (koniecCzesci === undefined || okres.od < koniecCzesci);
        const stawka = stawkaOdcinka(odcinek, plan, p, { czescDrugiegoRodzica }) ?? r.stawka;
        // EC-97, UZ art. 45 ust. 1 (pracownicy: UZ art. 47): minimum według płacy minimalnej z wersji parametrów kawałka.
        // `obliczPodstawe` daje pracownikowi podstawę nie niższą niż minimum z wersji, na którą ją ustalono
        // (także przy łańcuchu zasiłków z art. 43), więc minimum wyższe od podstawy oznacza nowszą płacę minimalną.
        // NIEJASNE (pytanie nr 60): czy ZUS podnosi podstawę do nowego minimum w trakcie pobierania zasiłku.
        const minimum = r.tytul.rodzaj === 'umowa_o_prace' ? minimumArt45(r.tytul, p) : 0;
        const minimumZWersji = minimum > podstawa;
        const podstawaKawalka = minimumZWersji ? minimum : podstawa;
        // UZ art. 36 ust. 3
        const dzienniePrzedPomniejszeniem = stawkaDzienna(podstawaKawalka, stawka.proc, p.kwoty.dniWMiesiacuDoStawkiDziennej);
        // UZ art. 31 ust. 4a: przy łączeniu urlopu rodzicielskiego z pracą zasiłek jest pomniejszony o część etatu, na której pracujesz
        const dziennie = r.wymiarPracy === undefined ? dzienniePrzedPomniejszeniem : procentZ(dzienniePrzedPomniejszeniem, (1 - r.wymiarPracy) * 100);
        // UZ art. 11 ust. 4 w związku z art. 31 ust. 5: zasiłek za każdy dzień kalendarzowy
        return { ...okres, p, stawka, podstawa: podstawaKawalka, minimumZWersji, dzienniePrzedPomniejszeniem, dziennie, kwota: razyDni(dziennie, okres.dni) };
      }),
    );

    if (kawalki.length > 1) {
      uwagi.push(uwaga('ODCINEK_ZE_ZMIANA_STAWKI', odcinek,
        'W tym okresie zmienia się stawka albo podstawa zasiłku, więc policzyliśmy go w częściach. Przy okresie pokazujemy stawkę dzienną z pierwszej części, a kwota razem obejmuje wszystkie części.',
        'Każda część z jej stawką dzienną jest w ścieżce wyliczenia.', 'info'));
    }
    const zNowymMinimum = kawalki.find((kaw) => kaw.minimumZWersji);
    if (zNowymMinimum !== undefined) {
      const odKiedy = zNowymMinimum.p.obowiazujeOd;
      uwagi.push(uwaga('DO_POTWIERDZENIA_W_ZUS', odcinek,
        `Od ${odKiedy} obowiązuje wyższa płaca minimalna, więc ${zNowymMinimum.od === odKiedy ? 'od tego dnia' : `za dni od ${zNowymMinimum.od}`} ` +
          'liczymy zasiłek od wyższej podstawy minimalnej. Nie mamy pewności, czy ZUS podnosi w ten sposób podstawę ustaloną wcześniej, dlatego ta kwota wymaga potwierdzenia w ZUS.',
        'Warto zapytać w ZUS albo u płatnika zasiłku, czy podstawa wzrośnie razem z płacą minimalną.', 'ostrzezenie', 'UZ art. 45 ust. 1'));
    }
    // EC-70, NIEJASNE (pytanie 5): przejęcie części urlopu macierzyńskiego przez inną osobę niż matka –
    // stawka z planu (UZ art. 31 ust. 1 albo 3), podstawa tej osoby (research: pewność średnia).
    if (odcinek.typ === 'macierzynski' && r.osoba.rola !== 'matka') {
      uwagi.push(uwaga('DO_POTWIERDZENIA_W_ZUS', odcinek,
        'Ta osoba przejmuje część urlopu macierzyńskiego. Zasiłek za ten okres policzyliśmy od jej własnej podstawy i według stawki wybranej w planie, ale to wymaga potwierdzenia w ZUS.',
        'Proszę zapytać w ZUS, jaka stawka i czyja podstawa obowiązują przy przejęciu urlopu macierzyńskiego.', 'ostrzezenie', 'UZ art. 31 ust. 1 i 3'));
    }

    const dni = liczbaDni(odcinek.od, odcinek.do);
    const razem = suma(kawalki.map((kaw) => kaw.kwota));
    const poMiesiacach = new Map<MiesiacISO, { dni: number; grosze: number; groszeBezPomniejszenia: number }>();
    for (const kaw of kawalki) {
      for (const m of rozbijNaMiesiace(kaw.od, kaw.do)) {
        const dotad = poMiesiacach.get(m.miesiac) ?? { dni: 0, grosze: 0, groszeBezPomniejszenia: 0 };
        poMiesiacach.set(m.miesiac, {
          dni: dotad.dni + m.dni,
          grosze: dotad.grosze + Math.round(razyDni(kaw.dziennie, m.dni) * 100),
          groszeBezPomniejszenia: dotad.groszeBezPomniejszenia + Math.round(razyDni(kaw.dzienniePrzedPomniejszeniem, m.dni) * 100),
        });
      }
    }
    const pierwszy = kawalki[0];
    const wpis: KwotaOdcinka = {
      odcinekId: odcinek.id,
      osobaId: odcinek.osobaId,
      podstawa: pierwszy.podstawa,
      stawkaProc: pierwszy.stawka.proc,
      dziennie: pierwszy.dziennie,
      dni,
      razem,
      miesiecznie: razyDni(pierwszy.dziennie, pierwszy.p.kwoty.dniWMiesiacuDoStawkiDziennej),
      rozbicieMiesieczne: [...poMiesiacach].map(([miesiac, m]) => ({ miesiac, dni: m.dni, kwota: doGrosza(m.grosze / 100) })),
      sciezka: sciezkaOdcinka(podstawa, kawalki, r.wymiarPracy, dni, razem),
    };
    return { wpis, poMiesiacach };
  });
  const brutto = policzone.map(({ wpis }) => wpis);

  // Części = fragmenty odcinków przypadające na miesiące kalendarzowe (w kolejności odcinków w planie).
  const czesci: Czesc[] = policzone.flatMap(({ poMiesiacach }, i) =>
    [...poMiesiacach].map(([miesiac, m]) => ({
      i, osoba: rozpoznane[i].r.osoba, tytulId: rozpoznane[i].r.tytul.id, miesiac, grosze: m.grosze, groszeBezPomniejszenia: m.groszeBezPomniejszenia,
    })),
  );
  const zaliczki = rozliczZaliczki(czesci, (c) => c.grosze, wersje);
  // Zaliczka od zasiłku bez pomniejszenia z ust. 4a – tylko do porównania przy podwyższeniu (niżej), nie do wypłaty.
  const zaliczkiBezPomniejszenia = rozliczZaliczki(czesci, (c) => c.groszeBezPomniejszenia, wersje);

  // Podwyższenie do kwoty świadczenia rodzicielskiego (UZ art. 31 ust. 3a–3c): dla osoby za miesiąc kalendarzowy,
  // od łącznej kwoty zasiłków ze wszystkich tytułów po zaliczce na podatek (Poradnik ZUS 2026, s. 19; zus.pl,
  // „Podwyższenie kwoty zasiłku macierzyńskiego…”), tylko za dni odcinków, których dotyczy (`czyZPodwyzszeniem`):
  // zasiłek za urlop ojcowski w tym samym miesiącu nie wchodzi ani do porównania, ani do podwyższenia.
  const podwyzszenieOdcinka = brutto.map(() => 0);
  const krokiPodwyzszenia: KrokWyliczenia[][] = brutto.map(() => []);
  const osobyZPodwyzszeniem = new Set<string>();
  const uzupelniajaceZPodwyzszeniem = new Set<number>();
  const laczenieZPracaDoPotwierdzenia = new Set<number>();
  const grupyPodwyzszenia = new Map<string, number[]>();
  czesci.forEach((c, j) => {
    if (!czyZPodwyzszeniem(rozpoznane[c.i].odcinek.typ)) return;
    const g = `${c.osoba.id}|${c.miesiac}`;
    grupyPodwyzszenia.set(g, [...(grupyPodwyzszenia.get(g) ?? []), j]);
  });
  for (const grupa of grupyPodwyzszenia.values()) {
    const { osoba, miesiac } = czesci[grupa[0]];
    const pMiesiaca = parametryNaDzien(pierwszyDzienMiesiaca(miesiac), wersje);
    const dniZasilku = dniZasilkuWMiesiacu(grupa.map((j) => rozpoznane[czesci[j].i].odcinek), miesiac);
    const porownaj = (kwoty: number[], zaliczkiGrupy: number[]) =>
      podwyzszenieMiesiaca(miesiac, dniZasilku, sumaGroszy(kwoty) / 100, sumaGroszy(zaliczkiGrupy) / 100, pMiesiaca);
    const kwotyWyplacane = grupa.map((j) => czesci[j].grosze);
    const poPomniejszeniu = porownaj(kwotyWyplacane, grupa.map((j) => zaliczki[j]));
    // UZ art. 31 ust. 3a porównuje zasiłek „obliczony zgodnie z ust. 1–3”, czyli przed pomniejszeniem za pracę z ust. 4a.
    // NIEJASNE (pytanie nr 63): przy łączeniu urlopu rodzicielskiego z pracą porównujemy z kwotą świadczenia zasiłek
    // bez tego pomniejszenia, po zaliczce policzonej od tej kwoty; nie wiemy, czy tak liczy ZUS.
    const zPraca = grupa.filter((j) => (rozpoznane[czesci[j].i].r.wymiarPracy ?? 0) > 0);
    const kwotyPorownania = zPraca.length > 0 ? grupa.map((j) => czesci[j].groszeBezPomniejszenia) : kwotyWyplacane;
    const zaliczkiPorownania = zPraca.length > 0 ? grupa.map((j) => zaliczkiBezPomniejszenia[j]) : grupa.map((j) => zaliczki[j]);
    const w = zPraca.length > 0 ? porownaj(kwotyPorownania, zaliczkiPorownania) : poPomniejszeniu;
    // Uwaga tylko wtedy, gdy wybór kwoty zmienia wynik (w którąkolwiek stronę; zaliczka zaokrąglona do złotych może skoczyć o 1 zł).
    if (zPraca.length > 0 && w.podwyzszenie !== poPomniejszeniu.podwyzszenie) for (const j of zPraca) laczenieZPracaDoPotwierdzenia.add(czesci[j].i);
    if (w.podwyzszenie <= 0) continue;
    osobyZPodwyzszeniem.add(osoba.id);
    // Podwyższenie miesiąca rozdzielamy na części odcinków tak jak zaliczkę: proporcjonalnie do porównywanych kwot.
    const udzialy = rozdzielProporcjonalnie(Math.round(w.podwyzszenie * 100), kwotyPorownania);
    const wzorCzesciMiesiaca = wzorKwotyOdniesienia(miesiac, dniZasilku, pMiesiaca);
    const zTegoNaOkres = grupa.length > 1;
    grupa.forEach((j, n) => {
      const { i } = czesci[j];
      podwyzszenieOdcinka[i] += udzialy[n];
      // NIEJASNE (research, urlop uzupełniający): materiały ZUS o podwyższeniu nie wymieniają tego urlopu.
      if (rozpoznane[i].odcinek.typ === 'uzupelniajacy') uzupelniajaceZPodwyzszeniem.add(i);
      if (wzorCzesciMiesiaca !== undefined) {
        // UZ art. 31 ust. 3c: za część miesiąca kwota proporcjonalna (sposób liczenia: zus.pl, „Podwyższenie…”, przykład 3)
        krokiPodwyzszenia[i].push({
          opis: `Kwota świadczenia rodzicielskiego za ${dniZasilku} dni miesiąca ${miesiac}`,
          wzor: wzorCzesciMiesiaca,
          wartosc: w.kwotaOdniesienia,
          przepis: 'UZ art. 31 ust. 3c',
        });
      }
      if (zPraca.length > 0) {
        // Kwota do porównania przy łączeniu z pracą: zasiłek bez pomniejszenia z ust. 4a i zaliczka od niego (NIEJASNE, pytanie nr 63).
        krokiPodwyzszenia[i].push({
          opis: `Zasiłki za ${miesiac} bez pomniejszenia za pracę, po zaliczce od tej kwoty (do porównania)`,
          wzor: `${zl(doGrosza(sumaGroszy(kwotyPorownania) / 100))} − ${zl(doGrosza(sumaGroszy(zaliczkiPorownania) / 100))} (zaliczka od tej kwoty)`,
          wartosc: w.poZaliczce,
          przepis: 'UZ art. 31 ust. 3a i 4a',
        });
      }
      krokiPodwyzszenia[i].push({
        opis: `Podwyższenie do kwoty świadczenia rodzicielskiego za ${miesiac}`,
        wzor: `${zl(w.kwotaOdniesienia)} − ${zl(w.poZaliczce)} ` +
          (zPraca.length > 0 ? '(zasiłki bez pomniejszenia za pracę, po zaliczce od tej kwoty)' : '(zasiłki po zaliczce na podatek)') +
          (zTegoNaOkres ? ` = ${zl(w.podwyzszenie)}, z tego na ten okres` : ''),
        wartosc: doGrosza(udzialy[n] / 100),
        przepis: PRZEPIS_PODWYZSZENIA,
      });
    });
  }

  const zaliczkaOdcinka = brutto.map(() => 0);
  czesci.forEach((c, j) => {
    zaliczkaOdcinka[c.i] += zaliczki[j];
  });
  const odcinki: KwotaOdcinka[] = brutto.map((o, i) => {
    const zaliczkaPodatku = doGrosza(zaliczkaOdcinka[i] / 100);
    const podwyzszenie = doGrosza(podwyzszenieOdcinka[i] / 100);
    return {
      ...o,
      ...(podwyzszenie > 0 ? { podwyzszenie } : {}),
      zaliczkaPodatku,
      naReke: doGrosza(o.razem + podwyzszenie - zaliczkaPodatku),
      sciezka: [
        ...o.sciezka,
        // ustawa o PIT art. 34 ust. 3
        { opis: 'Zaliczka na podatek (szacunek)', wartosc: zaliczkaPodatku, przepis: 'ustawa o PIT art. 34 ust. 3' },
        ...krokiPodwyzszenia[i],
      ],
    };
  });
  if (odcinki.length > 0) {
    uwagi.push({
      kod: 'SZACUNEK_BEZ_ULG',
      poziom: 'info',
      tresc: 'Kwota „na rękę” to szacunek. Nie uwzględnia zwolnień z podatku (np. dla osób do 26. roku życia) ani wyższej stawki podatku po przekroczeniu pierwszego progu skali.',
      coZrobic: 'Dokładna kwota będzie w informacji od płatnika zasiłku.',
    });
  }
  for (const osobaId of osobyZPodwyzszeniem) {
    uwagi.push({
      kod: 'PODWYZSZENIE_DO_SWIADCZENIA_RODZICIELSKIEGO',
      poziom: 'info',
      tresc: 'Zasiłek macierzyński tej osoby po odjęciu zaliczki na podatek jest w co najmniej jednym miesiącu niższy niż kwota świadczenia rodzicielskiego, więc doliczyliśmy podwyższenie do tej kwoty. Od podwyższenia nie pobiera się zaliczki na podatek.',
      coZrobic: 'Podwyższenie nalicza płatnik zasiłku albo ZUS. Gdy zasiłek płynie z kilku tytułów, trzeba wskazać płatnika, który ma je naliczyć.',
      przepis: 'UZ art. 31 ust. 3a–3c',
      osobaId,
    });
  }
  for (const i of uzupelniajaceZPodwyzszeniem) {
    uwagi.push(uwaga('DO_POTWIERDZENIA_W_ZUS', rozpoznane[i].odcinek,
      'Podwyższenie do kwoty świadczenia rodzicielskiego za okres uzupełniającego urlopu macierzyńskiego policzyliśmy tak samo jak za urlop macierzyński. Materiały ZUS nie opisują tego urlopu, więc to wymaga potwierdzenia w ZUS.',
      'Warto zapytać w ZUS, czy za uzupełniający urlop macierzyński przysługuje podwyższenie.', 'ostrzezenie', 'UZ art. 31 ust. 1 i 3a'));
  }
  for (const i of laczenieZPracaDoPotwierdzenia) {
    uwagi.push(uwaga('DO_POTWIERDZENIA_W_ZUS', rozpoznane[i].odcinek,
      'W tym okresie urlop rodzicielski jest łączony z pracą. Podwyższenie do kwoty świadczenia rodzicielskiego sprawdziliśmy na zasiłku bez pomniejszenia za pracę, bo tak odczytujemy przepis (art. 31 ust. 3a). Od zasiłku po pomniejszeniu wynik byłby inny. Nie wiemy, który sposób stosuje ZUS, więc to wymaga potwierdzenia w ZUS.',
      'Proszę zapytać w ZUS, od jakiej kwoty liczy się podwyższenie przy łączeniu urlopu rodzicielskiego z pracą.', 'ostrzezenie', 'UZ art. 31 ust. 3a i 4a'));
  }

  // Sumy obejmują podwyższenie: razem + podwyższenie.
  const zPodwyzszeniem = (o: KwotaOdcinka) => [o.razem, o.podwyzszenie ?? 0];
  const sumaOsoby: Record<string, number> = {};
  for (const osobaId of new Set(odcinki.map((o) => o.osobaId))) {
    sumaOsoby[osobaId] = suma(odcinki.filter((o) => o.osobaId === osobaId).flatMap(zPodwyzszeniem));
  }
  return {
    podstawy: [...podstawy.values()],
    odcinki,
    sumaOsoby,
    sumaRazem: suma(odcinki.flatMap(zPodwyzszeniem)),
    naRekeRazem: suma(odcinki.map((o) => o.naReke ?? 0)),
    uwagi,
  };
}
