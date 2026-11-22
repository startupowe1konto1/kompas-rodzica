/**
 * Podstawa wymiaru zasiłku. Pracownik: średnia z listy miesięcy (`podstawaSkladek`) albo, gdy listy nie ma,
 * jedna miesięczna kwota z ankiety. Niebędący pracownikami: `podstawaDobrowolne.ts`.
 * Dla każdego tytułu najpierw reguła art. 43 (podstawa poprzedniego zasiłku).
 */
import { parametryNaDzien } from '../params';
import { doGrosza, suma } from '../pieniadze';
import type {
  DataISO,
  KrokWyliczenia,
  MetodaPodstawy,
  MiesiacISO,
  MiesiacPodstawy,
  Osoba,
  Parametry,
  PodstawaWymiaru,
  TytulUbezpieczenia,
} from '../types';
import {
  MIESIECY_OKRESU_PODSTAWY, krokSzacunku, okresPodstawy, ostatnieZnaneMiesiace, sredniaGroszy, uzupelnione, wpisyListy, wynagrodzenieMiesiaca,
} from './miesiace';
import { poOdliczeniuSkladek, proc, zl } from './liczby';
import { obliczPodstaweNiepracownika, poczatekLancuchaZasilkow } from './podstawaDobrowolne';

/** UZ art. 42 ust. 2–3: składniki kwartalne i roczne wlicza się w wysokości jednej dwunastej (nie ma pola w `Parametry`). */
const DZIELNIK_SKLADNIKOW_OKRESOWYCH = 12;

/** Kwota miesięczna brutto pracownika z ankiety; undefined, gdy jej nie ma albo jest nieliczbowa lub ujemna. */
function kwotaWejsciowa(tytul: TytulUbezpieczenia): number | undefined {
  const kwota = tytul.wynagrodzenieMiesieczne;
  return kwota !== undefined && Number.isFinite(kwota) && kwota >= 0 ? kwota : undefined;
}

function metodaDlaOkresu(liczbaMiesiecy: number): MetodaPodstawy {
  if (liczbaMiesiecy >= MIESIECY_OKRESU_PODSTAWY) return 'srednia_12_miesiecy'; // UZ art. 36 ust. 1
  if (liczbaMiesiecy > 0) return 'srednia_pelnych_miesiecy'; // UZ art. 36 ust. 2
  return 'z_umowy'; // UZ art. 37 ust. 1 i ust. 2 pkt 1
}

/** Miesiące okresu podstawy w krokach ścieżki: dzień powstania prawa to nie zawsze poród (np. zasiłek w ciąży). */
const PRZED_ZASILKIEM = 'przed miesiącem, w którym zaczyna się zasiłek';

/** Krok z miesięczną kwotą z ankiety (gdy nie liczymy z listy miesięcy): opis i przepis według metody. */
function krokKwotyZAnkiety(metoda: MetodaPodstawy, liczbaMiesiecy: number): { opis: string; przepis: string } {
  if (metoda === 'z_umowy') {
    return { opis: 'Wynagrodzenie miesięczne z umowy (nie ma jeszcze pełnego miesiąca ubezpieczenia)', przepis: 'UZ art. 37 ust. 1 i ust. 2 pkt 1' };
  }
  if (metoda === 'srednia_pelnych_miesiecy') {
    return { opis: `Średnie miesięczne wynagrodzenie z ${liczbaMiesiecy} pełnych mies. ubezpieczenia ${PRZED_ZASILKIEM}`, przepis: 'UZ art. 36 ust. 2' };
  }
  return { opis: `Średnie miesięczne wynagrodzenie z ${MIESIECY_OKRESU_PODSTAWY} mies. ${PRZED_ZASILKIEM}`, przepis: 'UZ art. 36 ust. 1' };
}

const dodatnia = (x: number): number => (Number.isFinite(x) && x > 0 ? x : 0);

/**
 * Najniższa podstawa wymiaru zasiłku pracownika: minimalne wynagrodzenie po odliczeniu składek (UZ art. 45 ust. 1;
 * do pracowników stosuje go UZ art. 47, art. 52 dla niebędących pracownikami go nie wymienia).
 * Minimum proporcjonalne do wymiaru etatu: Komentarz ZUS do ustawy zasiłkowej (wyd. 2023), pkt 318, w związku z UZ art. 47.
 * Wymiar spoza przedziału (0, 1] traktujemy jak pełny etat.
 */
export function minimumArt45(tytul: TytulUbezpieczenia, p: Parametry): number {
  const wymiar = tytul.wymiarEtatu !== undefined && tytul.wymiarEtatu > 0 && tytul.wymiarEtatu <= 1 ? tytul.wymiarEtatu : 1;
  return poOdliczeniuSkladek(doGrosza(p.kwoty.placaMinimalna * wymiar), p);
}

/**
 * Średnia z miesięcy listy w okresie (UZ art. 38) wraz z krokiem wyliczenia; undefined, gdy lista nie ma wpisów z okresu.
 * `jakieMiesiace` opisuje miesiące w kroku ścieżki.
 */
function sredniaZListy(
  tytul: TytulUbezpieczenia,
  okres: MiesiacISO[],
  kroki: KrokWyliczenia[],
  jakieMiesiace = `mies. ${PRZED_ZASILKIEM}`,
): number | undefined {
  const wpisy: MiesiacPodstawy[] = wpisyListy(tytul.podstawaSkladek).filter((m) => okres.includes(m.miesiac));
  if (wpisy.length === 0) return undefined;

  let przyjete = wpisy.flatMap((m) => {
    const w = wynagrodzenieMiesiaca(m);
    return w ? [w] : [];
  });
  const wylaczone = wpisy.length - przyjete.length;
  let dopisek = '';
  if (przyjete.length === 0) {
    // UZ art. 38 ust. 3: w każdym miesiącu mniej niż połowa czasu pracy, więc bierzemy wszystkie po uzupełnieniu.
    przyjete = wpisy.flatMap((m) => {
      const kwota = uzupelnione(m);
      return kwota === null ? [] : [{ kwota, uzupelniony: true }];
    });
    if (przyjete.length === 0) return undefined; // brak miesięcy z użytecznymi danymi
    dopisek = ', wszystkie uzupełnione do pełnego miesiąca (w każdym przepracowano mniej niż połowę czasu pracy)';
  } else if (wylaczone > 0) {
    dopisek = `, bez ${wylaczone} mies. z przepracowaną mniej niż połową czasu pracy`; // UZ art. 38 ust. 2 pkt 1
  } else {
    const ileUzupelnionych = przyjete.filter((w) => w.uzupelniony).length;
    if (ileUzupelnionych > 0) dopisek = `, w tym ${ileUzupelnionych} mies. uzupełnione do pełnego miesiąca`; // UZ art. 38 ust. 2 pkt 2
  }

  // UZ art. 38 ust. 1: suma przyjętych miesięcy podzielona przez ich liczbę.
  const srednia = sredniaGroszy(przyjete.map((w) => w.kwota));
  kroki.push({
    opis: `Średnie wynagrodzenie z ${przyjete.length} ${jakieMiesiace}${dopisek}`,
    wartosc: srednia,
    przepis: 'UZ art. 38 ust. 1–3, art. 37 ust. 2',
  });
  return srednia;
}

/** Miesięczna podstawa wymiaru zasiłku dla jednego tytułu, na dzień powstania prawa. */
export function obliczPodstawe(
  osoba: Osoba,
  tytul: TytulUbezpieczenia,
  dataPowstaniaPrawa: DataISO,
  wersje: Parametry[],
): PodstawaWymiaru {
  // UZ art. 43: podstawy nie ustala się na nowo, gdy między okresami pobierania zasiłków nie było przerwy
  // albo była krótsza niż miesiąc kalendarzowy. Liczymy ją na dzień początku łańcucha zasiłków, z parametrami z tego dnia.
  const poczatekLancucha = poczatekLancuchaZasilkow(osoba, dataPowstaniaPrawa);
  if (poczatekLancucha !== undefined) {
    const poprzednia = obliczPodstawe(osoba, tytul, poczatekLancucha, wersje);
    return {
      ...poprzednia,
      metoda: 'podstawa_poprzedniego_zasilku',
      sciezka: [
        ...poprzednia.sciezka,
        {
          opis: `Przerwa między zasiłkami krótsza niż miesiąc kalendarzowy, więc podstawy nie liczymy na nowo (zostaje podstawa z dnia ${poczatekLancucha})`,
          wartosc: poprzednia.kwota,
          przepis: 'UZ art. 43',
        },
      ],
    };
  }

  // Niebędący pracownikiem: limit i najniższa podstawa z miesięcy okresu podstawy, więc dostaje wszystkie wersje parametrów.
  if (tytul.rodzaj !== 'umowa_o_prace') return obliczPodstaweNiepracownika(osoba, tytul, dataPowstaniaPrawa, wersje);
  const p = parametryNaDzien(dataPowstaniaPrawa, wersje);
  const ograniczenia: string[] = [];
  const sciezka: KrokWyliczenia[] = [];

  let brutto: number | undefined;

  const okres = okresPodstawy(tytul, dataPowstaniaPrawa);
  const metoda = metodaDlaOkresu(okres.length);
  if (tytul.podstawaSkladek !== undefined && okres.length > 0) {
    brutto = sredniaZListy(tytul, okres, sciezka);
    if (brutto === undefined) {
      ograniczenia.push('brak_miesiecy_w_okresie');
      // Szacunek (decyzja zespołu): lista nie ma żadnego miesiąca z okresu z UZ art. 36 ust. 1, a kwoty z ankiety nie ma
      // (ona ma pierwszeństwo) – liczymy z ostatnich znanych miesięcy listy tymi samymi regułami (UZ art. 38).
      const znane = kwotaWejsciowa(tytul) === undefined ? ostatnieZnaneMiesiace(tytul, okres) : [];
      const krokiSzacunku: KrokWyliczenia[] = [];
      const szacunek = znane.length > 0 ? sredniaZListy(tytul, znane, krokiSzacunku, 'ostatnich znanych mies.') : undefined;
      if (szacunek !== undefined) {
        brutto = szacunek;
        ograniczenia.push('podstawa_z_ostatnich_znanych_miesiecy');
        sciezka.push(krokSzacunku(znane, 'UZ art. 36 ust. 1'), ...krokiSzacunku);
      }
    }
    if (brutto !== undefined) {
      // UZ art. 42 ust. 2–3: jedna dwunasta składników kwartalnych (cztery kwartały) i rocznego.
      const dodatek = doGrosza(
        (suma((tytul.skladnikiKwartalne ?? []).map((s) => dodatnia(s.kwota))) + dodatnia(tytul.skladnikRoczny ?? 0)) /
          DZIELNIK_SKLADNIKOW_OKRESOWYCH,
      );
      if (dodatek > 0) {
        brutto = doGrosza(brutto + dodatek);
        sciezka.push({
          opis: 'Dodane składniki kwartalne i roczne w wysokości jednej dwunastej',
          wartosc: brutto,
          przepis: 'UZ art. 42 ust. 2–3',
        });
      }
    }
  }

  if (brutto === undefined) {
    const krok = krokKwotyZAnkiety(metoda, okres.length);
    brutto = kwotaWejsciowa(tytul);
    if (brutto === undefined) {
      brutto = 0;
      ograniczenia.push('brak_danych_o_przychodzie');
      sciezka.push({ opis: 'Brak danych o wynagrodzeniu, więc liczymy od 0 zł. Po uzupełnieniu wynagrodzenia pokażemy prawdziwą kwotę', przepis: krok.przepis });
    } else {
      sciezka.push({ ...krok, wartosc: brutto });
    }
  }

  // Załącznik ZUS do zadania: maksymalna miesięczna podstawa wymiaru dobrowolnej składki chorobowej.
  if (tytul.chorobowe === 'dobrowolne' && brutto > p.kwoty.maxPodstawaSkladkiDobrowolne) {
    brutto = p.kwoty.maxPodstawaSkladkiDobrowolne;
    ograniczenia.push('limit_dobrowolne');
    sciezka.push({
      opis: 'Podstawa dobrowolnego ubezpieczenia chorobowego ograniczona do maksymalnej',
      wartosc: brutto,
      przepis: 'Załącznik ZUS: maksymalna podstawa dobrowolnej składki chorobowej',
    });
  }

  let kwota = poOdliczeniuSkladek(brutto, p);
  sciezka.push({
    opis: `Odliczenie składek pracownika (${proc(p.kwoty.skladkiPracownikaProc)})`,
    wzor: `${zl(brutto)} × (100% − ${proc(p.kwoty.skladkiPracownikaProc)})`,
    wartosc: kwota,
    przepis: 'UZ art. 3 pkt 3',
  });

  // UZ art. 45 ust. 1 (przez art. 47), proporcjonalnie do etatu: `minimumArt45`
  const minimum = minimumArt45(tytul, p);
  if (kwota < minimum) {
    kwota = minimum;
    ograniczenia.push('minimum_art_45');
    sciezka.push({
      opis: 'Podstawa podniesiona do kwoty minimalnego wynagrodzenia po odliczeniu składek',
      wartosc: kwota,
      przepis: 'UZ art. 45 ust. 1',
    });
  }

  return { osobaId: osoba.id, tytulId: tytul.id, kwota, metoda, sciezka, ograniczenia };
}
