/**
 * MOŻLIWOŚCI WYBORU – TOR A, zadanie A3 (docs/superpowers/plans/2026-11-21-tor-a.md, ZADANIA.md „A3”).
 *
 * „Gdzie jest wybór, od kiedy do kiedy i co się wtedy dzieje” (mentor ZUS). Zawsze 9 wpisów, po jednym na kod
 * z typu `Mozliwosc`, w kolejności typu. Niedostępna możliwość też ma wpis: `opis` mówi dlaczego, a daty
 * (gdy da się je policzyć) pokazują, od kiedy byłaby możliwa.
 *
 * Uprawnienia liczy A2 (`ustalListeUprawnien`), pule A1 (parametr `pule`). Liczby w tekstach – tylko z `p` i `pule`.
 * „Dziś” to `rodzina.dataAnalizy`. Ostatni dzień terminu jeszcze się liczy: KC art. 110–111 (terminy z UZ),
 * dla terminów z KP w zw. z KP art. 300.
 */
import { dodajDni, koniecPoTygodniach, pozniejsza, wczesniejsza } from '../daty';
import type { DataISO, Mozliwosc, Osoba, Parametry, Pule, Rodzina } from '../types';
import {
  dataSlownie,
  dni,
  DO_POTWIERDZENIA,
  kontekst,
  type KontekstA3,
  ma,
  nazwa,
  osobyZ,
  pracownikWDniu,
  proc,
  przejmujacy,
  PRZYKLAD_CZLONKA_RODZINY,
  przysluguje,
  tygodni,
  tygodniach,
  tygodniDop,
  uprawnienie,
  wniosek815PrzedPorodem,
} from './mozliwosciTeksty';

type Kod = Mozliwosc['kod'];

/** Kolejność wpisów = kolejność kodów w typie `Mozliwosc`. */
const KOLEJNOSC: Kod[] = [
  'urlop_przed_porodem',
  'rezygnacja_matki_i_przejecie',
  'wariant_815',
  'podzial_rodzicielskiego',
  'rodzicielski_jednoczesnie',
  'laczenie_z_praca',
  'ojcowski_w_czesciach',
  'uzupelniajacy',
  'przejecie_sytuacja_szczegolna',
];

/** Pytanie 11 (rozstrzygnięte): zleceniobiorca składa ZAM u płatnika, przedsiębiorca w ZUS. */
const ZAM_GDZIE = 'przy zleceniu u zleceniodawcy, przy działalności w ZUS';

export function ustalMozliwosci(rodzina: Rodzina, pule: Pule, p: Parametry): Mozliwosc[] {
  const k = kontekst(rodzina, pule, p);
  const reguly: Record<Kod, (k: KontekstA3) => Mozliwosc> = {
    urlop_przed_porodem: urlopPrzedPorodem,
    rezygnacja_matki_i_przejecie: rezygnacjaMatki,
    wariant_815: wariant815,
    podzial_rodzicielskiego: podzialRodzicielskiego,
    rodzicielski_jednoczesnie: rodzicielskiJednoczesnie,
    laczenie_z_praca: laczenieZPraca,
    ojcowski_w_czesciach: ojcowskiWCzesciach,
    uzupelniajacy: uzupelniajacy,
    przejecie_sytuacja_szczegolna: przejecieSytuacjaSzczegolna,
  };
  return KOLEJNOSC.map((kod) => reguly[kod](k));
}

// ───────────────────────── Pomocnicze ─────────────────────────

function wpis(kod: Kod, dostepna: boolean, opis: string, przepis: string, reszta: Partial<Mozliwosc> = {}): Mozliwosc {
  return { kod, dostepna, opis, konsekwencje: [], przepis, ...reszta };
}

/** Osoba z zasiłkiem za urlop macierzyński (poród: matka) albo na warunkach urlopu macierzyńskiego (przyjęcie). */
function glownaOsobaMacierzynskiego(k: KontekstA3): Osoba | undefined {
  if (k.porod) return k.matka && ma(k, k.matka.id, 'macierzynski') ? k.matka : undefined;
  return osobyZ(k, 'na_warunkach_macierzynskiego')[0];
}

/**
 * Pierwszy dzień urlopu rodzicielskiego: dzień po urlopie macierzyńskim (KP art. 182¹a w zw. z art. 180),
 * a gdy nikt nie ma zasiłku za urlop macierzyński (EC-56, UZ art. 29 ust. 9–10, art. 31 ust. 3h) – dzień porodu.
 */
function poczatekRodzicielskiego(k: KontekstA3): DataISO {
  return glownaOsobaMacierzynskiego(k) ? dodajDni(k.koniecMac, 1) : k.z;
}

/** Termin minął, gdy „dziś” jest po jego ostatnim dniu (KC art. 111 § 1). */
const poTerminie = (k: KontekstA3, doKiedy: DataISO | undefined) => doKiedy !== undefined && k.dzis > doKiedy;

const zdarzenieDop = (k: KontekstA3) => (k.porod ? 'porodzie' : 'przyjęciu dziecka');
const zdarzenieNarz = (k: KontekstA3) => (k.porod ? 'porodem' : 'przyjęciem dziecka');

// ───────────────────────── Urlop przed porodem ─────────────────────────

/** KP art. 180 § 2–3; dokument: rozporządzenie w sprawie dokumentów do zasiłków § 13 ust. 1 pkt 1. */
function urlopPrzedPorodem(k: KontekstA3): Mozliwosc {
  const { p, pule, z } = k;
  const przepis = 'KP art. 180 § 2–3; rozporządzenie w sprawie dokumentów do zasiłków § 13 ust. 1 pkt 1';
  const daty = { odKiedy: dodajDni(z, -pule.macierzynskiPrzedPorodemMaxTyg * 7), doKiedy: dodajDni(z, -1) };
  if (!k.porod) {
    return wpis('urlop_przed_porodem', false, 'Przy przyjęciu dziecka urlop na warunkach urlopu macierzyńskiego zaczyna się od dnia przyjęcia.', 'KP art. 183');
  }
  const ktoDecyduje = k.matka?.id;
  if (!k.matka || !ma(k, k.matka.id, 'macierzynski')) {
    return wpis(
      'urlop_przed_porodem',
      false,
      // KP art. 180 § 2–3 (urlop); UZ art. 29 ust. 1 (zasiłek za ten czas).
      `Urlop macierzyński można zacząć najwcześniej ${tygodni(pule.macierzynskiPrzedPorodemMaxTyg)} przed przewidywaną datą porodu. ` +
        'Za ten czas przysługuje zasiłek macierzyński, jeśli mama ma ubezpieczenie chorobowe. Według podanych danych mama ' +
        'nie ma prawa do tego zasiłku.',
      `${przepis}; UZ art. 29 ust. 1`,
      { ...daty, ktoDecyduje },
    );
  }
  if (!k.rodzina.zdarzenie.przewidywana) {
    return wpis('urlop_przed_porodem', false, 'Poród już był, więc urlopu przed porodem nie da się zaplanować.', przepis, { ktoDecyduje });
  }
  if (k.dzis === z) {
    return wpis(
      'urlop_przed_porodem',
      false,
      'Dziś jest przewidywany dzień porodu, więc urlopu przed porodem nie da się już zaplanować. Gdy dziecko się urodzi, proszę wpisać faktyczną datę porodu.',
      przepis,
      { ...daty, ktoDecyduje },
    );
  }
  if (poTerminie(k, daty.doKiedy)) {
    return wpis(
      'urlop_przed_porodem',
      false,
      'Przewidywana data porodu już minęła. Jeśli dziecko się urodziło, proszę wpisać faktyczną datę porodu.',
      przepis,
      { ...daty, ktoDecyduje },
    );
  }
  return wpis(
    'urlop_przed_porodem',
    true,
    `Urlop macierzyński można zacząć najwcześniej ${tygodni(pule.macierzynskiPrzedPorodemMaxTyg)} przed przewidywaną datą porodu.`,
    przepis,
    {
      ...daty,
      ktoDecyduje,
      konsekwencje: [
        // KP art. 180 § 3
        `Każdy dzień urlopu przed porodem skraca urlop po porodzie – razem urlop trwa ${tygodni(pule.macierzynskiTyg)}.`,
        // Rozporządzenie § 13 ust. 1 pkt 1
        'Potrzebne jest zaświadczenie lekarskie z przewidywaną datą porodu.',
        // KP art. 180 § 4–5: tata przejmuje tylko część pozostałą po co najmniej 14 tygodniach po porodzie.
        `Dni wzięte przed porodem zmniejszają część urlopu, którą po ${tygodniach(p.wymiaryTyg.obowiazkoweMatki)} od porodu mógłby przejąć tata.`,
        // NIEJASNE (pytanie nr 19): poród później niż przewidywany.
        `Jak rozliczyć dni, jeśli dziecko urodzi się później, niż przewidywał lekarz? ${DO_POTWIERDZENIA}`,
      ],
    },
  );
}

// ───────────────────────── Rezygnacja matki po 14 tygodniach ─────────────────────────

/** KP art. 180 § 4–5, § 8–9, § 14; UZ art. 29 ust. 3, art. 29a ust. 2. */
function rezygnacjaMatki(k: KontekstA3): Mozliwosc {
  const { p, z } = k;
  const przepis = 'KP art. 180 § 4–5, § 8–9, § 14; UZ art. 29 ust. 3';
  const tydzienMamy = p.wymiaryTyg.obowiazkoweMatki;
  const odKiedy = dodajDni(z, tydzienMamy * 7); // pierwszy dzień po 14 tygodniach od porodu (przyjęcia)
  const doKiedy = k.koniecMac;

  if (!k.porod) {
    // NIEJASNE (pytanie nr 45): przekazanie części urlopu na warunkach urlopu macierzyńskiego (UZ art. 29 ust. 4; KP art. 183 § 2).
    const glowna = glownaOsobaMacierzynskiego(k);
    return wpis(
      'rezygnacja_matki_i_przejecie',
      false,
      `Czy osoba na urlopie na warunkach urlopu macierzyńskiego może po ${tygodniach(tydzienMamy)} przekazać resztę urlopu drugiej osobie? ` +
        DO_POTWIERDZENIA,
      'UZ art. 29 ust. 4; KP art. 183 § 2 w zw. z art. 180 § 4–5',
      { odKiedy, doKiedy, ...(glowna ? { ktoDecyduje: glowna.id } : {}) },
    );
  }
  const ktoDecyduje = k.matka?.id;
  const nie = (opis: string, daty = true) =>
    wpis('rezygnacja_matki_i_przejecie', false, opis, przepis, daty ? { odKiedy, doKiedy, ktoDecyduje } : { ktoDecyduje });

  if (k.matkaOdeszla) {
    return nie(
      `W tej sytuacji resztę urlopu macierzyńskiego może przejąć tata albo inny członek najbliższej rodziny (${PRZYKLAD_CZLONKA_RODZINY}). ` +
        'Zasady są opisane przy przejęciu urlopu w szczególnej sytuacji.',
      false,
    );
  }
  if (!k.matka || !ma(k, k.matka.id, 'macierzynski')) {
    return nie('Mama nie ma prawa do zasiłku macierzyńskiego, więc nie ma z czego zrezygnować na rzecz taty.');
  }
  if (odKiedy > doKiedy) {
    return nie(`Urlop macierzyński jest krótszy niż ${tygodni(tydzienMamy)}, więc nie zostaje nic do przejęcia.`, false);
  }
  const tata = przejmujacy(k).find((o) => o.rola === 'ojciec');
  const opisWyboru = `Po ${tygodniach(tydzienMamy)} urlopu macierzyńskiego mama może wrócić do pracy, a resztę urlopu przejmie tata.`;
  if (!tata) {
    const ktos = k.rodzina.osoby.some((o) => o.rola === 'ojciec');
    return nie(
      ktos
        ? `${opisWyboru} Według podanych danych tata nie ma ubezpieczenia chorobowego, więc nie może przejąć urlopu.`
        : `${opisWyboru} Żeby to zaplanować, proszę dodać tatę.`,
    );
  }
  if (poTerminie(k, doKiedy)) return nie('Urlop macierzyński już się skończył.');

  const konsekwencje = [
    pracownikWDniu(k.matka, odKiedy)
      ? // KP art. 180 § 8
        `Mama składa pracodawcy wniosek o rezygnację z reszty urlopu najpóźniej ${dni(p.terminyDni.rezygnacjaMatkiPrzed)} przed powrotem ` +
        `do pracy (przy powrocie ${dataSlownie(odKiedy)} – do ${dataSlownie(dodajDni(odKiedy, -p.terminyDni.rezygnacjaMatkiPrzed))}).`
      : // UZ art. 29 ust. 3 – rezygnacja z pobierania zasiłku; zasiłek wypłaca płatnik albo ZUS (pytanie 11).
        `Mama zgłasza rezygnację z reszty zasiłku tam, gdzie składa wniosek o zasiłek (ZAM): ${ZAM_GDZIE}.`,
    pracownikWDniu(tata, odKiedy)
      ? // KP art. 180 § 9
        `Tata składa pracodawcy wniosek o urlop najpóźniej ${dni(p.terminyDni.przejecieOjcaPrzed)} przed przejęciem ` +
        `(przy przejęciu od ${dataSlownie(odKiedy)} – do ${dataSlownie(dodajDni(odKiedy, -p.terminyDni.przejecieOjcaPrzed))}).`
      : `Tata składa wniosek o zasiłek macierzyński za przejętą część (ZAM): ${ZAM_GDZIE}.`,
    // KP art. 180 § 5: część urlopu „przypadająca po dniu rezygnacji”.
    `Tata zaczyna urlop następnego dnia po ostatnim dniu urlopu mamy – najwcześniej ${dataSlownie(odKiedy)}, najpóźniej ${dataSlownie(doKiedy)}.`,
    // KP art. 180 § 14; UZ art. 29a ust. 2
    `Razem rodzice wykorzystają najwyżej ${tygodni(k.pule.macierzynskiTyg)} urlopu macierzyńskiego – tata dostaje tylko to, czego nie wykorzysta mama.`,
  ];
  // KP art. 180 § 4 pkt 2; UZ art. 29 ust. 3 – ubezpieczony, który nie jest pracownikiem, przerywa działalność zarobkową.
  if (!pracownikWDniu(tata, odKiedy)) {
    konsekwencje.push('Tata nie pracuje na umowie o pracę, więc na ten czas musi przerwać pracę zarobkową, żeby opiekować się dzieckiem.');
  }
  // UZ art. 31 ust. 3, 3g. Odpowiedź ZUS na stoisku 21.11, pytanie nr 5: tata przejmuje stawkę 81,5% wybraną przez mamę;
  // warunek wariantu – co najmniej 1 dzień urlopu rodzicielskiego przed pierwszymi urodzinami dziecka.
  const s815 = proc(p.stawkiProc.wariant815);
  konsekwencje.push(
    `Jeśli mama wybierze wariant ${s815}, tata za przejętą część dostanie tę samą stawkę – ${s815}. Żeby zachować ${s815}, ` +
      'jedno z rodziców musi wykorzystać co najmniej 1 dzień urlopu rodzicielskiego przed pierwszymi urodzinami dziecka. ' +
      `Inaczej zasiłek za okres urlopu rodzicielskiego wyniesie ${proc(p.stawkiProc.rodzicielski)}.`,
  );
  return wpis('rezygnacja_matki_i_przejecie', true, opisWyboru, przepis, { odKiedy, doKiedy, ktoDecyduje, konsekwencje });
}

// ───────────────────────── Wariant 81,5% ─────────────────────────

/** UZ art. 30a, art. 31 ust. 3, 3f, 3g, 4. Termin: `pule.wniosek815DoKiedy` (D18). */
function wariant815(k: KontekstA3): Mozliwosc {
  const { p, pule, z } = k;
  const s = p.stawkiProc;
  const przepis = 'UZ art. 30a, art. 31 ust. 3, 3f, 3g, 4';
  const doKiedy = pule.wniosek815DoKiedy;
  const urlop = k.urlopMac;
  const zwykly = `${proc(s.macierzynski)} za ${urlop.M} i ${proc(s.rodzicielski)} za okres urlopu rodzicielskiego`;
  const poTerminieOpis = (d: DataISO) =>
    `Termin na wniosek o wariant ${proc(s.wariant815)} minął – ostatni dzień był ${dataSlownie(d)}. Zostaje wypłata ${zwykly}.`;
  const wyrownanie =
    // UZ art. 31 ust. 3g, ust. 4
    `Jeśli w pierwszym roku życia dziecka nikt nie wykorzysta ani dnia urlopu rodzicielskiego, zasiłek za okres urlopu rodzicielskiego ` +
    `wyniesie ${proc(s.rodzicielski)}, a za ${urlop.M} można na wniosek dostać wyrównanie do ${proc(s.macierzynski)}.`;
  const terminWniosku = (d: DataISO) =>
    // UZ art. 30a ust. 1–2
    `Wniosek trzeba złożyć najpóźniej ${dni(p.terminyDni.wniosek815PoPorodzie)} po ${zdarzenieDop(k)} – do ${dataSlownie(d)}. ` +
    `Później zostaje wypłata ${zwykly}.`;

  if (k.porod && k.matkaOdeszla) {
    // NIEJASNE (pytania nr 5 i 6): wariant 81,5% dla osoby, która przejmuje zasiłek po zgonie matki albo porzuceniu dziecka.
    // zus.pl dopuszcza 81,5% dla ojca, gdy matka nieubezpieczona zmarła albo porzuciła dziecko (UZ art. 29 ust. 9);
    // w pozostałych przypadkach do potwierdzenia.
    const kto = przejmujacy(k)[0] ?? osobyZ(k, 'rodzicielski')[0];
    const pytanie = `Czy w tej sytuacji osoba, która przejmuje opiekę nad dzieckiem, może wybrać wariant ${proc(s.wariant815)}? ${DO_POTWIERDZENIA}`;
    if (!kto || !doKiedy) {
      return wpis('wariant_815', false, `Według podanych danych nikt w rodzinie nie ma prawa do zasiłku macierzyńskiego. ${pytanie}`, przepis);
    }
    if (poTerminie(k, doKiedy)) return wpis('wariant_815', false, poTerminieOpis(doKiedy), przepis, { odKiedy: z, doKiedy, ktoDecyduje: kto.id });
    return wpis('wariant_815', true, pytanie, `${przepis}; UZ art. 29 ust. 7, 9`, {
      odKiedy: z,
      doKiedy,
      ktoDecyduje: kto.id,
      konsekwencje: [terminWniosku(doKiedy), wyrownanie],
    });
  }

  const decyduje = glownaOsobaMacierzynskiego(k);
  if (!decyduje || !doKiedy) {
    let opis =
      `Wariant ${proc(s.wariant815)} wybiera osoba, która ma zasiłek za ${urlop.M}, a według podanych danych nikt w rodzinie ` +
      'nie ma do niego prawa.';
    // UZ art. 30a, art. 31 ust. 2, 3h. Odpowiedź ZUS na stoisku 21.11, pytanie nr 6: przy nieubezpieczonej mamie tata
    // bierze tylko zasiłek za okres urlopu rodzicielskiego, bez wyboru 81,5% – wniosek o 81,5% składa ubezpieczona mama.
    if (k.porod && osobyZ(k, 'rodzicielski').length > 0) {
      opis =
        `Wniosek o wariant ${proc(s.wariant815)} składa ubezpieczona mama razem z zasiłkiem za ${urlop.M}. Według podanych danych ` +
        `mama nie ma do niego prawa, więc zasiłek za okres urlopu rodzicielskiego wyniesie ${proc(s.rodzicielski)}.`;
    }
    return wpis('wariant_815', false, opis, przepis);
  }
  const ktoDecyduje = decyduje.id;
  if (poTerminie(k, doKiedy)) return wpis('wariant_815', false, poTerminieOpis(doKiedy), przepis, { odKiedy: z, doKiedy, ktoDecyduje });

  const konsekwencje = [terminWniosku(doKiedy)];
  if (k.dzis < z) {
    // NIEJASNE (pytanie nr 23): odpowiedź ZUS na stoisku 21.11, pytanie nr 23 – niepewna („chyba”): przed porodem wniosek
    // tylko razem z wnioskiem o urlop macierzyński przed porodem. Przy przyjęciu dziecka bez odpowiedzi.
    konsekwencje.push(
      k.porod
        ? wniosek815PrzedPorodem(p, doKiedy)
        : `Wniosek można złożyć już przed ${zdarzenieNarz(k)}. Czy taki wniosek będzie skuteczny? ${DO_POTWIERDZENIA}`,
    );
  }
  konsekwencje.push(
    // UZ art. 31 ust. 3f
    `Za ${tygodni(pule.rodzicielskiNieprzenoszalneTyg)} urlopu rodzicielskiego drugiego rodzica zasiłek i tak wyniesie ${proc(s.rodzicielski)}.`,
    wyrownanie,
  );
  return wpis(
    'wariant_815',
    true,
    `Można wybrać równą wypłatę ${proc(s.wariant815)} za cały ${urlop.M} i okres urlopu rodzicielskiego zamiast ${zwykly}.`,
    przepis,
    { odKiedy: z, doKiedy, ktoDecyduje, konsekwencje },
  );
}

// ───────────────────────── Urlop rodzicielski ─────────────────────────

interface StanRodzicielskiego {
  osoby: Osoba[];
  odKiedy: DataISO;
  doKiedy?: DataISO;
  /** Powód niedostępności całego urlopu rodzicielskiego (wspólny dla trzech możliwości). */
  brak?: string;
}

function stanRodzicielskiego(k: KontekstA3): StanRodzicielskiego {
  const osoby = osobyZ(k, 'rodzicielski');
  const odKiedy = poczatekRodzicielskiego(k);
  const doKiedy = k.pule.rodzicielskiDoKiedy;
  let brak: string | undefined;
  if (k.pule.rodzicielskiTyg <= 0) brak = 'W tej sytuacji urlop rodzicielski nie przysługuje.';
  else if (osoby.length === 0) brak = 'Według podanych danych nikt w rodzinie nie ma prawa do urlopu rodzicielskiego.';
  else if (poTerminie(k, doKiedy)) brak = `Urlop rodzicielski można było wykorzystać do ${dataSlownie(doKiedy!)}.`;
  return { osoby, odKiedy, doKiedy, brak };
}

/**
 * Ile tygodni urlopu rodzicielskiego mogą wziąć osoby z prawem. Gdy jedyną osobą jest tata nieubezpieczonej mamy
 * (`MATKA_NIEUBEZPIECZONA`) – pula bez 9 tygodni mamy (KP art. 182¹a § 4; odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14).
 */
function pulaRodzicielskiego(k: KontekstA3, osoby: Osoba[]): number {
  const bezMamy = osoby.every((o) => uprawnienie(k, o.id, 'rodzicielski')?.kod === 'MATKA_NIEUBEZPIECZONA');
  return bezMamy ? k.pule.rodzicielskiTyg - k.pule.rodzicielskiNieprzenoszalneTyg : k.pule.rodzicielskiTyg;
}

/** KP art. 182¹a § 4, art. 182¹c, art. 182¹d § 1–2. */
function podzialRodzicielskiego(k: KontekstA3): Mozliwosc {
  const { p, pule } = k;
  const przepis = 'KP art. 182¹a § 4, art. 182¹c, art. 182¹d';
  const r = stanRodzicielskiego(k);
  const daty = { odKiedy: r.odKiedy, ...(r.doKiedy ? { doKiedy: r.doKiedy } : {}) };
  if (r.brak) return wpis('podzial_rodzicielskiego', false, r.brak, przepis, daty);
  const dwoje = r.osoby.length > 1;
  const pracownicy = r.osoby.filter((o) => pracownikWDniu(o, r.odKiedy));
  const konsekwencje: string[] = [];
  // KP art. 182¹d § 1 – wniosek do pracodawcy (tylko pracownik).
  if (pracownicy.length > 0) {
    konsekwencje.push(`Każda część to osobny wniosek do pracodawcy, złożony najpóźniej ${dni(p.terminyDni.wniosekRodzicielskiPrzed)} przed jej początkiem.`);
  }
  if (pracownicy.length < r.osoby.length) {
    konsekwencje.push(`Bez umowy o pracę za każdą część trzeba złożyć osobny wniosek o zasiłek (ZAM): ${ZAM_GDZIE}.`);
  }
  konsekwencje.push(
    // KP art. 182¹a § 4
    `Każde z rodziców ma ${tygodni(pule.rodzicielskiNieprzenoszalneTyg)} tylko dla siebie – nie da się ich przekazać drugiej osobie.`,
    // KP art. 182¹c
    `Po ${dataSlownie(r.doKiedy!)} niewykorzystany urlop rodzicielski przepada.`,
  );
  // KP art. 182¹c, art. 182¹d § 2. Odpowiedź ZUS na stoisku 21.11, pytanie nr 39: limit części dotyczy obojga rodziców razem.
  konsekwencje.push(
    `Urlop rodzicielski można podzielić na najwyżej ${pule.rodzicielskiMaxCzesci} części łącznie dla obojga rodziców – ` +
      'liczą się też części drugiego rodzica i jego wnioski o zasiłek.',
  );
  return wpis(
    'podzial_rodzicielskiego',
    true,
    `Urlop rodzicielski (${tygodni(pulaRodzicielskiego(k, r.osoby))}) ${dwoje ? 'rodzice mogą' : 'można'} wziąć w całości albo podzielić ` +
      `na najwyżej ${pule.rodzicielskiMaxCzesci} części i rozłożyć je do ${dataSlownie(r.doKiedy!)}.`,
    przepis,
    { ...daty, ktoDecyduje: r.osoby[0].id, konsekwencje },
  );
}

/** KP art. 182¹a § 6–7; UZ art. 29a ust. 3. */
function rodzicielskiJednoczesnie(k: KontekstA3): Mozliwosc {
  const { pule } = k;
  const przepis = 'KP art. 182¹a § 6–7; UZ art. 29a ust. 3';
  const r = stanRodzicielskiego(k);
  const daty = { odKiedy: r.odKiedy, ...(r.doKiedy ? { doKiedy: r.doKiedy } : {}) };
  if (r.brak) return wpis('rodzicielski_jednoczesnie', false, r.brak, przepis, daty);
  if (r.osoby.length < 2) {
    return wpis(
      'rodzicielski_jednoczesnie',
      false,
      'Na urlopie rodzicielskim w tym samym czasie mogą być oboje rodzice. Żeby to zaplanować, proszę dodać drugą osobę z prawem do urlopu.',
      przepis,
      daty,
    );
  }
  return wpis('rodzicielski_jednoczesnie', true, 'Oboje rodzice mogą być na urlopie rodzicielskim w tym samym czasie.', przepis, {
    ...daty,
    konsekwencje: [
      // KP art. 182¹a § 6; UZ art. 29a ust. 3
      `Razem rodzice nie wykorzystają więcej niż ${tygodni(pule.rodzicielskiTyg)}: każdy dzień, w którym oboje są na urlopie, ` +
        'zużywa z puli dzień za każde z nich.',
      // KP art. 182¹a § 4
      `Każde z rodziców nadal ma swoje ${tygodni(pule.rodzicielskiNieprzenoszalneTyg)}, których nie można przekazać drugiej osobie.`,
      // NIEJASNE (pytanie nr 16): nakładanie się rodzicielskiego jednej osoby na macierzyński drugiej.
      `Czy urlop rodzicielski jednej osoby może się zacząć, zanim druga skończy ${k.urlopMac.M}? ${DO_POTWIERDZENIA}`,
    ],
  });
}

/** KP art. 182¹e, 182¹f; UZ art. 31 ust. 4a. Łączenie tylko przy umowie o pracę (D10, pytanie 10). */
function laczenieZPraca(k: KontekstA3): Mozliwosc {
  const { p, pule } = k;
  const przepis = 'KP art. 182¹e, art. 182¹f; UZ art. 31 ust. 4a';
  const r = stanRodzicielskiego(k);
  const daty = { odKiedy: r.odKiedy, ...(r.doKiedy ? { doKiedy: r.doKiedy } : {}) };
  if (r.brak) return wpis('laczenie_z_praca', false, r.brak, przepis, daty);
  const pracownicy = r.osoby.filter((o) => pracownikWDniu(o, r.odKiedy));
  if (pracownicy.length === 0) {
    // NIEJASNE (pytanie nr 10): łączenie urlopu z pracą u osób bez etatu (EC-85).
    return wpis(
      'laczenie_z_praca',
      false,
      'Łączenie urlopu rodzicielskiego z pracą (urlop się wtedy wydłuża) przepisy przewidują dla pracownika na umowie o pracę. ' +
        `Czy przy zleceniu albo działalności zasiłek też się wydłuża i zmniejsza? ${DO_POTWIERDZENIA}`,
      przepis,
      daty,
    );
  }
  const max = proc(p.limity.maxWymiarPracyPrzyLaczeniu * 100);
  const konsekwencje = [
    // KP art. 182¹e § 1
    `U pracodawcy, który udzielił urlopu, można pracować najwyżej na ${max} etatu. Na resztę czasu pracy przysługuje urlop.`,
    // KP art. 182¹f § 1–2
    `Urlop wydłuża się proporcjonalnie do wymiaru pracy, łącznie najwyżej do ${tygodniDop(pule.rodzicielskiMaxZPracaTyg)}.`,
    // UZ art. 31 ust. 4a
    'Zasiłek zmniejsza się proporcjonalnie do wymiaru pracy.',
    // KP art. 182¹e § 2
    `Wniosek o pracę w czasie urlopu trzeba złożyć najpóźniej ${dni(p.terminyDni.wniosekLaczeniePrzed)} przed jej początkiem. ` +
      'Pracodawca może odmówić, jeśli nie pozwala na to organizacja albo rodzaj pracy.',
    // KP art. 182¹e § 1 mówi tylko o pracodawcy udzielającym urlopu. NIEJASNE (pytanie nr 18): skutek dla zasiłku.
    `Praca u innego pracodawcy nie wydłuża urlopu. Jak wpływa na zasiłek? ${DO_POTWIERDZENIA}`,
  ];
  const inni = r.osoby.filter((o) => !pracownicy.includes(o));
  // NIEJASNE (pytanie nr 10): łączenie urlopu z pracą u osób bez etatu.
  if (inni.length > 0) konsekwencje.push(`${nazwa(inni[0])} nie ma umowy o pracę. Czy może łączyć urlop z pracą? ${DO_POTWIERDZENIA}`);
  return wpis(
    'laczenie_z_praca',
    true,
    `Można wrócić do pracy na część etatu (najwyżej ${max}) i dalej korzystać z urlopu rodzicielskiego. Urlop się wtedy wydłuża.`,
    przepis,
    { ...daty, ktoDecyduje: pracownicy[0].id, konsekwencje },
  );
}

// ───────────────────────── Urlop ojcowski ─────────────────────────

/** KP art. 182³ § 1, § 1¹, § 2. */
function ojcowskiWCzesciach(k: KontekstA3): Mozliwosc {
  const { p, pule, z } = k;
  const przepis = 'KP art. 182³';
  const osoby = osobyZ(k, 'ojcowski');
  const doKiedy = pule.ojcowskiDoKiedy;
  const daty = { odKiedy: z, ...(doKiedy ? { doKiedy } : {}) };
  if (osoby.length === 0 || pule.ojcowskiTyg <= 0 || !doKiedy) {
    const tata = k.rodzina.osoby.some((o) => o.rola === 'ojciec' || o.rola === 'przyjmujacy');
    return wpis(
      'ojcowski_w_czesciach',
      false,
      tata
        ? 'Według podanych danych nikt w rodzinie nie ma prawa do urlopu ojcowskiego.'
        : 'Urlop ojcowski przysługuje tacie z ubezpieczeniem chorobowym. Żeby go zaplanować, proszę dodać tatę.',
      przepis,
      daty,
    );
  }
  const kto = osoby[0];
  if (poTerminie(k, doKiedy)) {
    return wpis('ojcowski_w_czesciach', false, `Urlop ojcowski można było wykorzystać do ${dataSlownie(doKiedy)}.`, przepis, {
      ...daty,
      ktoDecyduje: kto.id,
    });
  }
  return wpis(
    'ojcowski_w_czesciach',
    true,
    `${nazwa(kto)} ma ${tygodni(pule.ojcowskiTyg)} urlopu ojcowskiego. Można je wziąć naraz albo w ${p.limity.ojcowskiMaxCzesci} częściach, ` +
      `każda co najmniej ${dni(p.limity.ojcowskiMinDniCzesci)}.`,
    przepis,
    {
      ...daty,
      ktoDecyduje: kto.id,
      konsekwencje: [
        pracownikWDniu(kto, pozniejsza(k.dzis, z))
          ? // KP art. 182³ § 2
            `Wniosek do pracodawcy trzeba złożyć najpóźniej ${dni(p.terminyDni.wniosekOjcowskiPrzed)} przed początkiem każdej części.`
          : `Bez umowy o pracę trzeba złożyć wniosek o zasiłek (ZAM): ${ZAM_GDZIE}.`,
        // KP art. 182³ § 1
        `Po ${dataSlownie(doKiedy)} prawo do urlopu ojcowskiego wygasa.`,
        // KP art. 182³ – odrębny urlop, nie z puli urlopu macierzyńskiego.
        `Urlop ojcowski nie zmniejsza ${k.porod ? 'urlopu mamy' : k.urlopMac.D} – to osobne prawo.`,
      ],
    },
  );
}

// ───────────────────────── Urlop uzupełniający ─────────────────────────

/** KP art. 180² § 1, § 3–5 (przy przyjęciu dziecka KP art. 183 § 3¹); UZ art. 31 ust. 1. */
function uzupelniajacy(k: KontekstA3): Mozliwosc {
  const { p, pule } = k;
  const przepis = k.porod ? 'KP art. 180²; UZ art. 31 ust. 1' : 'KP art. 183 § 3¹ w zw. z art. 180²; UZ art. 31 ust. 1';
  const odKiedy = dodajDni(k.koniecMac, 1); // „bezpośrednio po wykorzystaniu urlopu macierzyńskiego”
  const tyg = pule.uzupelniajacyTyg;
  if (tyg <= 0) {
    const przedPorodem = k.porod && k.rodzina.zdarzenie.przewidywana;
    return wpis(
      'uzupelniajacy',
      false,
      przedPorodem
        ? 'Urlop uzupełniający przysługuje, gdy dziecko urodzi się przedwcześnie albo po porodzie będzie w szpitalu. ' +
            'Jeśli tak się stanie, proszę uzupełnić dane dziecka po porodzie.'
        : `Według podanych danych urlop uzupełniający nie przysługuje – liczy się pobyt dziecka w szpitalu w pierwszych tygodniach po ${zdarzenieDop(k)}.`,
      przepis,
      { odKiedy },
    );
  }
  const doKiedy = koniecPoTygodniach(odKiedy, tyg);
  const osoby = osobyZ(k, 'uzupelniajacy');
  if (osoby.length === 0) {
    return wpis('uzupelniajacy', false, 'Według podanych danych nikt w rodzinie nie ma prawa do urlopu uzupełniającego.', przepis, { odKiedy, doKiedy });
  }
  const kto = osoby.find((o) => o.rola === 'matka') ?? osoby[0];
  if (poTerminie(k, k.koniecMac)) {
    return wpis('uzupelniajacy', false, `Urlop ${k.porod ? 'macierzyński' : 'na warunkach urlopu macierzyńskiego'} już się skończył, a urlop uzupełniający bierze się zaraz po nim.`, przepis, {
      odKiedy,
      doKiedy,
      ktoDecyduje: kto.id,
    });
  }
  const wniosekDo = dodajDni(k.koniecMac, -p.terminyDni.wniosekUzupelniajacyPrzedKoncem);
  return wpis(
    'uzupelniajacy',
    true,
    `Za pobyt dziecka w szpitalu ${przysluguje(tyg)} ${tygodni(tyg)} urlopu uzupełniającego, zaraz po ${k.urlopMac.Ms}.`,
    przepis,
    {
      odKiedy,
      doKiedy,
      ktoDecyduje: kto.id,
      konsekwencje: [
        // KP art. 180² § 1, § 4
        `Wykorzystuje go tylko jedno z rodziców, w całości, zaraz po ${k.urlopMac.Ms}.`,
        pracownikWDniu(kto, k.koniecMac)
          ? // KP art. 180² § 4
            `Wniosek do pracodawcy trzeba złożyć najpóźniej ${dni(p.terminyDni.wniosekUzupelniajacyPrzedKoncem)} przed końcem ` +
            `${k.urlopMac.D} – do ${dataSlownie(wniosekDo)}.`
          : `Bez umowy o pracę trzeba złożyć wniosek o zasiłek (ZAM): ${ZAM_GDZIE}.`,
        // KP art. 180² § 5
        'Do wniosku dołącza się zaświadczenie ze szpitala o pobycie dziecka.',
        // UZ art. 31 ust. 1
        `Zasiłek za ten czas wynosi ${proc(p.stawkiProc.uzupelniajacy)} podstawy.`,
      ],
    },
  );
}

// ───────────────────────── Przejęcie w sytuacji szczególnej ─────────────────────────

interface Sytuacja {
  odKiedy: DataISO;
  doKiedy: DataISO;
  przepis: string;
  /** Kto składa pierwszy wniosek: mama (rezygnacja, przerwanie) albo przejmujący (zgon, porzucenie). */
  decydujeMama: boolean;
  /** Pobyt mamy w szpitalu: przejęcie tylko na czas pobytu. */
  naCzasPobytu: boolean;
  konsekwencje: string[];
}

const WNIOSEK_PRZEJMUJACEGO = 'Wniosek o urlop albo zasiłek składa osoba, która przejmuje opiekę nad dzieckiem.';

/**
 * Sytuacja szczególna matki (KP art. 180 § 6–7, § 10–13, § 15; UZ art. 29 ust. 5–7, 9).
 * Kolejność sprawdzania: zgon, porzucenie, orzeczenie, szpital – pierwsza pasująca.
 */
function sytuacjaMatki(k: KontekstA3, z8: DataISO, przejmuje: Osoba[]): Sytuacja | undefined {
  const { p, koniecMac } = k;
  const matka = k.matka;
  const zd = matka?.zdrowie;
  if (!matka || !zd) return undefined;
  const ubezpieczona = ma(k, matka.id, 'macierzynski');
  const baza = { doKiedy: koniecMac, naCzasPobytu: false };

  if (zd.zgon !== undefined && zd.zgon <= koniecMac) {
    // KP art. 180 § 12 (§ 15 pkt 1 przy matce nieubezpieczonej); UZ art. 29 ust. 7 (ust. 9 pkt 1).
    return {
      ...baza,
      odKiedy: pozniejsza(dodajDni(zd.zgon, 1), k.z),
      przepis: ubezpieczona ? 'KP art. 180 § 12, § 14, § 16; UZ art. 29 ust. 7' : 'KP art. 180 § 15–16; UZ art. 29 ust. 9',
      decydujeMama: false,
      konsekwencje: [WNIOSEK_PRZEJMUJACEGO],
    };
  }
  if (zd.porzucenieDziecka !== undefined && zd.porzucenieDziecka <= koniecMac) {
    // KP art. 180 § 13 – nie wcześniej niż po 8 tygodniach; § 15 pkt 2 – matka nieubezpieczona: od dnia po porzuceniu.
    const poDniu = dodajDni(zd.porzucenieDziecka, 1);
    return {
      ...baza,
      odKiedy: ubezpieczona ? pozniejsza(poDniu, z8) : pozniejsza(poDniu, k.z),
      przepis: ubezpieczona ? 'KP art. 180 § 13–14, § 16; UZ art. 29 ust. 7' : 'KP art. 180 § 15–16; UZ art. 29 ust. 9',
      decydujeMama: false,
      konsekwencje: [WNIOSEK_PRZEJMUJACEGO],
    };
  }
  if (zd.orzeczenieNiezdolnosciSamodzielnejEgzystencji) {
    if (!ubezpieczona) {
      // KP art. 180 § 15 pkt 3; UZ art. 29 ust. 9 pkt 3 – od dnia powstania niezdolności; orzeczenie sprzed porodu → od porodu.
      return {
        ...baza,
        odKiedy: k.z,
        przepis: 'KP art. 180 § 15–16; UZ art. 29 ust. 9',
        decydujeMama: false,
        konsekwencje: [WNIOSEK_PRZEJMUJACEGO],
      };
    }
    // KP art. 180 § 6–9; UZ art. 29 ust. 5
    const r = p.terminyDni.rezygnacjaMatkiPrzed;
    const pr = p.terminyDni.przejecieOjcaPrzed;
    return {
      ...baza,
      odKiedy: z8,
      przepis: 'KP art. 180 § 6–9, § 14; UZ art. 29 ust. 5',
      decydujeMama: true,
      konsekwencje: [
        pracownikWDniu(matka, z8)
          ? // KP art. 180 § 8
            `Mama składa pracodawcy wniosek o rezygnację z reszty urlopu najpóźniej ${dni(r)} wcześniej ` +
            `(przy przejęciu od ${dataSlownie(z8)} – do ${dataSlownie(dodajDni(z8, -r))}).`
          : `Mama zgłasza rezygnację z reszty zasiłku tam, gdzie składa wniosek o zasiłek (ZAM): ${ZAM_GDZIE}.`,
        przejmuje.some((o) => pracownikWDniu(o, z8))
          ? // KP art. 180 § 9
            `Osoba na umowie o pracę, która przejmuje urlop, składa pracodawcy wniosek najpóźniej ${dni(pr)} przed jego początkiem ` +
            `(do ${dataSlownie(dodajDni(z8, -pr))}).`
          : `Osoba, która przejmuje urlop, składa wniosek o zasiłek (ZAM): ${ZAM_GDZIE}.`,
      ],
    };
  }
  if (ubezpieczona) {
    // KP art. 180 § 10–11; UZ art. 29 ust. 6 – pobyt matki w szpitalu po co najmniej 8 tygodniach urlopu po porodzie.
    const pobyt = (zd.pobytWSzpitalu ?? []).find((s) => s.do >= z8 && s.od <= koniecMac && s.od >= k.z);
    if (pobyt) {
      return {
        odKiedy: pozniejsza(pobyt.od, z8),
        doKiedy: wczesniejsza(pobyt.do, koniecMac),
        naCzasPobytu: true,
        przepis: 'KP art. 180 § 10–11, § 14, § 16; UZ art. 29 ust. 6',
        decydujeMama: true,
        konsekwencje: [
          'Mama może przerwać urlop macierzyński na czas pobytu w szpitalu. Jej zasiłek wtedy też się przerywa, ' +
            'a po wyjściu ze szpitala mama wraca do swojego urlopu.',
        ],
      };
    }
  }
  return undefined;
}

function przejecieSytuacjaSzczegolna(k: KontekstA3): Mozliwosc {
  const { p, pule } = k;
  const przepisOgolny = 'KP art. 180 § 6–17; UZ art. 29 ust. 5–7, 9';
  const z8 = dodajDni(k.z, p.wymiaryTyg.obowiazkoweMatkiSzczegolne * 7); // pierwszy dzień po 8 tygodniach od porodu
  const opisOgolny =
    'W szczególnych sytuacjach, np. gdy mama po porodzie musi zostać w szpitalu, część urlopu macierzyńskiego może przejąć ' +
    `tata albo inny członek najbliższej rodziny (${PRZYKLAD_CZLONKA_RODZINY}). Zwykle jest to możliwe po ` +
    `${tygodniach(p.wymiaryTyg.obowiazkoweMatkiSzczegolne)} od porodu.`;
  if (!k.porod) return wpis('przejecie_sytuacja_szczegolna', false, 'Ta możliwość dotyczy urlopu macierzyńskiego po porodzie.', przepisOgolny);

  const przejmuje = przejmujacy(k);
  const s = sytuacjaMatki(k, z8, przejmuje);
  if (!s) {
    return wpis('przejecie_sytuacja_szczegolna', false, opisOgolny, przepisOgolny, { odKiedy: z8, doKiedy: k.koniecMac });
  }
  const ktoDecyduje = s.decydujeMama ? k.matka?.id : przejmuje[0]?.id;
  const daty = { odKiedy: s.odKiedy, doKiedy: s.doKiedy, ...(ktoDecyduje ? { ktoDecyduje } : {}) };
  if (przejmuje.length === 0) {
    return wpis(
      'przejecie_sytuacja_szczegolna',
      false,
      `Urlop macierzyński może przejąć tata albo inny członek najbliższej rodziny (${PRZYKLAD_CZLONKA_RODZINY}) ` +
        'z ubezpieczeniem chorobowym. Żeby to zaplanować, proszę dodać taką osobę.',
      s.przepis,
      daty,
    );
  }
  if (poTerminie(k, s.doKiedy) || s.odKiedy > s.doKiedy) {
    return wpis('przejecie_sytuacja_szczegolna', false, 'Urlop macierzyński już się skończył, więc nie ma czego przejąć.', s.przepis, daty);
  }
  const konsekwencje = [
    ...s.konsekwencje,
    // KP art. 180 § 14; UZ art. 29a ust. 2
    `Mama i osoba, która przejmuje urlop, wykorzystają razem najwyżej ${tygodni(pule.macierzynskiTyg)} urlopu macierzyńskiego – ` +
      'osoba przejmująca dostaje tylko to, czego mama nie wykorzysta.',
  ];
  // UZ art. 29 ust. 5–7, 9 – ubezpieczony, który nie jest pracownikiem, przerywa działalność zarobkową.
  if (przejmuje.every((o) => !pracownikWDniu(o, s.odKiedy))) {
    konsekwencje.push('Osoba bez umowy o pracę musi na ten czas przerwać pracę zarobkową, żeby opiekować się dzieckiem.');
  }
  // NIEJASNE (pytanie nr 21): kto jest „członkiem najbliższej rodziny”. Odpowiedź ZUS na stoisku 21.11, pytanie nr 21:
  // bez pewności, w praktyce głównie dziadkowie albo rodzeństwo mamy – przykład w tekście, dopisek zostaje.
  if (przejmuje.some((o) => o.rola === 'inny_czlonek_rodziny')) {
    konsekwencje.push(
      `Członkiem najbliższej rodziny, który może przejąć urlop, jest zwykle ktoś bliski mamie (${PRZYKLAD_CZLONKA_RODZINY}). ` +
        `Kto dokładnie należy do najbliższej rodziny? ${DO_POTWIERDZENIA}`,
    );
  }
  const kto = przejmuje[0].rola === 'ojciec' ? 'tata' : 'inny członek najbliższej rodziny';
  const okres = `od ${dataSlownie(s.odKiedy)} do ${dataSlownie(s.doKiedy)}`;
  return wpis(
    'przejecie_sytuacja_szczegolna',
    true,
    s.naCzasPobytu
      ? `Na czas pobytu mamy w szpitalu urlop macierzyński może przejąć ${kto} – ${okres}.`
      : `Resztę urlopu macierzyńskiego może przejąć ${kto} – ${okres}.`,
    s.przepis,
    { ...daty, konsekwencje },
  );
}
