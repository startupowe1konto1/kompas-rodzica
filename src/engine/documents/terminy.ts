/**
 * TERMINY – TOR D (Mikołaj): jakie wnioski wynikają z planu, do kiedy je złożyć i co trafia do kalendarza.
 *
 * JAK LICZYMY „X DNI PRZED”
 * Kodeks pracy mówi „w terminie niekrótszym niż X dni przed …” (art. 180 § 8 i § 9, art. 180² § 4,
 * art. 182¹d § 1, art. 182¹e § 2, art. 182³ § 2). Ostatni dzień na złożenie wniosku = dzień, od którego liczymy,
 * minus X dni kalendarzowych. Tak liczy przykład wzorcowy zespołu: rodzicielski od 20.04.2027, 21 dni →
 * wniosek najpóźniej 30.03.2027. Dzień, od którego liczymy, bierzemy wprost z przepisu:
 *  - „przed rozpoczęciem korzystania z urlopu” – pierwszy dzień urlopu (182¹d § 1, 182³ § 2, 180 § 9);
 *  - „przed przystąpieniem do pracy” – dzień powrotu, czyli dzień po ostatnim dniu urlopu matki (180 § 8);
 *  - „przed rozpoczęciem wykonywania pracy” – pierwszy dzień odcinka z pracą na część etatu (182¹e § 2);
 *  - „przed zakończeniem korzystania z urlopu macierzyńskiego” – ostatni dzień tego urlopu (180² § 4).
 * NIEJASNE (pytanie nr 29 – do dopisania w docs/pytania-do-mentora.md): ostrzejsza wykładnia („X pełnych dni
 * między dniem złożenia a dniem rozpoczęcia”) daje dzień wcześniej. Dlatego w opisie terminu radzimy złożyć
 * wniosek kilka dni wcześniej.
 * „Nie później niż X dni po porodzie” (UZ art. 30a) = dzień porodu + X dni.
 * „Przed terminem rozpoczęcia” (rozp. Dz.U. 2026 poz. 1316 § 29 pkt 3, § 33 ust. 1 pkt 3) = najpóźniej dzień wcześniej.
 * „W terminie X dni od dnia przyjęcia dziecka” (KP art. 183 § 6) = dzień przyjęcia + X dni – tak samo jak „X dni
 * po porodzie” w UZ art. 30a (dnia zdarzenia nie wliczamy).
 *
 * KODY TERMINÓW (`Termin.kod`) – stałe, UI i testy rozpoznają po nich terminy:
 *  - wnioski: `KODY_TERMINOW_WNIOSKOW` (np. WNIOSEK_RODZICIELSKI, REZYGNACJA_MATKI, PRZEJECIE_OJCA, WNIOSEK_ZAM);
 *  - TERMIN_815 – ostatni dzień na wniosek o 81,5%, gdy wariant nie jest wybrany;
 *  - PONOWNE_ZGLOSZENIE_PO_ZASILKU – ponowne zgłoszenie do dobrowolnego ubezpieczenia chorobowego;
 *  - POROD / PRZYJECIE_DZIECKA – dzień porodu albo przyjęcia dziecka (także gdy tego dnia zaczyna się urlop);
 *  - POCZATEK_<TYP> i KONIEC_<TYP> – początek i koniec odcinka; <TYP> to `TypOdcinka` wielkimi literami
 *    (np. POCZATEK_RODZICIELSKI, KONIEC_RODZICIELSKI, POCZATEK_OJCOWSKI).
 *
 * Wszystkie liczby dni pochodzą z `Parametry.terminyDni`. Daty liczy `daty.ts`. „Dziś” to `rodzina.dataAnalizy`.
 */
import { czyWOkresie, dodajDni } from '../daty';
import type { DataISO, Dokument, KodDokumentu, Komunikat, Odcinek, Osoba, Parametry, Plan, Rodzina, Termin, TypOdcinka } from '../types';
import {
  czyOdcinekZasilkowy,
  czyPracownik,
  koniecTytulu,
  ktoWyplacaWDniu,
  pracodawcaWDniu,
  tytulyDlaOdcinka,
  ubezpieczonyWDniu,
  uwzglednijPrzedluzenie,
} from './ktoWyplaca';

// ───────────────────────── Liczenie dni ─────────────────────────

/** Ostatni dzień na wniosek składany „w terminie niekrótszym niż `dni` dni przed” dniem `dzien`. */
export function ostatniDzienPrzed(dzien: DataISO, dni: number): DataISO {
  return dodajDni(dzien, -dni);
}

/** Ostatni dzień na wniosek składany „nie później niż `dni` dni po” dniu `dzien`. */
export function ostatniDzienPo(dzien: DataISO, dni: number): DataISO {
  return dodajDni(dzien, dni);
}

/** „Przed terminem rozpoczęcia” – najpóźniej dzień wcześniej. */
export function dzienPrzed(dzien: DataISO): DataISO {
  return dodajDni(dzien, -1);
}

/** 'RRRR-MM-DD' → 'DD.MM.RRRR' do tekstów dla rodzica. */
export function dataPl(d: DataISO): string {
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
}

// ───────────────────────── Wnioski wynikające z planu ─────────────────────────

/** Wniosek wynikający z planu: kto, gdzie, do kiedy i na jakiej podstawie. `dokumenty.ts` dokłada nazwę i załączniki. */
export interface WniosekPlanu {
  kod: KodDokumentu;
  osobaId: string;
  gdzie: Dokument['gdzie'];
  odcinekId?: string;
  tytulId?: string;
  termin?: DataISO;
  /** Przepis, z którego wynika termin (gdy inny niż podstawa samego wniosku, np. 81,5% w ZAM). */
  przepisTerminu?: string;
  /** Dzień, od którego liczymy termin (początek urlopu, powrót do pracy, koniec macierzyńskiego, przyjęcie dziecka). */
  dzienOdniesienia?: DataISO;
  /** Ile dni przed albo po `dzienOdniesienia` (z `Parametry.terminyDni`). */
  dni?: number;
  odKiedy?: DataISO;
  przepis: string;
  /** Odcinki, których wniosek dotyczy (do załączników). */
  odcinki: Odcinek[];
  /** Przejęcie części urlopu macierzyńskiego: zwykłe (KP art. 180 § 9) albo w sytuacji szczególnej (§ 16). */
  przejecie?: 'zwykle' | 'szczegolne';
  /** Uwagi do dokumentu, np. 'DO_POTWIERDZENIA_W_ZUS'. */
  uwagi?: Komunikat[];
}

export const PRZEPIS_ZAM = 'UZ art. 61b ust. 1; Dz.U. 2026 poz. 1316 § 12, zał. nr 6';

function zasilkoweOsoby(plan: Plan, osobaId: string): Odcinek[] {
  return plan.odcinki.filter((o) => o.osobaId === osobaId && czyOdcinekZasilkowy(o)).sort((a, b) => a.od.localeCompare(b.od));
}

/** Ciągłe łańcuchy odcinków (kolejny zaczyna się dzień po poprzednim). */
export function bloki(odcinki: Odcinek[]): Odcinek[][] {
  const wynik: Odcinek[][] = [];
  for (const o of odcinki) {
    const ostatni = wynik.at(-1);
    if (ostatni && dodajDni(ostatni[ostatni.length - 1].do, 1) === o.od) ostatni.push(o);
    else wynik.push([o]);
  }
  return wynik;
}

/** Kto może złożyć wniosek o 81,5% (UZ art. 30a): matka po porodzie (ust. 1), przyjmujący dziecko (ust. 2). */
export function osobaWniosku815(rodzina: Rodzina, plan: Plan): { osobaId: string; przepis: string; odcinek: Odcinek } | undefined {
  const porod = rodzina.zdarzenie.typ === 'porod';
  const typ: TypOdcinka = porod ? 'macierzynski' : 'na_warunkach_macierzynskiego';
  for (const osoba of rodzina.osoby) {
    if (porod && osoba.rola !== 'matka') continue;
    const odcinek = zasilkoweOsoby(plan, osoba.id).find((o) => o.typ === typ);
    if (odcinek) return { osobaId: osoba.id, przepis: porod ? 'UZ art. 30a ust. 1' : 'UZ art. 30a ust. 2', odcinek };
  }
  return undefined;
}

/** Ostatni dzień na wniosek o 81,5%: 21 dni po porodzie albo po przyjęciu dziecka (UZ art. 30a ust. 1–2). */
export function termin815(rodzina: Rodzina, p: Parametry): DataISO {
  return ostatniDzienPo(rodzina.zdarzenie.data, p.terminyDni.wniosek815PoPorodzie);
}

/**
 * Od kiedy wniosek ma sens: po porodzie (do większości wniosków dołącza się odpis aktu urodzenia).
 * Gdy termin wypada wcześniej niż poród (np. ojcowski tuż po porodzie), wniosek można złożyć od razu.
 */
function odKiedyPoZdarzeniu(rodzina: Rodzina, termin?: DataISO): DataISO | undefined {
  return termin !== undefined && termin < rodzina.zdarzenie.data ? undefined : rodzina.zdarzenie.data;
}

function matka(rodzina: Rodzina): Osoba | undefined {
  return rodzina.osoby.find((o) => o.rola === 'matka');
}

/**
 * Przejęcie urlopu macierzyńskiego w sytuacji szczególnej – wniosek z KP art. 180 § 16, bez terminu:
 * zgon matki (§ 12, § 15 pkt 1), porzucenie dziecka (§ 13, § 15 pkt 2), pobyt matki w szpitalu (§ 10),
 * matka nieubezpieczona z orzeczeniem o niezdolności do samodzielnej egzystencji (§ 15 pkt 3).
 * W pozostałych przypadkach (rezygnacja matki § 4 i § 6, praca nieubezpieczonej matki § 17) – § 9, termin 14 dni.
 * Gdy nie wiemy, wybieramy § 9: wcześniejszy termin jest bezpieczniejszy.
 */
function przejecieSzczegolne(rodzina: Rodzina, plan: Plan, start: DataISO): boolean {
  const mama = matka(rodzina);
  const z = mama?.zdrowie;
  if (!mama || !z) return false;
  if (z.zgon !== undefined && z.zgon < start) return true;
  if (z.porzucenieDziecka !== undefined && z.porzucenieDziecka < start) return true;
  if ((z.pobytWSzpitalu ?? []).some((s) => czyWOkresie(start, s.od, s.do))) return true;
  const mamaMaMacierzynski = plan.odcinki.some((o) => o.osobaId === mama.id && o.typ === 'macierzynski');
  return z.orzeczenieNiezdolnosciSamodzielnejEgzystencji === true && !mamaMaMacierzynski;
}

/** Urlop macierzyński (dowolnej osoby), bezpośrednio po którym zaczyna się odcinek `o` – albo ostatni przed nim. */
function macierzynskiPrzed(plan: Plan, o: Odcinek): Odcinek | undefined {
  const przed = plan.odcinki.filter((m) => m.typ === 'macierzynski' && m.do < o.od).sort((a, b) => a.do.localeCompare(b.do));
  return przed.find((m) => dodajDni(m.do, 1) === o.od) ?? przed.at(-1);
}

/**
 * Urlop na warunkach urlopu macierzyńskiego przysługuje przy przysposobieniu (KP art. 183 § 1¹) i w rodzinie
 * zastępczej niezawodowej (§ 1); rodzinie zastępczej zawodowej – nie (§ 1: „z wyjątkiem rodziny zastępczej zawodowej”).
 */
function przyjecieZUrlopem(rodzina: Rodzina): boolean {
  const typ = rodzina.zdarzenie.typ;
  return typ === 'przysposobienie' || typ === 'rodzina_zastepcza_niezawodowa';
}

/** Pierwszy w planie odcinek urlopu na warunkach urlopu macierzyńskiego – tego dotyczy wniosek z KP art. 183 § 6. */
function pierwszyNaWarunkach(plan: Plan): Odcinek | undefined {
  return plan.odcinki.filter((o) => o.typ === 'na_warunkach_macierzynskiego').sort((a, b) => a.od.localeCompare(b.od))[0];
}

/** Pytanie nr 11 (docs/pytania-do-mentora.md): czy pracownik, któremu zasiłek wypłaca ZUS, składa ZAM sam. */
function uwagaPytanie11(osobaId: string, odcinekId: string): Komunikat {
  return {
    kod: 'DO_POTWIERDZENIA_W_ZUS',
    poziom: 'info',
    tresc:
      'Zasiłek wypłaci ZUS. Nie wiemy na pewno, czy w takiej sytuacji trzeba samodzielnie złożyć ZAM, czy wystarczy wniosek o urlop ' +
      'u pracodawcy i zaświadczenie Z-3, które pracodawca wyśle do ZUS. Przygotowaliśmy ZAM na wszelki wypadek.',
    coZrobic: 'Warto zapytać w kadrach, czy pracodawca przekaże wniosek do ZUS. Ta sprawa wymaga potwierdzenia w ZUS.',
    przepis: 'UZ art. 61b ust. 1 i 5',
    osobaId,
    odcinekId,
  };
}

/** Wszystkie wnioski, które wynikają z planu, z terminami. Kolejność: osoby, potem odcinki. */
export function wnioskiZTerminami(rodzinaWejscie: Rodzina, plan: Plan, p: Parametry): WniosekPlanu[] {
  const rodzina = uwzglednijPrzedluzenie(rodzinaWejscie, p);
  const wynik: WniosekPlanu[] = [];
  const dzienZdarzenia = rodzina.zdarzenie.data;
  const o815 = osobaWniosku815(rodzina, plan);
  const d = p.terminyDni;
  const naWarunkach = przyjecieZUrlopem(rodzina) ? pierwszyNaWarunkach(plan) : undefined;

  for (const osoba of rodzina.osoby) {
    const odcinki = zasilkoweOsoby(plan, osoba.id);

    // 1. Wnioski do pracodawcy – składa je tylko pracownik, którego umowa trwa w pierwszym dniu odcinka.
    for (const o of odcinki) {
      const pracodawca = pracodawcaWDniu(osoba, o.od);
      if (!pracodawca) continue;
      const doPracodawcy = (kod: KodDokumentu, przepis: string, dzienOdniesienia?: DataISO, dni?: number, extra: Partial<WniosekPlanu> = {}) => {
        const termin = dzienOdniesienia !== undefined && dni !== undefined ? ostatniDzienPrzed(dzienOdniesienia, dni) : undefined;
        wynik.push({
          kod,
          osobaId: osoba.id,
          gdzie: 'pracodawca',
          odcinekId: o.id,
          tytulId: pracodawca.id,
          termin,
          dzienOdniesienia,
          dni,
          odKiedy: odKiedyPoZdarzeniu(rodzina, termin),
          przepis,
          odcinki: [o],
          ...extra,
        });
      };
      switch (o.typ) {
        case 'macierzynski':
          if (osoba.rola === 'matka') {
            // KP art. 180 § 2, rozp. Dz.U. 2025 poz. 322 § 2: część urlopu przed porodem na wniosek. Przepis nie podaje terminu.
            if (o.od < dzienZdarzenia) doPracodawcy('wniosek_macierzynski_przed_porodem', 'KP art. 180 § 2; Dz.U. 2025 poz. 322 § 2', undefined, undefined, { odKiedy: undefined });
          } else if (przejecieSzczegolne(rodzina, plan, o.od)) {
            // KP art. 180 § 16: wniosek bez terminu.
            doPracodawcy('wniosek_przejecie_macierzynskiego', 'KP art. 180 § 16', undefined, undefined, { przejecie: 'szczegolne' });
          } else {
            // KP art. 180 § 9: wniosek co najmniej 14 dni przed rozpoczęciem korzystania z części urlopu.
            doPracodawcy('wniosek_przejecie_macierzynskiego', 'KP art. 180 § 9', o.od, d.przejecieOjcaPrzed, { przejecie: 'zwykle' });
          }
          break;
        case 'rodzicielski':
          // KP art. 182¹d § 1: wniosek o każdą część co najmniej 21 dni przed jej rozpoczęciem.
          doPracodawcy('wniosek_rodzicielski', 'KP art. 182¹d § 1', o.od, d.wniosekRodzicielskiPrzed);
          // KP art. 182¹e § 2: łączenie z pracą – wniosek co najmniej 21 dni przed rozpoczęciem wykonywania pracy.
          if ((o.wymiarPracy ?? 0) > 0) doPracodawcy('wniosek_laczenie_z_praca', 'KP art. 182¹e § 2', o.od, d.wniosekLaczeniePrzed);
          break;
        case 'ojcowski':
          // KP art. 182³ § 2: wniosek co najmniej 7 dni przed rozpoczęciem urlopu ojcowskiego albo jego części.
          doPracodawcy('wniosek_ojcowski', 'KP art. 182³ § 2', o.od, d.wniosekOjcowskiPrzed);
          break;
        case 'uzupelniajacy': {
          // KP art. 180² § 4: wniosek co najmniej 21 dni przed zakończeniem korzystania z urlopu macierzyńskiego.
          const mac = macierzynskiPrzed(plan, o);
          doPracodawcy('wniosek_uzupelniajacy', 'KP art. 180² § 4', mac?.do, mac ? d.wniosekUzupelniajacyPrzedKoncem : undefined);
          break;
        }
        case 'na_warunkach_macierzynskiego':
          // KP art. 183 § 6: urlop udziela się na wniosek składany w terminie 7 dni od dnia przyjęcia dziecka na wychowanie
          // jako rodzina zastępcza albo przyjęcia dziecka na wychowanie i wystąpienia do sądu opiekuńczego z wnioskiem
          // o przysposobienie. Treść i załączniki: Dz.U. 2025 poz. 322 § 18. Dotyczy osoby, która zaczyna urlop jako
          // pierwsza; dalsza część dla drugiej osoby to przejęcie (art. 183 § 2 w zw. z art. 180 § 4–17) – poza D2.
          // Termin liczymy od `zdarzenie.data` (przyjęcie dziecka). Przy przysposobieniu przepis liczy od dnia, w którym
          // spełnione są oba warunki (przyjęcie i wystąpienie do sądu). Daty wystąpienia do sądu nie ma w kontrakcie,
          // więc gdy była późniejsza, pokazujemy termin wcześniejszy niż prawdziwy – bezpieczny.
          if (naWarunkach?.id === o.id) {
            doPracodawcy('wniosek_na_warunkach_macierzynskiego', 'KP art. 183 § 6', undefined, undefined, {
              termin: ostatniDzienPo(dzienZdarzenia, d.wniosekNaWarunkachMacierzynskiegoPo),
              dzienOdniesienia: dzienZdarzenia,
              dni: d.wniosekNaWarunkachMacierzynskiegoPo,
              odKiedy: dzienZdarzenia,
            });
          }
          break;
      }
    }

    // 2. Rezygnacja matki z części urlopu macierzyńskiego, gdy resztę przejmuje druga osoba (KP art. 180 § 4, § 6, § 8).
    if (osoba.rola === 'matka') {
      const przejecie = plan.odcinki
        .filter((o) => o.typ === 'macierzynski' && o.osobaId !== osoba.id)
        .sort((a, b) => a.od.localeCompare(b.od))
        .find((o) => !przejecieSzczegolne(rodzina, plan, o.od));
      const mojMacierzynski = przejecie
        ? odcinki.filter((o) => o.typ === 'macierzynski' && o.do < przejecie.od).at(-1)
        : undefined;
      if (przejecie && mojMacierzynski) {
        const powrot = dodajDni(mojMacierzynski.do, 1);
        const pracodawca = pracodawcaWDniu(osoba, mojMacierzynski.do);
        if (pracodawca) {
          // KP art. 180 § 8: wniosek co najmniej 7 dni przed przystąpieniem do pracy.
          const termin = ostatniDzienPrzed(powrot, d.rezygnacjaMatkiPrzed);
          wynik.push({
            kod: 'wniosek_rezygnacja_matki',
            osobaId: osoba.id,
            gdzie: 'pracodawca',
            odcinekId: mojMacierzynski.id,
            tytulId: pracodawca.id,
            termin,
            dzienOdniesienia: powrot,
            dni: d.rezygnacjaMatkiPrzed,
            odKiedy: odKiedyPoZdarzeniu(rodzina, termin),
            przepis: 'KP art. 180 § 8',
            odcinki: [mojMacierzynski],
          });
        } else {
          // Rozp. Dz.U. 2026 poz. 1316 § 18 ust. 1 pkt 1 i 3: ubezpieczona, która nie jest pracownicą, składa płatnikowi
          // zasiłku wniosek z datą rezygnacji. Przepis nie podaje terminu.
          const tytul = tytulyDlaOdcinka(osoba, mojMacierzynski)[0];
          wynik.push({
            kod: 'wniosek_rezygnacja_matki',
            osobaId: osoba.id,
            gdzie: tytul && ktoWyplacaWDniu(tytul, mojMacierzynski.od).kto === 'platnik' ? 'platnik' : 'ZUS',
            odcinekId: mojMacierzynski.id,
            tytulId: tytul?.id,
            dzienOdniesienia: powrot,
            odKiedy: dzienZdarzenia,
            przepis: 'Dz.U. 2026 poz. 1316 § 18 ust. 1 pkt 3',
            odcinki: [mojMacierzynski],
          });
        }
      }
    }

    // 3. Wariant 81,5% u pracodawcy, który sam wypłaca zasiłek (UZ art. 30a – pisemny wniosek do płatnika zasiłku).
    if (plan.wariant815 && o815?.osobaId === osoba.id) {
      const pracodawca = pracodawcaWDniu(osoba, o815.odcinek.od);
      if (pracodawca && ktoWyplacaWDniu(pracodawca, o815.odcinek.od).kto === 'platnik') {
        wynik.push({
          kod: 'wniosek_815',
          osobaId: osoba.id,
          gdzie: 'pracodawca',
          odcinekId: o815.odcinek.id,
          tytulId: pracodawca.id,
          termin: termin815(rodzina, p),
          dzienOdniesienia: dzienZdarzenia,
          dni: d.wniosek815PoPorodzie,
          przepis: o815.przepis,
          odcinki: [o815.odcinek],
        });
      }
    }

    // 4. ZAM – wniosek o zasiłek macierzyński, osobno dla każdego ciągłego bloku zasiłku i każdego tytułu.
    // zus.pl i specyfikacja (sekcja 6): ZAM składa się tylko wtedy, gdy zasiłek wypłaca ZUS. Pracownikowi płatnika,
    // który sam wypłaca zasiłek, wystarczy wniosek o urlop do pracodawcy. Kto nie jest pracownikiem (zlecenie,
    // działalność, okres po ustaniu umowy), składa wniosek płatnikowi zasiłku: ZUS albo płatnikowi składek (UZ art. 61b ust. 1).
    for (const blok of bloki(odcinki)) {
      const pierwszy = blok[0];
      for (const tytul of tytulyDlaOdcinka(osoba, pierwszy)) {
        const { kto } = ktoWyplacaWDniu(tytul, pierwszy.od);
        const koniec = koniecTytulu(tytul);
        const pracownik = czyPracownik(tytul) && czyWOkresie(pierwszy.od, tytul.od, koniec);
        if (pracownik && kto === 'platnik') {
          // Umowa kończy się w trakcie bloku: od dnia po ustaniu zasiłek wypłaca ZUS (UZ art. 61 ust. 1 pkt 2 lit. d),
          // a postępowanie wszczyna wniosek złożony do ZUS (UZ art. 61b ust. 1 pkt 2) – więc ZAM za resztę bloku.
          const ostatni = blok[blok.length - 1];
          if (koniec !== undefined && koniec < ostatni.do) {
            const odZUS = dodajDni(koniec, 1);
            const reszta = blok.filter((o) => o.do >= odZUS);
            wynik.push({
              kod: 'ZAM',
              osobaId: osoba.id,
              gdzie: 'ZUS',
              odcinekId: reszta[0].id,
              tytulId: tytul.id,
              odKiedy: odZUS,
              przepis: 'UZ art. 61 ust. 1 pkt 2 lit. d, art. 61b ust. 1 pkt 2',
              odcinki: reszta,
            });
          }
          continue;
        }
        // NIEJASNE (pytanie nr 11): czy pracownik małego płatnika (ZUS wypłaca) składa ZAM, czy wystarczą wniosek
        // o urlop i Z-3. Wynik bezpieczny: ZAM jest na liście (płatnik i tak przekazuje wnioski do ZUS, UZ art. 61b ust. 5),
        // a rodzic widzi uwagę DO_POTWIERDZENIA_W_ZUS. To samo, gdy nie znamy liczby ubezpieczonych u pracodawcy
        // (wtedy przyjmujemy, że płaci ZUS – ktoWyplaca.ts).
        const uwagi = pracownik ? [uwagaPytanie11(osoba.id, pierwszy.id)] : [];
        const ograniczenia: { data: DataISO; przepis: string; dzien: DataISO; dni?: number }[] = [];
        if (plan.wariant815 && o815?.osobaId === osoba.id && blok.includes(o815.odcinek)) {
          ograniczenia.push({ data: termin815(rodzina, p), przepis: o815.przepis, dzien: dzienZdarzenia, dni: d.wniosek815PoPorodzie });
        }
        if (!pracownik) {
          for (const o of blok) {
            // Rozp. Dz.U. 2026 poz. 1316 § 29 pkt 3, § 30 ust. 1 pkt 4: wniosek o zasiłek za okres urlopu rodzicielskiego
            // złożony przed terminem rozpoczęcia korzystania z tego zasiłku (ubezpieczony niebędący pracownikiem).
            if (o.typ === 'rodzicielski') ograniczenia.push({ data: dzienPrzed(o.od), przepis: 'Dz.U. 2026 poz. 1316 § 29 pkt 3', dzien: o.od });
            // Tamże § 33 ust. 1 pkt 3: urlop ojcowski – wniosek przed terminem rozpoczęcia.
            if (o.typ === 'ojcowski') ograniczenia.push({ data: dzienPrzed(o.od), przepis: 'Dz.U. 2026 poz. 1316 § 33 ust. 1 pkt 3', dzien: o.od });
            // Tamże § 26 pkt 3: uzupełniający – wniosek przed zakończeniem zasiłku za okres urlopu macierzyńskiego.
            if (o.typ === 'uzupelniajacy') {
              const mac = macierzynskiPrzed(plan, o);
              if (mac) ograniczenia.push({ data: mac.do, przepis: 'Dz.U. 2026 poz. 1316 § 26 pkt 3', dzien: mac.do });
            }
          }
        }
        const wiazace = ograniczenia.sort((a, b) => a.data.localeCompare(b.data))[0];
        wynik.push({
          kod: 'ZAM',
          osobaId: osoba.id,
          gdzie: kto === 'ZUS' ? 'ZUS' : 'platnik',
          odcinekId: pierwszy.id,
          tytulId: tytul.id,
          termin: wiazace?.data,
          przepisTerminu: wiazace?.przepis,
          dzienOdniesienia: wiazace?.dzien,
          dni: wiazace?.dni,
          odKiedy: pierwszy.od < dzienZdarzenia ? pierwszy.od : dzienZdarzenia,
          przepis: PRZEPIS_ZAM,
          odcinki: blok,
          ...(uwagi.length > 0 ? { uwagi } : {}),
        });
      }
    }
  }
  return wynik;
}

// ───────────────────────── Kalendarz ─────────────────────────

const NAZWY_ODCINKOW: Partial<Record<TypOdcinka, string>> = {
  w_wys_macierzynskiego: 'zasiłku w wysokości zasiłku macierzyńskiego',
  macierzynski: 'urlopu macierzyńskiego',
  na_warunkach_macierzynskiego: 'urlopu na warunkach urlopu macierzyńskiego',
  uzupelniajacy: 'uzupełniającego urlopu macierzyńskiego',
  rodzicielski: 'urlopu rodzicielskiego',
  ojcowski: 'urlopu ojcowskiego',
  wychowawczy: 'urlopu wychowawczego',
};

const TYTULY_TERMINOW: Partial<Record<KodDokumentu, string>> = {
  ZAM: 'Wniosek o zasiłek macierzyński (ZAM)',
  wniosek_rodzicielski: 'Wniosek o urlop rodzicielski',
  wniosek_ojcowski: 'Wniosek o urlop ojcowski',
  wniosek_rezygnacja_matki: 'Wniosek o rezygnację z części urlopu macierzyńskiego',
  wniosek_przejecie_macierzynskiego: 'Wniosek o część urlopu macierzyńskiego',
  wniosek_uzupelniajacy: 'Wniosek o uzupełniający urlop macierzyński',
  wniosek_laczenie_z_praca: 'Wniosek o łączenie urlopu rodzicielskiego z pracą',
  wniosek_815: 'Wniosek o 81,5% za cały okres',
  wniosek_na_warunkach_macierzynskiego: 'Wniosek o urlop na warunkach urlopu macierzyńskiego',
};

/** Kod terminu wniosku (`Termin.kod`) dla każdego kodu dokumentu. */
export const KODY_TERMINOW_WNIOSKOW: Record<KodDokumentu, string> = {
  ZAM: 'WNIOSEK_ZAM',
  'Z-3': 'ZASWIADCZENIE_Z3',
  'Z-3a': 'ZASWIADCZENIE_Z3A',
  'ZAS-53': 'WNIOSEK_ZAS53',
  'ZAS-12': 'DOKUMENT_ZAS12',
  wniosek_macierzynski_przed_porodem: 'WNIOSEK_MACIERZYNSKI_PRZED_PORODEM',
  wniosek_rodzicielski: 'WNIOSEK_RODZICIELSKI',
  wniosek_rezygnacja_matki: 'REZYGNACJA_MATKI',
  wniosek_przejecie_macierzynskiego: 'PRZEJECIE_OJCA',
  wniosek_uzupelniajacy: 'WNIOSEK_UZUPELNIAJACY',
  wniosek_ojcowski: 'WNIOSEK_OJCOWSKI',
  wniosek_laczenie_z_praca: 'WNIOSEK_LACZENIE',
  wniosek_815: 'WNIOSEK_815',
  wniosek_na_warunkach_macierzynskiego: 'WNIOSEK_NA_WARUNKACH_MACIERZYNSKIEGO',
  zalacznik: 'DOKUMENTY_DLA_PLATNIKA',
};

/** Kod dnia porodu albo przyjęcia dziecka. */
function kodZdarzenia(rodzina: Rodzina): string {
  return rodzina.zdarzenie.typ === 'porod' ? 'POROD' : 'PRZYJECIE_DZIECKA';
}

const RADA = ' Najlepiej zrobić to kilka dni wcześniej.';

function opisTerminu(w: WniosekPlanu): string {
  const kiedy = w.dzienOdniesienia ? ` (${dataPl(w.dzienOdniesienia)})` : '';
  const n = w.dni;
  switch (w.kod) {
    case 'wniosek_rodzicielski':
    case 'wniosek_ojcowski':
      return `Wniosek trzeba złożyć u pracodawcy najpóźniej ${n} dni przed początkiem urlopu${kiedy}.${RADA}`;
    case 'wniosek_przejecie_macierzynskiego':
      return `Wniosek trzeba złożyć u swojego pracodawcy najpóźniej ${n} dni przed przejęciem urlopu${kiedy}.${RADA}`;
    case 'wniosek_rezygnacja_matki':
      return `Wniosek trzeba złożyć u pracodawcy najpóźniej ${n} dni przed powrotem do pracy${kiedy}.${RADA}`;
    case 'wniosek_uzupelniajacy':
      return `Wniosek trzeba złożyć u pracodawcy najpóźniej ${n} dni przed końcem urlopu macierzyńskiego${kiedy}.${RADA}`;
    case 'wniosek_laczenie_z_praca':
      return `Wniosek trzeba złożyć u pracodawcy najpóźniej ${n} dni przed powrotem do pracy na część etatu${kiedy}.${RADA}`;
    case 'wniosek_na_warunkach_macierzynskiego':
      return `Wniosek trzeba złożyć u pracodawcy najpóźniej ${n} dni po przyjęciu dziecka${kiedy}.${RADA}`;
    case 'wniosek_815':
      return `To ostatni dzień, żeby wybrać 81,5% za cały urlop macierzyński i rodzicielski (${n} dni po porodzie). Później zostaje wariant 100% i 70%.`;
    case 'ZAM': {
      const gdzie = w.gdzie === 'ZUS' ? 'w ZUS' : 'u płatnika zasiłku';
      if (w.przepisTerminu?.startsWith('UZ art. 30a')) return `ZAM trzeba złożyć ${gdzie} najpóźniej tego dnia – w nim wybiera się też 81,5% za cały okres.`;
      if (w.przepisTerminu?.includes('§ 26')) return `Proszę złożyć ZAM ${gdzie} przed końcem zasiłku za urlop macierzyński${kiedy}.`;
      return `Proszę złożyć ZAM ${gdzie} przed początkiem tej części urlopu${kiedy}.`;
    }
    default:
      return `Wniosek trzeba złożyć najpóźniej tego dnia.${RADA}`;
  }
}

function tytulPoczatku(rodzina: Rodzina, o: Odcinek, pracownik: boolean): string {
  const z = rodzina.zdarzenie;
  if (o.od === z.data && (o.typ === 'macierzynski' || o.typ === 'na_warunkach_macierzynskiego')) {
    if (z.typ !== 'porod') return 'Przyjęcie dziecka';
    return z.przewidywana ? 'Przewidywany poród' : 'Poród';
  }
  const nazwa = NAZWY_ODCINKOW[o.typ] ?? 'urlopu';
  return pracownik || o.typ === 'w_wys_macierzynskiego' ? `Początek ${nazwa}` : `Początek zasiłku za okres ${nazwa}`;
}

/**
 * Terminy do kalendarza: początki i końce urlopów, ostatni dzień na 81,5%, terminy wszystkich wniosków
 * i ponowne zgłoszenie do dobrowolnego ubezpieczenia chorobowego. Posortowane po dacie.
 */
export function terminyDlaPlanu(rodzinaWejscie: Rodzina, plan: Plan, p: Parametry): Termin[] {
  const rodzina = uwzglednijPrzedluzenie(rodzinaWejscie, p);
  const wynik: Termin[] = [];
  const z = rodzina.zdarzenie;
  const urlopy = plan.odcinki.filter((o) => NAZWY_ODCINKOW[o.typ] !== undefined).sort((a, b) => a.od.localeCompare(b.od));

  // Początek i koniec każdego urlopu. Koniec pokazujemy, gdy następnego dnia osoba nie zaczyna kolejnego urlopu.
  for (const o of urlopy) {
    const osoba = rodzina.osoby.find((x) => x.id === o.osobaId);
    const pracownik = osoba ? pracodawcaWDniu(osoba, o.od) !== undefined : false;
    const nazwa = NAZWY_ODCINKOW[o.typ] ?? 'urlopu';
    const poczatekPorodu = o.od === z.data && (o.typ === 'macierzynski' || o.typ === 'na_warunkach_macierzynskiego');
    wynik.push({
      kod: poczatekPorodu ? kodZdarzenia(rodzina) : `POCZATEK_${o.typ.toUpperCase()}`,
      data: o.od,
      tytul: tytulPoczatku(rodzina, o, pracownik),
      opis: poczatekPorodu ? `Początek ${nazwa}.` : `Pierwszy dzień ${nazwa}.`,
      rodzaj: 'poczatek',
      osobaId: o.osobaId,
      odcinekId: o.id,
    });
    const dalej = urlopy.some((n) => n.osobaId === o.osobaId && n.od === dodajDni(o.do, 1));
    if (!dalej) {
      wynik.push({
        kod: `KONIEC_${o.typ.toUpperCase()}`,
        data: o.do,
        tytul: `Koniec ${nazwa}`,
        opis: pracownik ? 'Następnego dnia przypada powrót do pracy.' : 'To ostatni dzień zasiłku za ten okres.',
        rodzaj: 'koniec',
        osobaId: o.osobaId,
        odcinekId: o.id,
      });
    }
  }

  // Poród albo przyjęcie dziecka, gdy tego dnia nie zaczyna się żaden urlop.
  if (!urlopy.some((o) => o.od === z.data)) {
    const tytul = z.typ !== 'porod' ? 'Przyjęcie dziecka' : z.przewidywana ? 'Przewidywany poród' : 'Poród';
    wynik.push({
      kod: kodZdarzenia(rodzina),
      data: z.data,
      tytul,
      opis: z.przewidywana ? 'Po urodzeniu dziecka proszę wpisać prawdziwą datę – terminy przeliczą się same.' : '',
      rodzaj: 'poczatek',
    });
  }

  // UZ art. 30a: ostatni dzień na wniosek o 81,5%. Gdy wariant jest wybrany, termin pokazuje sam wniosek (ZAM albo wniosek do pracodawcy).
  const o815 = osobaWniosku815(rodzina, plan);
  if (o815 && !plan.wariant815) {
    wynik.push({
      kod: 'TERMIN_815',
      data: termin815(rodzina, p),
      tytul: 'Ostatni dzień na wniosek o 81,5%',
      opis:
        'Po tym dniu zostaje wariant 100% i 70%.' +
        (z.przewidywana ? ' Liczymy od przewidywanej daty porodu – po porodzie termin się przesunie.' : ''),
      rodzaj: 'graniczny',
      osobaId: o815.osobaId,
      przepis: o815.przepis,
    });
  }

  // Terminy wniosków.
  for (const w of wnioskiZTerminami(rodzina, plan, p)) {
    if (w.termin === undefined) continue;
    wynik.push({
      kod: KODY_TERMINOW_WNIOSKOW[w.kod],
      data: w.termin,
      tytul: TYTULY_TERMINOW[w.kod] ?? 'Wniosek',
      opis: opisTerminu(w),
      rodzaj: 'wniosek',
      osobaId: w.osobaId,
      odcinekId: w.odcinekId,
      przepis: w.przepisTerminu ?? w.przepis,
    });
  }

  // Ponowne zgłoszenie do dobrowolnego ubezpieczenia chorobowego po zasiłku (zlecenie, działalność).
  // Podstawa: ustawa o systemie ubezpieczeń społecznych – jej tekstu nie ma w materialy/ZUS/tekst. Regułę i dzień
  // („dzień po końcu ostatniego odcinka zasiłkowego”) bierzemy z ZADANIA.md (D2) i research/katalog-swiadczen.yaml.
  // Research mówi o 7 dniach na zgłoszenie, ale w parametrach nie ma tej liczby – pokazujemy najwcześniejszy, bezpieczny dzień.
  for (const osoba of rodzina.osoby) {
    const koniecZasilku = new Map<string, { data: DataISO; zlecenie: boolean }>();
    for (const o of zasilkoweOsoby(plan, osoba.id)) {
      for (const t of tytulyDlaOdcinka(osoba, o)) {
        if (t.chorobowe !== 'dobrowolne' || !ubezpieczonyWDniu(t, o.od)) continue;
        const dotad = koniecZasilku.get(t.id);
        if (!dotad || o.do > dotad.data) koniecZasilku.set(t.id, { data: o.do, zlecenie: t.rodzaj === 'zlecenie' });
      }
    }
    const daty = new Set<DataISO>();
    for (const { data, zlecenie } of koniecZasilku.values()) {
      const dzien = dodajDni(data, 1);
      if (daty.has(dzien)) continue;
      daty.add(dzien);
      wynik.push({
        kod: 'PONOWNE_ZGLOSZENIE_PO_ZASILKU',
        data: dzien,
        tytul: 'Ponowne zgłoszenie do dobrowolnego ubezpieczenia chorobowego',
        opis: zlecenie
          ? 'Po zakończeniu zasiłku warto poprosić zleceniodawcę o ponowne zgłoszenie do dobrowolnego ubezpieczenia chorobowego od tego dnia. Dzięki temu znów będzie przysługiwać prawo do zasiłków.'
          : 'Po zakończeniu zasiłku trzeba od tego dnia ponownie zgłosić się do dobrowolnego ubezpieczenia chorobowego w ZUS. Dzięki temu znów będzie przysługiwać prawo do zasiłków.',
        rodzaj: 'wniosek',
        osobaId: osoba.id,
      });
    }
  }

  return wynik.sort((a, b) => a.data.localeCompare(b.data));
}
