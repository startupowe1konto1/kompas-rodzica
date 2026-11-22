/**
 * DOKUMENTY – TOR D (Mikołaj): lista dokumentów dla planu – co, kto składa, gdzie, do kiedy, z jakimi załącznikami
 * i w jakim stanie względem „dziś” (`rodzina.dataAnalizy`).
 *
 * Źródła:
 *  - wnioski do pracodawcy i ich załączniki: rozp. MRPiPS z 11.03.2025 (Dz.U. 2025 poz. 322), w kodzie „Dz.U. 2025 poz. 322”;
 *  - dokumenty do zasiłku macierzyńskiego: rozp. MRPiPS z 27.09.2026 (Dz.U. 2026 poz. 1316), w kodzie „Dz.U. 2026 poz. 1316”;
 *  - zaświadczenie płatnika (Z-3, Z-3a), gdy płaci ZUS: UZ art. 61 ust. 3.
 * Terminy liczy `terminy.ts`.
 */
import type { DataISO, Dokument, KodDokumentu, Komunikat, Osoba, Parametry, Plan, Rodzina, TytulUbezpieczenia } from '../types';
import {
  czyOdcinekZasilkowy,
  ktoWyplacaWDniu,
  nazwaPlatnika,
  pracodawcaWDniu,
  tytulyDlaOdcinka,
  uwzglednijPrzedluzenie,
} from './ktoWyplaca';
import { wnioskiZTerminami, type WniosekPlanu } from './terminy';

/** Załączniki jako stałe – testy i UI porównują ze stałą, a nie z treścią. */
export const ZALACZNIKI = {
  odpisAktuUrodzenia: 'Skrócony odpis aktu urodzenia dziecka albo jego kopia',
  zaswiadczenieLekarskiePrzewidywanaData: 'Zaświadczenie lekarskie o przewidywanej dacie porodu',
  zaswiadczenieMartweUrodzenie: 'Zaświadczenie lekarza albo położnej o martwym urodzeniu (gdy nie sporządzono aktu urodzenia)',
  kopiaZaZyciem: 'Kopia zaświadczenia „Za życiem”',
  oswiadczenieZaZyciem: 'Oświadczenie, że dziecko ma zaświadczenie „Za życiem”',
  zaswiadczenieZeSzpitala: 'Zaświadczenie ze szpitala o pobycie dziecka i o tygodniu ciąży albo masie urodzeniowej',
  oswiadczenieDrugiRodzicRodzicielski: 'Oświadczenie, czy drugi rodzic będzie w tym czasie korzystał z urlopu rodzicielskiego',
  oswiadczenieDrugiRodzicUzupelniajacy: 'Oświadczenie, że drugi rodzic nie będzie korzystał z uzupełniającego urlopu macierzyńskiego',
  oswiadczenieOjcowskiWczesniej: 'Oświadczenie o dotychczasowym korzystaniu z urlopu ojcowskiego',
  oswiadczenieOjcowskiInnyTytul: 'Oświadczenie, czy zasiłek za urlop ojcowski był już wypłacony z innego tytułu',
  kopiaWnioskuPrzejmujacego: 'Kopia wniosku taty (albo innej osoby) o pozostałą część urlopu macierzyńskiego',
  oswiadczenieMatkiORezygnacji: 'Oświadczenie mamy, że rezygnuje z pozostałej części urlopu macierzyńskiego',
  oswiadczenieDataPrzejecia: 'Oświadczenie, od którego dnia drugi rodzic przejmuje zasiłek',
  oswiadczenieMatkiSzpital: 'Oświadczenie mamy, od kiedy przerwała urlop macierzyński z powodu pobytu w szpitalu',
  zaswiadczenieSzpitalMatki: 'Zaświadczenie szpitala o dniu przyjęcia mamy',
  kopiaOrzeczeniaNiezdolnosci: 'Kopia orzeczenia o niezdolności mamy do samodzielnej egzystencji',
  zaswiadczenieOZasilkuMatki: 'Zaświadczenie płatnika zasiłku mamy o okresie i stawce wypłaconego jej zasiłku',
  dokumentySaduPrzysposobienie: 'Oświadczenie o dacie przyjęcia dziecka i zaświadczenie sądu opiekuńczego o dacie złożenia wniosku o przysposobienie',
  postanowienieOPrzysposobieniu: 'Prawomocne postanowienie sądu o przysposobieniu dziecka',
  dokumentyRodzinaZastepcza: 'Orzeczenie sądu o umieszczeniu dziecka w rodzinie zastępczej (albo umowa ze starostą) i dokument z datą urodzenia dziecka',
  decyzjaOdroczenie: 'Kopia decyzji o odroczeniu obowiązku szkolnego',
  zaswiadczenieCiazaWZatrudnieniu: 'Zaświadczenie lekarskie potwierdzające ciążę w czasie zatrudnienia',
  swiadectwoPracy: 'Świadectwo pracy albo inny dokument o zakończeniu umowy',
  wyrokSadu: 'Prawomocne orzeczenie sądu o rozwiązaniu umowy z naruszeniem prawa',
  oswiadczenieBrakInnegoZatrudnienia: 'Oświadczenie, że nie zapewniono innego zatrudnienia',
} as const;

const NAZWY: Record<KodDokumentu, string> = {
  ZAM: 'Wniosek o zasiłek macierzyński (ZAM)',
  'Z-3': 'Zaświadczenie płatnika składek Z-3',
  'Z-3a': 'Zaświadczenie płatnika składek Z-3a',
  'ZAS-53': 'Wniosek o zasiłek chorobowy (ZAS-53)',
  'ZAS-12': 'Dokument ZAS-12',
  wniosek_macierzynski_przed_porodem: 'Wniosek o część urlopu macierzyńskiego przed porodem',
  wniosek_rodzicielski: 'Wniosek o urlop rodzicielski',
  wniosek_rezygnacja_matki: 'Wniosek o rezygnację z części urlopu macierzyńskiego i powrót do pracy',
  wniosek_przejecie_macierzynskiego: 'Wniosek o pozostałą część urlopu macierzyńskiego',
  wniosek_uzupelniajacy: 'Wniosek o uzupełniający urlop macierzyński',
  wniosek_ojcowski: 'Wniosek o urlop ojcowski',
  wniosek_laczenie_z_praca: 'Wniosek o łączenie urlopu rodzicielskiego z pracą',
  wniosek_815: 'Wniosek o zasiłek macierzyński 81,5% za cały okres',
  wniosek_na_warunkach_macierzynskiego: 'Wniosek o urlop na warunkach urlopu macierzyńskiego',
  zalacznik: 'Dokumenty do wypłaty zasiłku przez pracodawcę',
};

/** Stan dokumentu względem dnia analizy: termin minął, jeszcze za wcześnie albo można złożyć teraz. */
export function statusDokumentu(dzis: DataISO, termin?: DataISO, odKiedy?: DataISO): Dokument['status'] {
  if (termin !== undefined && dzis > termin) return 'po_terminie';
  if (odKiedy !== undefined && dzis < odKiedy) return 'pozniej';
  return 'teraz';
}

interface Okolicznosci {
  dzienZdarzenia: DataISO;
  przysposobienie: boolean;
  zastepcza: boolean;
  zaZyciem: boolean;
  martwe: boolean;
  odroczenie: boolean;
  mama?: Osoba;
}

function okolicznosci(rodzina: Rodzina): Okolicznosci {
  const z = rodzina.zdarzenie;
  return {
    dzienZdarzenia: z.data,
    przysposobienie: z.typ === 'przysposobienie',
    zastepcza: z.typ === 'rodzina_zastepcza_niezawodowa' || z.typ === 'rodzina_zastepcza_zawodowa',
    zaZyciem: z.dzieci.some((d) => d.zaZyciem === true),
    martwe: z.dzieci.some((d) => d.martwe === true),
    odroczenie: z.dzieci.some((d) => d.odroczonyObowiazekSzkolny === true),
    mama: rodzina.osoby.find((o) => o.rola === 'matka'),
  };
}

/** Dokumenty o przyjęciu dziecka (Dz.U. 2025 poz. 322 § 15 ust. 4, § 14 ust. 4; Dz.U. 2026 poz. 1316 § 16). */
function dokumentyPrzyjecia(k: Okolicznosci): string[] {
  if (k.przysposobienie) return [ZALACZNIKI.dokumentySaduPrzysposobienie];
  if (k.zastepcza) return [ZALACZNIKI.dokumentyRodzinaZastepcza, ...(k.odroczenie ? [ZALACZNIKI.decyzjaOdroczenie] : [])];
  return [];
}

const unikalne = (lista: string[]) => [...new Set(lista)];

/** Załączniki wniosku z przepisu, który określa jego treść. */
function zalacznikiWniosku(w: WniosekPlanu, rodzina: Rodzina, k: Okolicznosci): string[] {
  const przyjecie = k.przysposobienie || k.zastepcza;
  const osoba = rodzina.osoby.find((o) => o.id === w.osobaId);
  const mamaZdrowie = k.mama?.zdrowie;
  switch (w.kod) {
    case 'wniosek_macierzynski_przed_porodem':
      // Dz.U. 2025 poz. 322 § 2 ust. 2.
      return [ZALACZNIKI.zaswiadczenieLekarskiePrzewidywanaData];
    case 'wniosek_rodzicielski':
      // Dz.U. 2025 poz. 322 § 15 ust. 2 (poród) albo ust. 4 (przyjęcie dziecka).
      if (przyjecie) return unikalne([...dokumentyPrzyjecia(k), ...(k.odroczenie ? [ZALACZNIKI.decyzjaOdroczenie] : [])]);
      return [ZALACZNIKI.odpisAktuUrodzenia, ZALACZNIKI.oswiadczenieDrugiRodzicRodzicielski, ...(k.zaZyciem ? [ZALACZNIKI.kopiaZaZyciem] : [])];
    case 'wniosek_na_warunkach_macierzynskiego':
      // Dz.U. 2025 poz. 322 § 18 ust. 2: dokumenty z sądu o przyjęciu dziecka (pkt 1) i decyzja o odroczeniu
      // obowiązku szkolnego, gdy jej dotyczy (pkt 2).
      return unikalne([...dokumentyPrzyjecia(k), ...(k.odroczenie ? [ZALACZNIKI.decyzjaOdroczenie] : [])]);
    case 'wniosek_laczenie_z_praca':
      // Dz.U. 2025 poz. 322 § 16: sam wniosek, bez załączników.
      return [];
    case 'wniosek_ojcowski':
      // Dz.U. 2025 poz. 322 § 17 ust. 2.
      return [
        ZALACZNIKI.odpisAktuUrodzenia,
        ...(k.przysposobienie ? [ZALACZNIKI.postanowienieOPrzysposobieniu] : []),
        ZALACZNIKI.oswiadczenieOjcowskiWczesniej,
      ];
    case 'wniosek_uzupelniajacy':
      // Dz.U. 2025 poz. 322 § 14 ust. 2 i 4; KP art. 180² § 5.
      return [ZALACZNIKI.zaswiadczenieZeSzpitala, ZALACZNIKI.oswiadczenieDrugiRodzicUzupelniajacy, ...dokumentyPrzyjecia(k)];
    case 'wniosek_rezygnacja_matki':
      if (w.gdzie !== 'pracodawca') return [ZALACZNIKI.oswiadczenieDataPrzejecia]; // Dz.U. 2026 poz. 1316 § 18 ust. 1 pkt 1
      // Dz.U. 2025 poz. 322 § 3 ust. 2 i § 4 ust. 2 (mama z orzeczeniem o niezdolności do samodzielnej egzystencji).
      return [
        ZALACZNIKI.kopiaWnioskuPrzejmujacego,
        ...(osoba?.zdrowie?.orzeczenieNiezdolnosciSamodzielnejEgzystencji ? [ZALACZNIKI.kopiaOrzeczeniaNiezdolnosci] : []),
      ];
    case 'wniosek_przejecie_macierzynskiego': {
      // Zwykłe przejęcie: Dz.U. 2025 poz. 322 § 5 ust. 2.
      if (w.przejecie !== 'szczegolne') return [ZALACZNIKI.odpisAktuUrodzenia, ZALACZNIKI.oswiadczenieMatkiORezygnacji];
      // Sytuacje szczególne: § 6 ust. 2 (szpital), § 8–12 ust. 2 (zgon, porzucenie, orzeczenie).
      const start = w.odcinki[0]?.od;
      const szpital = start !== undefined && (mamaZdrowie?.pobytWSzpitalu ?? []).some((s) => s.od <= start && start <= s.do);
      return [
        ...(szpital ? [ZALACZNIKI.oswiadczenieMatkiSzpital, ZALACZNIKI.zaswiadczenieSzpitalMatki] : []),
        ZALACZNIKI.odpisAktuUrodzenia,
        ...(mamaZdrowie?.orzeczenieNiezdolnosciSamodzielnejEgzystencji ? [ZALACZNIKI.kopiaOrzeczeniaNiezdolnosci] : []),
      ];
    }
    case 'wniosek_815':
      // UZ art. 30a: pisemny wniosek, bez załączników.
      return [];
    case 'ZAM':
      return zalacznikiZAM(w, rodzina, k);
    default:
      return [];
  }
}

/** Załączniki do ZAM według Dz.U. 2026 poz. 1316. */
function zalacznikiZAM(w: WniosekPlanu, rodzina: Rodzina, k: Okolicznosci): string[] {
  const z: string[] = [];
  const blok = w.odcinki;
  const osoba = rodzina.osoby.find((o) => o.id === w.osobaId);
  const tytul = osoba?.tytuly.find((t) => t.id === w.tytulId);
  const placiZUS = w.gdzie === 'ZUS';
  // § 13 ust. 1 pkt 1: za okres przed porodem – zaświadczenie lekarskie o przewidywanej dacie porodu.
  if (blok.some((o) => o.typ === 'macierzynski' && o.od < k.dzienZdarzenia)) z.push(ZALACZNIKI.zaswiadczenieLekarskiePrzewidywanaData);
  // § 16: przyjęcie dziecka – dokumenty z sądu; § 13 ust. 1 pkt 2 i ust. 2: odpis aktu urodzenia tylko, gdy nie płaci ZUS.
  if (k.przysposobienie || k.zastepcza) z.push(...dokumentyPrzyjecia(k));
  else if (!placiZUS) z.push(ZALACZNIKI.odpisAktuUrodzenia);
  // § 13 ust. 1 pkt 2: martwe urodzenie.
  if (k.martwe) z.push(ZALACZNIKI.zaswiadczenieMartweUrodzenie);
  // UZ art. 61b ust. 4a: oświadczenie o zaświadczeniu „Za życiem”.
  if (k.zaZyciem) z.push(ZALACZNIKI.oswiadczenieZaZyciem);
  // § 26 pkt 1 i 4: uzupełniający.
  if (blok.some((o) => o.typ === 'uzupelniajacy')) z.push(ZALACZNIKI.zaswiadczenieZeSzpitala, ZALACZNIKI.oswiadczenieDrugiRodzicUzupelniajacy);
  // § 29 pkt 1: rodzicielski, gdy płaci ZUS – oświadczenie o drugim rodzicu.
  if (placiZUS && blok.some((o) => o.typ === 'rodzicielski')) z.push(ZALACZNIKI.oswiadczenieDrugiRodzicRodzicielski);
  // § 33 ust. 1 pkt 1–2: ojcowski.
  if (blok.some((o) => o.typ === 'ojcowski')) {
    if (k.przysposobienie) z.push(ZALACZNIKI.postanowienieOPrzysposobieniu);
    z.push(ZALACZNIKI.oswiadczenieOjcowskiInnyTytul);
  }
  // § 20 ust. 1 pkt 2: druga osoba przejmuje część urlopu macierzyńskiego.
  if (osoba?.rola !== 'matka' && blok.some((o) => o.typ === 'macierzynski')) z.push(ZALACZNIKI.zaswiadczenieOZasilkuMatki);
  // § 15 i § 17: zasiłek po ustaniu zatrudnienia w ciąży.
  const przyczyna = tytul?.ustanie?.przyczyna;
  if (przyczyna === 'upadlosc' || przyczyna === 'likwidacja' || przyczyna === 'smierc_pracodawcy') {
    z.push(ZALACZNIKI.zaswiadczenieCiazaWZatrudnieniu, ZALACZNIKI.swiadectwoPracy);
  }
  if (przyczyna === 'naruszenie_prawa_wyrok') z.push(ZALACZNIKI.zaswiadczenieCiazaWZatrudnieniu, ZALACZNIKI.wyrokSadu);
  if (blok.some((o) => o.typ === 'w_wys_macierzynskiego')) z.push(ZALACZNIKI.oswiadczenieBrakInnegoZatrudnienia);
  return unikalne(z);
}

function nazwaWniosku(w: WniosekPlanu): string {
  if (w.kod === 'wniosek_rezygnacja_matki' && w.gdzie !== 'pracodawca') return 'Wniosek o rezygnację z pobierania zasiłku macierzyńskiego';
  return NAZWY[w.kod];
}

/** Dokument z wniosku planu: nazwa, załączniki, status. */
function zWniosku(w: WniosekPlanu, rodzina: Rodzina, k: Okolicznosci): Dokument {
  return {
    kod: w.kod,
    nazwa: nazwaWniosku(w),
    ktoSklada: w.osobaId,
    gdzie: w.gdzie,
    ...(w.termin !== undefined ? { termin: w.termin } : {}),
    status: statusDokumentu(rodzina.dataAnalizy, w.termin, w.odKiedy),
    ...(w.odKiedy !== undefined ? { odKiedy: w.odKiedy } : {}),
    zalaczniki: zalacznikiWniosku(w, rodzina, k),
    // ZAM generuje POST /api/forms/ZAM (D3), wnioski do pracodawcy – D5.
    moznaWygenerowac: w.kod === 'ZAM' || w.gdzie === 'pracodawca',
    ...(w.odcinekId !== undefined ? { odcinekId: w.odcinekId } : {}),
    przepis: w.przepis,
    ...(w.uwagi !== undefined && w.uwagi.length > 0 ? { uwagi: w.uwagi } : {}),
  };
}

/**
 * Z-3 (pracownik) i Z-3a (zleceniobiorca): gdy zasiłek wypłaca ZUS, płatnik składek przedkłada zaświadczenie
 * o składnikach wynagrodzenia (UZ art. 61 ust. 3; Dz.U. 2026 poz. 1316 § 3). Wypełnia je płatnik, nie rodzic.
 */
function zaswiadczeniaPlatnika(rodzina: Rodzina, plan: Plan): Dokument[] {
  const wynik: Dokument[] = [];
  for (const osoba of rodzina.osoby) {
    const widziane = new Set<string>();
    const odcinki = plan.odcinki.filter((o) => o.osobaId === osoba.id && czyOdcinekZasilkowy(o)).sort((a, b) => a.od.localeCompare(b.od));
    for (const o of odcinki) {
      for (const t of tytulyDlaOdcinka(osoba, o)) {
        if (widziane.has(t.id) || ktoWyplacaWDniu(t, o.od).kto !== 'ZUS') continue;
        const kod: KodDokumentu | undefined = t.rodzaj === 'umowa_o_prace' ? 'Z-3' : t.rodzaj === 'zlecenie' ? 'Z-3a' : undefined;
        if (!kod) continue;
        widziane.add(t.id);
        wynik.push({
          kod,
          nazwa: `${NAZWY[kod]} – wypełnia i wysyła do ZUS ${nazwaPlatnika(t)}${t.nazwaPlatnika ? ` (${t.nazwaPlatnika})` : ''}`,
          ktoSklada: 'platnik',
          gdzie: 'ZUS',
          status: statusDokumentu(rodzina.dataAnalizy, undefined, o.od),
          odKiedy: o.od,
          zalaczniki: [],
          moznaWygenerowac: false,
          odcinekId: o.id,
          przepis: 'UZ art. 61 ust. 3',
        });
      }
    }
  }
  return wynik;
}

/**
 * Dokumenty do wypłaty zasiłku przez pracodawcę, który sam go wypłaca. Za urlop macierzyński po porodzie nie składa się
 * wniosku o urlop, ale płatnik zasiłku potrzebuje dokumentu o urodzeniu (Dz.U. 2026 poz. 1316 § 13 ust. 1 pkt 2),
 * o przyjęciu dziecka (§ 16) albo – przy przejęciu urlopu – o zasiłku mamy (§ 20 ust. 1).
 */
function dokumentyDlaPracodawcyPlatnika(rodzina: Rodzina, plan: Plan, k: Okolicznosci): Dokument[] {
  const wynik: Dokument[] = [];
  for (const osoba of rodzina.osoby) {
    const o = plan.odcinki
      .filter((x) => x.osobaId === osoba.id && (x.typ === 'macierzynski' || x.typ === 'na_warunkach_macierzynskiego'))
      .sort((a, b) => a.od.localeCompare(b.od))[0];
    if (!o) continue;
    const pracodawca: TytulUbezpieczenia | undefined = pracodawcaWDniu(osoba, o.od);
    if (!pracodawca || ktoWyplacaWDniu(pracodawca, o.od).kto !== 'platnik') continue;
    const zalaczniki: string[] = [];
    let przepis = 'Dz.U. 2026 poz. 1316 § 13 ust. 1 pkt 2';
    if (k.przysposobienie || k.zastepcza) {
      zalaczniki.push(...dokumentyPrzyjecia(k));
      przepis = 'Dz.U. 2026 poz. 1316 § 16';
    } else {
      zalaczniki.push(ZALACZNIKI.odpisAktuUrodzenia);
      if (k.martwe) zalaczniki.push(ZALACZNIKI.zaswiadczenieMartweUrodzenie);
      if (osoba.rola !== 'matka') {
        zalaczniki.push(ZALACZNIKI.zaswiadczenieOZasilkuMatki);
        przepis = 'Dz.U. 2026 poz. 1316 § 20 ust. 1';
      }
    }
    // UZ art. 61b ust. 4a.
    if (k.zaZyciem) zalaczniki.push(ZALACZNIKI.oswiadczenieZaZyciem);
    wynik.push({
      kod: 'zalacznik',
      nazwa: NAZWY.zalacznik,
      ktoSklada: osoba.id,
      gdzie: 'pracodawca',
      status: statusDokumentu(rodzina.dataAnalizy, undefined, k.dzienZdarzenia),
      odKiedy: k.dzienZdarzenia,
      zalaczniki,
      moznaWygenerowac: false,
      odcinekId: o.id,
      przepis,
    });
  }
  return wynik;
}

/**
 * Uwagi do całej listy dokumentów. ZAPYTAJ_W_KADRACH: nie wiemy, czy płatnik zgłasza do ubezpieczenia chorobowego
 * ponad `limity.progUbezpieczonychPlatnika` osób, a od tego zależy, kto wypłaca zasiłek (UZ art. 61 ust. 1 pkt 1
 * i pkt 2 lit. a) i czy potrzebne są ZAM i Z-3. Jedna uwaga na tytuł.
 */
export function uwagiDoListy(rodzinaWejscie: Rodzina, plan: Plan, p: Parametry): Komunikat[] {
  const rodzina = uwzglednijPrzedluzenie(rodzinaWejscie, p);
  const prog = p.limity.progUbezpieczonychPlatnika;
  const wynik: Komunikat[] = [];
  for (const osoba of rodzina.osoby) {
    const widziane = new Set<string>();
    const odcinki = plan.odcinki.filter((o) => o.osobaId === osoba.id && czyOdcinekZasilkowy(o)).sort((a, b) => a.od.localeCompare(b.od));
    for (const o of odcinki) {
      for (const t of tytulyDlaOdcinka(osoba, o)) {
        if (widziane.has(t.id) || ktoWyplacaWDniu(t, o.od).przyczyna !== 'brak_danych') continue;
        widziane.add(t.id);
        const kto = nazwaPlatnika(t);
        const nazwa = t.nazwaPlatnika ? ` (${t.nazwaPlatnika})` : '';
        wynik.push({
          kod: 'ZAPYTAJ_W_KADRACH',
          poziom: 'info',
          tresc:
            `Nie wiemy, ilu osobom ubezpieczenie chorobowe zgłasza ${kto}${nazwa}. Jeśli ponad ${prog}, zasiłek wypłaci ` +
            `${kto}, a jeśli najwyżej ${prog} – ZUS. Od tego zależy też lista dokumentów. Na razie przyjmujemy, że ZUS.`,
          coZrobic:
            t.rodzaj === 'umowa_o_prace'
              ? 'Warto zapytać w kadrach albo w biurze rachunkowym pracodawcy i wpisać odpowiedź – lista dokumentów się zaktualizuje.'
              : `Warto zapytać o to płatnika składek (${kto}) i wpisać odpowiedź – lista dokumentów się zaktualizuje.`,
          przepis: 'UZ art. 61 ust. 1',
          osobaId: osoba.id,
          odcinekId: o.id,
        });
      }
    }
  }
  return wynik;
}

/** Wszystkie dokumenty dla planu, posortowane po terminie (a bez terminu – po dniu, od którego można je złożyć). */
export function dokumentyDlaPlanu(rodzinaWejscie: Rodzina, plan: Plan, p: Parametry): Dokument[] {
  const rodzina = uwzglednijPrzedluzenie(rodzinaWejscie, p);
  const k = okolicznosci(rodzina);
  const wynik = [
    ...wnioskiZTerminami(rodzina, plan, p).map((w) => zWniosku(w, rodzina, k)),
    ...dokumentyDlaPracodawcyPlatnika(rodzina, plan, k),
    ...zaswiadczeniaPlatnika(rodzina, plan),
  ];
  const klucz = (d: Dokument) => d.termin ?? d.odKiedy ?? '';
  return wynik.sort((a, b) => klucz(a).localeCompare(klucz(b)));
}
