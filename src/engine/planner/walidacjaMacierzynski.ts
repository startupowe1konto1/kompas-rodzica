/**
 * Walidacja urlopu macierzyńskiego i uzupełniającego – TOR A, zadanie A5.
 * Przepisy: KP art. 180, 180¹, 180²; UZ art. 29a.
 */
import { dodajDni, pozniejsza, wczesniejsza } from '../daty';
import type { DataISO, Komunikat, Odcinek, Osoba } from '../types';
import { dni as dniSlownie, orzeczenie, przysluguje, tygodni } from '../eligibility/uprawnieniaTeksty';
import { czesciOsoby } from './odcinki';
import {
  dataSlownie,
  dniOdcinka,
  komunikat,
  type Kontekst,
  nazwaOsoby,
  ostatniDzien,
  pulaMacierzynskiego,
  suma,
  TYPY_MACIERZYNSKIE,
  uprawnienieDo,
  zWielkiej,
} from './walidacjaWspolne';

/**
 * Do kiedy matka musi sama, bez przerwy korzystać z macierzyńskiego po porodzie:
 *  - zwykle 14 tygodni [KP art. 180 § 4];
 *  - orzeczenie o niezdolności do samodzielnej egzystencji: 8 tygodni [§ 6–7];
 *  - porzucenie dziecka: do dnia porzucenia, ale nie krócej niż 8 tygodni [§ 13, art. 182];
 *  - zgon matki: do dnia zgonu [§ 12].
 * Pobyt w szpitalu NIE skraca tego okresu – pozwala tylko przerwać urlop po 8 tygodniach na dni pobytu [§ 10–11]
 * (sprawdza to `pierwszyDzienBezMatki`). Nigdy dłużej niż do końca puli.
 */
function wymaganyKoniec(matka: Osoba, z: DataISO, koniecPuli: DataISO, ctx: Kontekst): { do: DataISO; koniec8: DataISO; przepis: string } {
  const { p } = ctx;
  const koniec14 = wczesniejsza(dodajDni(z, p.wymiaryTyg.obowiazkoweMatki * 7 - 1), koniecPuli);
  const koniec8 = wczesniejsza(dodajDni(z, p.wymiaryTyg.obowiazkoweMatkiSzczegolne * 7 - 1), koniecPuli);
  const zd = matka.zdrowie ?? {};
  let wymagany = koniec14;
  const przepisy = ['KP art. 180 § 4'];
  if (zd.orzeczenieNiezdolnosciSamodzielnejEgzystencji) {
    wymagany = wczesniejsza(wymagany, koniec8);
    przepisy.push('§ 6');
  }
  if (zd.porzucenieDziecka) {
    wymagany = wczesniejsza(wymagany, pozniejsza(koniec8, zd.porzucenieDziecka));
    przepisy.push('§ 13, art. 182');
  }
  if (zd.zgon) {
    wymagany = wczesniejsza(wymagany, zd.zgon);
    przepisy.push('§ 12');
  }
  if (zd.pobytWSzpitalu?.length) przepisy.push('§ 10');
  return { do: wymagany, koniec8, przepis: przepisy.join(', ') };
}

/** Pierwszy dzień od porodu do `wymagany`, w którym matka nie ma macierzyńskiego, a nie jest to dozwolona przerwa na szpital. */
function pierwszyDzienBezMatki(matka: Osoba, odcinkiMatki: Odcinek[], z: DataISO, wymagany: { do: DataISO; koniec8: DataISO }): DataISO | undefined {
  // Pętla `while`, nie `for (…; d = dodajDni(d, 1))`: kompilator Next.js przepisuje pętlę `for`, której zmienną
  // przechwytują funkcje strzałkowe, i gubi wtedy import w wyrażeniu aktualizacji (ReferenceError w API, Vitest tego nie widzi).
  let d = z;
  while (d <= wymagany.do) {
    const dzien = d;
    const maUrlop = odcinkiMatki.some((o) => o.od <= dzien && dzien <= o.do);
    // KP art. 180 § 10: po wykorzystaniu 8 tygodni matka w szpitalu może przerwać urlop na czas pobytu.
    const przerwaNaSzpital =
      dzien > wymagany.koniec8 && (matka.zdrowie?.pobytWSzpitalu?.some((s) => s.od <= dzien && dzien <= s.do) ?? false);
    if (!maUrlop && !przerwaNaSzpital) return dzien;
    d = dodajDni(d, 1);
  }
  return undefined;
}

export function walidujMacierzynski(ctx: Kontekst): Komunikat[] {
  const { rodzina, plan, pule, p, uprawnienia } = ctx;
  const z = rodzina.zdarzenie.data;
  const wynik: Komunikat[] = [];
  const mac = plan.odcinki.filter((o) => TYPY_MACIERZYNSKIE.includes(o.typ));
  const pula = pulaMacierzynskiego(rodzina, plan, pule);
  const koniecPuli = pula.ostatniDzien ?? dodajDni(z, pula.dni - 1);

  // KP art. 180 § 1, § 14; UZ art. 29a ust. 2: łącznie (matka i osoba, która przejmuje) nie więcej niż wymiar.
  const wykorzystane = suma(mac.map(dniOdcinka));
  const poKoncu = pula.ostatniDzien ? mac.find((o) => o.do > pula.ostatniDzien!) : undefined;
  if (wykorzystane > pula.dni || poKoncu) {
    wynik.push(
      komunikat(
        'MAC_PRZEKROCZONY_WYMIAR',
        'blad',
        pula.ostatniDzien
          ? `Urlop macierzyński może trwać najdłużej do ${dataSlownie(pula.ostatniDzien)}. W planie trwa dłużej.`
          : `Plan obejmuje ${dniSlownie(wykorzystane)} urlopu macierzyńskiego, a wszystkim osobom razem ${przysluguje(pula.dni)} ${dniSlownie(pula.dni)}.`,
        pula.ostatniDzien ? 'KP art. 180¹' : 'KP art. 180 § 1, § 14',
        {
          odcinekId: (poKoncu ?? mac[mac.length - 1])?.id,
          coZrobic: 'Proszę skrócić urlop macierzyński tak, żeby zmieścił się w wymiarze.',
        },
      ),
    );
  }

  // KP art. 180 § 2: przed przewidywaną datą porodu najwyżej 6 tygodni.
  if (rodzina.zdarzenie.typ === 'porod') {
    const najwczesniej = dodajDni(z, -pule.macierzynskiPrzedPorodemMaxTyg * 7);
    for (const o of mac.filter((x) => x.typ === 'macierzynski' && x.od < najwczesniej)) {
      wynik.push(
        komunikat(
          'MAC_PRZED_PORODEM_MAX_6',
          'blad',
          `Przed porodem można wykorzystać najwyżej ${tygodni(pule.macierzynskiPrzedPorodemMaxTyg)} urlopu macierzyńskiego, czyli zacząć go najwcześniej ${dataSlownie(najwczesniej)}.`,
          'KP art. 180 § 2',
          { osobaId: o.osobaId, odcinekId: o.id, coZrobic: `Proszę przesunąć początek urlopu na ${dataSlownie(najwczesniej)} albo później.` },
        ),
      );
    }
  }

  const matka = rodzina.osoby.find((o) => o.rola === 'matka');
  if (!matka) return wynik;
  const odcinkiMatki = mac.filter((o) => o.osobaId === matka.id && o.typ === 'macierzynski');
  const czesciMatki = czesciOsoby(plan, matka.id, 'macierzynski');
  const przejecia = mac.filter((o) => o.osobaId !== matka.id && o.typ === 'macierzynski');
  const matkaMaPrawo = uprawnienieDo(uprawnienia.uprawnienia, matka.id, 'macierzynski')?.przysluguje === true;

  // KP art. 180 § 4–13: matka sama wykorzystuje po porodzie okres obowiązkowy, zanim zrezygnuje z reszty.
  // Matka z prawem do macierzyńskiego, a bez urlopu w planie (także pusty plan) – też błąd.
  let blokMin = false;
  if (odcinkiMatki.length > 0 || matkaMaPrawo) {
    const wymagany = wymaganyKoniec(matka, z, koniecPuli, ctx);
    const luka = wymagany.do >= z ? pierwszyDzienBezMatki(matka, odcinkiMatki, z, wymagany) : undefined;
    if (luka) {
      blokMin = true;
      const odcinek = odcinkiMatki.find((o) => o.do === dodajDni(luka, -1)) ?? odcinkiMatki[0];
      wynik.push(
        komunikat(
          'MAC_MIN_14_TYG',
          'blad',
          `Po porodzie mama musi sama, bez przerwy korzystać z urlopu macierzyńskiego do ${dataSlownie(wymagany.do)}. W tym planie mama nie ma urlopu od ${dataSlownie(luka)}. Dopiero po tym okresie resztę urlopu może przejąć druga osoba.`,
          wymagany.przepis,
          {
            osobaId: matka.id,
            odcinekId: odcinek?.id,
            coZrobic: `Trzeba zaplanować mamie urlop macierzyński bez przerwy co najmniej do ${dataSlownie(wymagany.do)}.`,
          },
        ),
      );
    }
  }

  // KP art. 180 § 4: z reszty urlopu matka rezygnuje tylko wtedy, gdy wykorzysta ją druga osoba. Bez przejęcia
  // niewykorzystane dni przepadają.
  if (!blokMin && odcinkiMatki.length > 0 && przejecia.length === 0 && wykorzystane < pula.dni) {
    const koniec = ostatniDzien(odcinkiMatki)!;
    wynik.push(
      komunikat(
        'MAC_RESZTA_PRZEPADNIE',
        'ostrzezenie',
        `Mama kończy urlop macierzyński ${dataSlownie(koniec)}, a nikt nie przejmuje reszty. ${orzeczenie(pula.dni - wykorzystane, 'Przepadnie', 'Przepadną')} wtedy ${dniSlownie(pula.dni - wykorzystane)} urlopu, bo z reszty urlopu można zrezygnować tylko wtedy, gdy wykorzysta ją druga osoba.`,
        'KP art. 180 § 4',
        {
          osobaId: matka.id,
          odcinekId: odcinkiMatki.find((o) => o.do === koniec)?.id,
          coZrobic: 'Warto wydłużyć urlop mamy do końca puli albo zaplanować przejęcie reszty przez tatę.',
        },
      ),
    );
  }

  // KP art. 180 § 5, § 7, § 11–13: druga osoba przejmuje część urlopu przypadającą po dniu rezygnacji matki,
  // więc zaczyna dokładnie dzień po końcu jej urlopu. Gdy matka nie ma macierzyńskiego w planie (KP art. 180 § 15, § 17),
  // przejęcie liczy się od zdarzenia – tego tu nie sprawdzamy.
  if (czesciMatki.length > 0) {
    for (const osobaId of [...new Set(przejecia.map((o) => o.osobaId))]) {
      for (const c of czesciOsoby(plan, osobaId, 'macierzynski')) {
        const odcinek = przejecia.find((o) => o.osobaId === osobaId && o.od === c.od) as Odcinek;
        const przed = ostatniDzien(czesciMatki.filter((m) => m.do < c.od));
        const kto = nazwaOsoby(rodzina, osobaId);
        if (!przed || dodajDni(przed, 1) !== c.od) {
          wynik.push(
            komunikat(
              'MAC_PRZEJECIE_BEZ_CIAGLOSCI',
              'blad',
              `${zWielkiej(kto)} może przejąć resztę urlopu macierzyńskiego tylko od dnia następnego po końcu urlopu mamy.${przed ? ` W tym planie byłby to ${dataSlownie(dodajDni(przed, 1))}.` : ''}`,
              'KP art. 180 § 5, § 7',
              { osobaId, odcinekId: odcinek.id, coZrobic: 'Proszę ustawić początek tego odcinka na dzień po końcu urlopu mamy.' },
            ),
          );
        } else {
          wynik.push(
            komunikat(
              'OJCIEC_MUSI_PRZEJAC',
              'konsekwencja',
              `Mama kończy urlop macierzyński ${dataSlownie(przed)}. ${zWielkiej(kto)} przejmuje resztę urlopu od ${dataSlownie(c.od)} i musi zacząć go dokładnie tego dnia.`,
              'KP art. 180 § 4–5, § 8–9',
              {
                osobaId,
                odcinekId: odcinek.id,
                coZrobic: `Mama składa pracodawcy wniosek o rezygnację z reszty urlopu co najmniej ${dniSlownie(p.terminyDni.rezygnacjaMatkiPrzed)} przed powrotem do pracy. ${zWielkiej(kto)} składa wniosek o urlop co najmniej ${dniSlownie(p.terminyDni.przejecieOjcaPrzed)} przed jego początkiem.`,
              },
            ),
          );
        }
      }
    }
  }

  return wynik;
}

export function walidujUzupelniajacy(ctx: Kontekst): Komunikat[] {
  const { plan, pule } = ctx;
  const wynik: Komunikat[] = [];
  const uzup = plan.odcinki.filter((o) => o.typ === 'uzupelniajacy');
  if (uzup.length === 0) return wynik;

  // KP art. 180² § 1, § 4: pracownica albo pracownik-ojciec – jedna osoba, jednorazowo.
  const osoby = [...new Set(uzup.map((o) => o.osobaId))];
  if (osoby.length > 1) {
    const drugi = uzup.find((o) => o.osobaId === osoby[1]);
    wynik.push(
      komunikat(
        'UZUP_DLA_OBOJGA',
        'blad',
        'Uzupełniający urlop macierzyński może wziąć tylko jedno z rodziców.',
        'KP art. 180² § 1, § 4',
        { osobaId: drugi?.osobaId, odcinekId: drugi?.id, coZrobic: 'Ten urlop może zostać w planie tylko jednej osoby.' },
      ),
    );
  }

  // KP art. 180² § 1: bezpośrednio po wykorzystaniu urlopu macierzyńskiego.
  const koniecMac = ostatniDzien(plan.odcinki.filter((o) => TYPY_MACIERZYNSKIE.includes(o.typ)));
  for (const osobaId of osoby) {
    for (const c of czesciOsoby(plan, osobaId, 'uzupelniajacy')) {
      if (!koniecMac || c.od !== dodajDni(koniecMac, 1)) {
        const odcinek = uzup.find((o) => o.osobaId === osobaId && o.od === c.od);
        wynik.push(
          komunikat(
            'UZUP_NIE_PO_MAC',
            'blad',
            koniecMac
              ? `Uzupełniający urlop macierzyński zaczyna się od razu po urlopie macierzyńskim, czyli ${dataSlownie(dodajDni(koniecMac, 1))}.`
              : 'Uzupełniający urlop macierzyński zaczyna się od razu po urlopie macierzyńskim, a w planie nie ma urlopu macierzyńskiego.',
            'KP art. 180² § 1',
            { osobaId, odcinekId: odcinek?.id, coZrobic: 'Początek tego urlopu trzeba ustawić na dzień po końcu urlopu macierzyńskiego.' },
          ),
        );
      }
    }
  }

  // KP art. 180² § 1, § 3: tydzień urlopu za każdy tydzień pobytu dziecka w szpitalu.
  const dni = suma(uzup.map(dniOdcinka));
  const pula = pule.uzupelniajacyTyg * 7;
  if (dni > pula) {
    wynik.push(
      komunikat(
        'UZUP_PRZEKROCZONY_WYMIAR',
        'blad',
        `Plan obejmuje ${dniSlownie(dni)} uzupełniającego urlopu macierzyńskiego, a ${przysluguje(pula)} ${dniSlownie(pula)}.`,
        'KP art. 180² § 1, § 3',
        { odcinekId: uzup[uzup.length - 1].id, coZrobic: `Proszę skrócić ten urlop do ${dniSlownie(pula)}.` },
      ),
    );
  }
  return wynik;
}
