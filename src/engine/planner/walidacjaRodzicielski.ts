/**
 * Walidacja urlopu rodzicielskiego i łączenia go z pracą – TOR A, zadanie A5.
 * Przepisy: KP art. 182¹a, 182¹c, 182¹d, 182¹e, 182¹f, 182¹g; UZ art. 31 ust. 4a. Decyzje D9, D10 w planie toru A
 * i odpowiedzi ZUS na stoisku 21.11 (pytania nr 6, 14, 15, 16, 39).
 */
import { dodajDni } from '../daty';
import type { Komunikat, Odcinek } from '../types';
import { dni, orzeczenie, przysluguje, tygodni } from '../eligibility/uprawnieniaTeksty';
import { czesciOsoby } from './odcinki';
import {
  czyLaczenieDozwolone,
  dataSlownie,
  dniOdcinka,
  DO_POTWIERDZENIA,
  koniecMacierzynskiegoOsoby,
  koniecRodzicielskiegoZPrzepisu,
  komunikat,
  type Kontekst,
  nazwaOsoby,
  slotyRodzicow,
  suma,
  uprawnienieDo,
  wydluzenieOdcinka,
  wymiarPracyOdcinka,
  zuzycieOdcinka,
  zWielkiej,
} from './walidacjaWspolne';

function procent(w: number): string {
  return `${Math.round(w * 100)}%`;
}

export function walidujRodzicielski(ctx: Kontekst): Komunikat[] {
  const { rodzina, plan, pule, p, uprawnienia } = ctx;
  const wynik: Komunikat[] = [];
  const rodz = plan.odcinki.filter((o) => o.typ === 'rodzicielski');
  const r7 = pule.rodzicielskiTyg * 7;
  const n7 = pule.rodzicielskiNieprzenoszalneTyg * 7;
  const zuz = (o: Odcinek) => zuzycieOdcinka(rodzina, o, p);

  // KP art. 182¹a § 3, § 6–7: pula jest wspólna; oboje naraz – razem nie więcej niż pula. Zużycie według D10.
  const wykorzystane = suma(rodz.map(zuz));
  if (wykorzystane > r7) {
    wynik.push(
      komunikat(
        'RODZ_PRZEKROCZONA_PULA',
        'blad',
        `Plan obejmuje ${dni(wykorzystane)} urlopu rodzicielskiego, a rodzicom razem ${przysluguje(r7)} ${dni(r7)}.`,
        'KP art. 182¹a § 3, § 6',
        { odcinekId: rodz[rodz.length - 1]?.id, coZrobic: 'Proszę skrócić któryś odcinek urlopu rodzicielskiego.' },
      ),
    );
  }

  // KP art. 182¹f § 1, § 1¹: urlop wydłużony przez pracę trwa najwyżej 82 / 86 / 130 / 134 tygodnie.
  const kalendarz = suma(rodz.map(dniOdcinka));
  const limit = pule.rodzicielskiMaxZPracaTyg * 7;
  if (kalendarz > limit) {
    wynik.push(
      komunikat(
        'RODZ_PRZEKROCZONY_LIMIT_Z_PRACA',
        'blad',
        `Urlop rodzicielski razem z wydłużeniem za pracę może trwać najwyżej ${tygodni(pule.rodzicielskiMaxZPracaTyg)} (${dni(limit)}). W planie trwa ${dni(kalendarz)}.`,
        'KP art. 182¹f § 1',
        { odcinekId: rodz[rodz.length - 1]?.id, coZrobic: 'Proszę skrócić odcinek, w którym urlop jest łączony z pracą.' },
      ),
    );
  } else if (kalendarz === limit && rodz.some((o) => wymiarPracyOdcinka(rodzina, o, p) > 0)) {
    wynik.push(
      komunikat(
        'LACZENIE_PRZYCIETE_DO_LIMITU',
        'ostrzezenie',
        `Urlop rodzicielski połączony z pracą osiągnął najdłuższy możliwy wymiar: ${tygodni(pule.rodzicielskiMaxZPracaTyg)}. Nie da się go już wydłużyć.`,
        'KP art. 182¹f § 1',
      ),
    );
  }

  // KP art. 182¹a § 4: każdy z rodziców ma 9 tygodni tylko dla siebie – drugi rodzic nie może ich wziąć. Bez wyjątku
  // dla rodzica bez prawa do zasiłku i dla rodziny z jednym rodzicem (odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14).
  const limitOsoby = r7 - n7;
  const koniecZPrzepisu = koniecRodzicielskiegoZPrzepisu(rodzina, pule);
  const osobyZRodz = [...new Set(rodz.map((o) => o.osobaId))];
  let czesciRazem = 0;
  for (const osobaId of osobyZRodz) {
    const odcinkiOsoby = rodz.filter((o) => o.osobaId === osobaId);
    const zuzOsoby = suma(odcinkiOsoby.map(zuz));
    const kto = nazwaOsoby(rodzina, osobaId);
    const ostatni = odcinkiOsoby[odcinkiOsoby.length - 1];
    if (zuzOsoby > limitOsoby) {
      wynik.push(
        komunikat(
          'RODZ_NIEPRZENOSZALNE',
          'blad',
          `Jedna osoba może wziąć najwyżej ${dni(limitOsoby)} urlopu rodzicielskiego, bo ${tygodni(pule.rodzicielskiNieprzenoszalneTyg)} ${przysluguje(pule.rodzicielskiNieprzenoszalneTyg)} tylko drugiemu rodzicowi i nikt inny nie może ich wziąć. ${zWielkiej(kto)} ma w planie ${dni(zuzOsoby)}.`,
          'KP art. 182¹a § 4',
          { osobaId, odcinekId: ostatni.id, coZrobic: `Proszę skrócić urlop rodzicielski tej osoby do ${dni(limitOsoby)}.` },
        ),
      );
    }

    const czesci = czesciOsoby(plan, osobaId, 'rodzicielski');
    czesciRazem += czesci.length;

    // KP art. 182¹a § 1, art. 182¹c: urlop rodzicielski tylko w pełnych tygodniach (odpowiedź ZUS na stoisku 21.11,
    // pytanie nr 15). Przy pracy liczy się zużycie puli – wydłużenie jest w dniach [KP art. 182¹f § 4]. Część, którą
    // kończy przepis (zgon dziecka), nie musi mieć pełnych tygodni [KP art. 182¹g].
    for (const c of czesci) {
      const wCzesci = odcinkiOsoby.filter((o) => c.od <= o.od && o.od <= c.do);
      if (suma(wCzesci.map(zuz)) % 7 !== 0 && c.do !== koniecZPrzepisu) {
        wynik.push(
          komunikat(
            'RODZ_NIEPELNY_TYDZIEN',
            'blad',
            `Urlop rodzicielski bierze się w pełnych tygodniach. Ta część (od ${dataSlownie(c.od)}) ma niepełny tydzień.`,
            'KP art. 182¹a § 1, art. 182¹c',
            { osobaId, odcinekId: wCzesci[0]?.id, coZrobic: 'Tę część trzeba wydłużyć albo skrócić tak, żeby miała pełne tygodnie.' },
          ),
        );
      }
    }
  }

  // KP art. 182¹c, art. 182¹d § 2: najwyżej 5 części dla obojga rodziców razem (część = ciąg stykających się odcinków
  // jednej osoby, D9; odpowiedź ZUS na stoisku 21.11, pytanie nr 39).
  if (czesciRazem > pule.rodzicielskiMaxCzesci) {
    wynik.push(
      komunikat(
        'RODZ_ZA_DUZO_CZESCI',
        'blad',
        `Urlop rodzicielski można podzielić najwyżej na ${pule.rodzicielskiMaxCzesci} części – to limit dla obojga rodziców razem. W planie jest ich ${czesciRazem}.`,
        'KP art. 182¹c, art. 182¹d § 2',
        {
          ...(osobyZRodz.length === 1 ? { osobaId: osobyZRodz[0] } : {}),
          odcinekId: rodz[rodz.length - 1]?.id,
          coZrobic: 'Warto połączyć odcinki, które są blisko siebie, albo usunąć jeden z nich.',
        },
      ),
    );
  }

  for (const o of rodz) {
    // KP art. 182¹c: najpóźniej do końca roku, w którym dziecko kończy 6 lat.
    if (pule.rodzicielskiDoKiedy && o.do > pule.rodzicielskiDoKiedy) {
      wynik.push(
        komunikat(
          'RODZ_PO_TERMINIE',
          'blad',
          `Z urlopu rodzicielskiego można korzystać najpóźniej do ${dataSlownie(pule.rodzicielskiDoKiedy)}. Ten odcinek kończy się później.`,
          'KP art. 182¹c',
          { osobaId: o.osobaId, odcinekId: o.id, coZrobic: `Ten odcinek trzeba zakończyć najpóźniej ${dataSlownie(pule.rodzicielskiDoKiedy)}.` },
        ),
      );
    }

    // KP art. 182¹a § 1: rodzicielski osoby zaczyna się po jej własnym macierzyńskim (także przejętym albo na warunkach
    // macierzyńskiego). Drugi rodzic może go brać w czasie macierzyńskiego mamy (odpowiedź ZUS na stoisku 21.11,
    // pytanie nr 16). Nikt nie bierze go przed dniem porodu albo przyjęcia dziecka.
    const koniecMacOsoby = koniecMacierzynskiegoOsoby(plan, o.osobaId);
    const z = rodzina.zdarzenie.data;
    if (koniecMacOsoby && o.od <= koniecMacOsoby) {
      wynik.push(
        komunikat(
          'RODZ_PRZED_KONCEM_MAC',
          'blad',
          `${zWielkiej(nazwaOsoby(rodzina, o.osobaId))} może zacząć urlop rodzicielski dopiero po swoim urlopie macierzyńskim, czyli najwcześniej ${dataSlownie(dodajDni(koniecMacOsoby, 1))}.`,
          'KP art. 182¹a § 1',
          { osobaId: o.osobaId, odcinekId: o.id, coZrobic: 'Proszę przesunąć początek tego odcinka na dzień po końcu urlopu macierzyńskiego tej osoby.' },
        ),
      );
    } else if (o.od < z) {
      wynik.push(
        komunikat(
          'RODZ_PRZED_KONCEM_MAC',
          'blad',
          `Urlop rodzicielski można zacząć najwcześniej w dniu ${rodzina.zdarzenie.typ === 'porod' ? 'porodu' : 'przyjęcia dziecka'}: ${dataSlownie(z)}.`,
          'KP art. 182¹a § 1',
          { osobaId: o.osobaId, odcinekId: o.id, coZrobic: `Proszę przesunąć początek tego odcinka na ${dataSlownie(z)} albo później.` },
        ),
      );
    }

    // KP art. 182¹e § 1: praca w czasie urlopu najwyżej na pół etatu.
    const w = o.wymiarPracy ?? 0;
    const max = p.limity.maxWymiarPracyPrzyLaczeniu;
    if (w > max) {
      wynik.push(
        komunikat(
          'PRACA_WYMIAR_ZA_DUZY',
          'blad',
          `W czasie urlopu rodzicielskiego można pracować najwyżej na ${procent(max)} etatu. W planie jest ${procent(w)}.`,
          'KP art. 182¹e § 1',
          { osobaId: o.osobaId, odcinekId: o.id, coZrobic: `Proszę zmniejszyć wymiar pracy do ${procent(max)} etatu.` },
        ),
      );
      continue;
    }
    if (w > 0 && !czyLaczenieDozwolone(rodzina, o)) {
      // NIEJASNE (pytanie 10): łączenie u osoby bez etatu – tymczasowo bez wydłużenia urlopu.
      wynik.push(
        komunikat(
          'LACZENIE_TYLKO_PRACOWNIK',
          'ostrzezenie',
          `Kodeks pracy pozwala łączyć urlop rodzicielski z pracą osobom na umowie o pracę. Przy innej umowie liczymy urlop bez wydłużenia. ${DO_POTWIERDZENIA}`,
          'KP art. 182¹e § 1',
          { osobaId: o.osobaId, odcinekId: o.id, coZrobic: 'Warto zapytać w ZUS, jak praca wpłynie na wysokość zasiłku.' },
        ),
      );
    }

    // KP art. 182¹f § 2–5; UZ art. 31 ust. 4a: urlop wydłuża się proporcjonalnie, zasiłek maleje o wymiar pracy.
    const wydluzenie = wydluzenieOdcinka(rodzina, o, p);
    if (wydluzenie > 0) {
      wynik.push(
        komunikat(
          'LACZENIE_WYDLUZA_URLOP',
          'konsekwencja',
          `Przy pracy w czasie urlopu na ${procent(w)} etatu ten odcinek zużywa z puli tylko ${dni(zuz(o))}, a urlop trwa o ${dni(wydluzenie)} dłużej. Zasiłek za ten czas jest mniejszy o ${procent(w)}.`,
          'KP art. 182¹f § 2, § 4; UZ art. 31 ust. 4a',
          { osobaId: o.osobaId, odcinekId: o.id },
        ),
      );
    }
  }

  // KP art. 182¹a § 4–5: niewykorzystana część wyłączna rodzica przepada (EC-59) – także gdy rodzic nie ma prawa
  // do zasiłku albo go nie ma (odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14).
  if (r7 > 0 && n7 > 0) {
    const tyg = pule.rodzicielskiNieprzenoszalneTyg;
    for (const s of slotyRodzicow(rodzina, plan, p)) {
      const przepada = n7 - s.wykorzystaneDni;
      if (przepada <= 0) continue;
      const bezPrawa = s.osobaId !== undefined && uprawnienieDo(uprawnienia.uprawnienia, s.osobaId, 'rodzicielski')?.przysluguje === false;
      wynik.push(
        !s.osobaId
          ? komunikat(
              'RODZ_9_TYG_DRUGIEGO_RODZICA',
              'ostrzezenie',
              `${tygodni(tyg)} urlopu rodzicielskiego może wykorzystać tylko drugi rodzic. Nie można ich przejąć, więc bez drugiego rodzica przepadną.`,
              'KP art. 182¹a § 4',
              { coZrobic: `Jeśli dziecko ma drugiego rodzica, warto dodać go do rodziny i zaplanować mu ${tygodni(tyg)}.` },
            )
          : bezPrawa
            ? komunikat(
                'RODZ_9_TYG_DRUGIEGO_RODZICA',
                'ostrzezenie',
                `${zWielkiej(nazwaOsoby(rodzina, s.osobaId))} nie ma prawa do zasiłku macierzyńskiego za okres urlopu rodzicielskiego. Ta część urlopu (${tygodni(tyg)}) przepada, bo nie przechodzi na drugiego rodzica.`,
                'KP art. 182¹a § 4',
                { osobaId: s.osobaId },
              )
            : komunikat(
                'RODZ_9_TYG_DRUGIEGO_RODZICA',
                'ostrzezenie',
                `${zWielkiej(nazwaOsoby(rodzina, s.osobaId))} ma ${tygodni(tyg)} urlopu rodzicielskiego tylko dla siebie. Przy tym planie z tej części ${orzeczenie(przepada, 'przepadnie', 'przepadną')} ${dni(przepada)}, bo nie można ich przekazać drugiemu rodzicowi.`,
                'KP art. 182¹a § 4',
                { osobaId: s.osobaId, coZrobic: `Warto zaplanować tej osobie co najmniej ${tygodni(tyg)} urlopu rodzicielskiego.` },
              ),
      );
    }
  }

  return wynik;
}
