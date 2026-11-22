/**
 * PRZYKŁAD WZORCOWY (przypadek EC-01): mama na etacie, jedno dziecko, poród 1.12.2026.
 *
 * Policzony ręcznie. Służy do trzech rzeczy:
 *  1. atrapy silnika zwracają go, dopóki dany tor nie zaimplementuje swojej funkcji,
 *  2. UI (tor C) ma od pierwszej minuty dane w docelowym kształcie,
 *  3. po implementacji staje się testem: prawdziwy silnik ma dać ten sam wynik.
 *
 * Dane osobowe są fikcyjne.
 */
import type {
  Plan,
  Rodzina,
  WynikDokumentow,
  WynikKwot,
  WynikUprawnien,
  WynikWalidacji,
} from '../engine/types';

export const PRZYKLAD_RODZINA: Rodzina = {
  dataAnalizy: '2026-11-21',
  osoby: [
    {
      id: 'mama',
      rola: 'matka',
      dane: { imie: 'Anna', nazwisko: 'Przykładowa', dataUrodzenia: '1994-05-12' },
      tytuly: [
        {
          id: 'etat-1',
          rodzaj: 'umowa_o_prace',
          chorobowe: 'obowiazkowe',
          od: '2023-03-01',
          wymiarEtatu: 1,
          wynagrodzenieMiesieczne: 8000,
          platnikPowyzej20: true,
          nazwaPlatnika: 'Przykładowa Firma sp. z o.o.',
        },
      ],
    },
  ],
  zdarzenie: {
    typ: 'porod',
    data: '2026-12-01',
    przewidywana: true,
    dzieci: [{}],
  },
};

export const PRZYKLAD_UPRAWNIENIA: WynikUprawnien = {
  uprawnienia: [
    {
      kod: 'UBEZP_W_DNIU_PORODU',
      osobaId: 'mama',
      swiadczenie: 'macierzynski',
      przysluguje: true,
      powod: 'W dniu porodu mama będzie objęta ubezpieczeniem chorobowym z umowy o pracę.',
      przepis: 'UZ art. 29 ust. 1',
      tytulId: 'etat-1',
    },
    {
      kod: 'RODZ_PO_MACIERZYNSKIM',
      osobaId: 'mama',
      swiadczenie: 'rodzicielski',
      przysluguje: true,
      powod: 'Po urlopie macierzyńskim można skorzystać z urlopu rodzicielskiego. 9 tygodni z tej puli jest tylko dla drugiego rodzica.',
      przepis: 'KP art. 182¹a',
      tytulId: 'etat-1',
    },
    {
      kod: 'CHOROBOWY_PO_WYCZEKIWANIU',
      osobaId: 'mama',
      swiadczenie: 'zasilek_chorobowy_ciaza',
      przysluguje: true,
      powod: 'Ubezpieczenie trwa ponad 30 dni, więc za zwolnienie w ciąży przysługuje 100% podstawy.',
      przepis: 'UZ art. 4 ust. 1, art. 11 ust. 2',
      tytulId: 'etat-1',
    },
    {
      kod: 'UZUP_BRAK_PRZESLANEK',
      osobaId: 'mama',
      swiadczenie: 'uzupelniajacy',
      przysluguje: false,
      powod: 'Ten urlop jest dla rodziców wcześniaków i dzieci, które po porodzie zostały w szpitalu.',
      przepis: 'KP art. 180²',
    },
  ],
  pule: {
    macierzynskiTyg: 20,
    macierzynskiPrzedPorodemMaxTyg: 6,
    obowiazkoweMatkiTyg: 14,
    uzupelniajacyTyg: 0,
    rodzicielskiTyg: 41,
    rodzicielskiNieprzenoszalneTyg: 9,
    rodzicielskiMaxZPracaTyg: 82,
    rodzicielskiMaxCzesci: 5,
    ojcowskiTyg: 2,
    rodzicielskiDoKiedy: '2032-12-31',
    ojcowskiDoKiedy: '2027-11-30',
    wniosek815DoKiedy: '2026-12-22',
  },
  mozliwosci: [
    {
      kod: 'wariant_815',
      dostepna: true,
      opis: 'Można wybrać równą wypłatę 81,5% przez cały urlop macierzyński i rodzicielski zamiast 100%, a potem 70%.',
      odKiedy: '2026-12-01',
      doKiedy: '2026-12-22',
      konsekwencje: [
        'Wniosek trzeba złożyć najpóźniej 21 dni po porodzie. Później zostaje wariant 100% i 70%.',
        '9 tygodni urlopu rodzicielskiego drugiego rodzica i tak będzie płatne 70%.',
      ],
      przepis: 'UZ art. 30a, art. 31 ust. 3',
      ktoDecyduje: 'mama',
    },
    {
      kod: 'rezygnacja_matki_i_przejecie',
      dostepna: false,
      opis: 'Po 14 tygodniach mama może wrócić do pracy, jeśli resztę urlopu macierzyńskiego przejmie tata. Żeby to zaplanować, warto dodać drugą osobę.',
      odKiedy: '2027-03-09',
      konsekwencje: [
        'Mama składa wniosek o rezygnację najpóźniej 7 dni przed powrotem do pracy.',
        'Tata składa wniosek o urlop najpóźniej 14 dni przed przejęciem i zaczyna go dzień po zakończeniu urlopu mamy.',
      ],
      przepis: 'KP art. 180 § 4–5, 8–9',
      ktoDecyduje: 'mama',
    },
  ],
  ryzyka: [
    {
      kod: 'TERMIN_815',
      osobaId: 'mama',
      tytul: 'Wariant 81,5% wymaga wniosku w 21 dni',
      coMozeSieStac: 'Bez wniosku złożonego do 22 grudnia 2026 zostaje wariant 100% i 70%.',
      dlaczego: 'Termin liczy się od dnia porodu i nie da się go przywrócić.',
      coZrobic: 'Warto porównać oba warianty w planerze i zdecydować przed porodem.',
      przepis: 'UZ art. 30a',
    },
  ],
};

export const PRZYKLAD_PLAN: Plan = {
  id: 'mama-caly-urlop',
  nazwa: 'Mama: cały urlop macierzyński i swoja część rodzicielskiego',
  wariant815: false,
  odcinki: [
    { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19', tytulId: 'etat-1' },
    { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29', czescNr: 1, tytulId: 'etat-1' },
  ],
};

export const PRZYKLAD_WALIDACJA: WynikWalidacji = {
  poprawny: true,
  bledy: [],
  ostrzezenia: [
    {
      kod: 'RODZ_9_TYG_DRUGIEGO_RODZICA',
      poziom: 'ostrzezenie',
      tresc: '9 tygodni urlopu rodzicielskiego może wykorzystać tylko drugi rodzic. Jeśli tego nie zrobi, te tygodnie przepadną.',
      przepis: 'KP art. 182¹a § 4',
      coZrobic: 'Warto dodać drugą osobę i zaplanować jej 9 tygodni.',
    },
  ],
  konsekwencje: [
    {
      kod: 'WNIOSEK_RODZICIELSKI_21_DNI',
      poziom: 'konsekwencja',
      tresc: 'Wniosek o urlop rodzicielski trzeba złożyć u pracodawcy najpóźniej 30 marca 2027.',
      przepis: 'KP art. 182¹d § 1',
      osobaId: 'mama',
      odcinekId: 'r1',
    },
  ],
  wykorzystanie: [
    { pula: 'macierzynski', wykorzystaneDni: 140, dostepneDni: 140 },
    { pula: 'rodzicielski', wykorzystaneDni: 224, dostepneDni: 287, przepadnieDni: 63 },
    { pula: 'rodzicielski_nieprzenoszalne', osobaId: 'mama', wykorzystaneDni: 63, dostepneDni: 63 },
  ],
};

export const PRZYKLAD_KWOTY: WynikKwot = {
  podstawy: [
    {
      osobaId: 'mama',
      tytulId: 'etat-1',
      kwota: 6903.2,
      metoda: 'srednia_12_miesiecy',
      ograniczenia: [],
      sciezka: [
        { opis: 'Średnie wynagrodzenie z 12 miesięcy przed porodem', wartosc: 8000, przepis: 'UZ art. 36 ust. 1' },
        { opis: 'Odliczenie składek pracownika (13,71%)', wzor: '8000,00 zł × (100% − 13,71%)', wartosc: 6903.2, przepis: 'UZ art. 3 pkt 3' },
      ],
    },
  ],
  odcinki: [
    {
      odcinekId: 'm1',
      osobaId: 'mama',
      podstawa: 6903.2,
      stawkaProc: 100,
      dziennie: 230.11,
      dni: 140,
      razem: 32215.4,
      miesiecznie: 6903.3,
      rozbicieMiesieczne: [
        { miesiac: '2026-12', dni: 31, kwota: 7133.41 },
        { miesiac: '2027-01', dni: 31, kwota: 7133.41 },
        { miesiac: '2027-02', dni: 28, kwota: 6443.08 },
        { miesiac: '2027-03', dni: 31, kwota: 7133.41 },
        { miesiac: '2027-04', dni: 19, kwota: 4372.09 },
      ],
      sciezka: [
        { opis: 'Podstawa wymiaru', wartosc: 6903.2 },
        { opis: 'Stawka za urlop macierzyński', wzor: '100%', przepis: 'UZ art. 31 ust. 1' },
        { opis: 'Stawka dzienna', wzor: '6903,20 zł ÷ 30 × 100%', wartosc: 230.11 },
        { opis: 'Za 140 dni', wzor: '140 × 230,11 zł', wartosc: 32215.4 },
      ],
    },
    {
      odcinekId: 'r1',
      osobaId: 'mama',
      podstawa: 6903.2,
      stawkaProc: 70,
      dziennie: 161.07,
      dni: 224,
      razem: 36079.68,
      miesiecznie: 4832.1,
      rozbicieMiesieczne: [
        { miesiac: '2027-04', dni: 11, kwota: 1771.77 },
        { miesiac: '2027-05', dni: 31, kwota: 4993.17 },
        { miesiac: '2027-06', dni: 30, kwota: 4832.1 },
        { miesiac: '2027-07', dni: 31, kwota: 4993.17 },
        { miesiac: '2027-08', dni: 31, kwota: 4993.17 },
        { miesiac: '2027-09', dni: 30, kwota: 4832.1 },
        { miesiac: '2027-10', dni: 31, kwota: 4993.17 },
        { miesiac: '2027-11', dni: 29, kwota: 4671.03 },
      ],
      sciezka: [
        { opis: 'Podstawa wymiaru', wartosc: 6903.2 },
        { opis: 'Stawka za urlop rodzicielski', wzor: '70%', przepis: 'UZ art. 31 ust. 2' },
        { opis: 'Stawka dzienna', wzor: '6903,20 zł ÷ 30 × 70%', wartosc: 161.07 },
        { opis: 'Za 224 dni', wzor: '224 × 161,07 zł', wartosc: 36079.68 },
      ],
    },
  ],
  sumaOsoby: { mama: 68295.08 },
  sumaRazem: 68295.08,
  uwagi: [],
};

export const PRZYKLAD_DOKUMENTY: WynikDokumentow = {
  ktoWyplaca: [
    {
      osobaId: 'mama',
      tytulId: 'etat-1',
      kto: 'platnik',
      powod: 'Pracodawca zgłasza do ubezpieczenia chorobowego ponad 20 osób, więc sam wypłaca zasiłki.',
      przepis: 'UZ art. 61 ust. 1 pkt 1',
    },
  ],
  dokumenty: [
    {
      kod: 'wniosek_rodzicielski',
      nazwa: 'Wniosek o urlop rodzicielski',
      ktoSklada: 'mama',
      gdzie: 'pracodawca',
      termin: '2027-03-30',
      status: 'pozniej',
      odKiedy: '2026-12-01',
      zalaczniki: ['Skrócony odpis aktu urodzenia dziecka albo jego kopia'],
      moznaWygenerowac: true,
      odcinekId: 'r1',
      przepis: 'KP art. 182¹d § 1',
    },
  ],
  terminy: [
    { data: '2026-12-01', tytul: 'Przewidywany poród', opis: 'Początek urlopu macierzyńskiego.', rodzaj: 'poczatek', osobaId: 'mama', odcinekId: 'm1' },
    { data: '2026-12-22', tytul: 'Ostatni dzień na wniosek o 81,5%', opis: 'Po tym dniu zostaje wariant 100% i 70%.', rodzaj: 'graniczny', osobaId: 'mama', przepis: 'UZ art. 30a' },
    { data: '2027-03-30', tytul: 'Wniosek o urlop rodzicielski', opis: 'Wniosek trzeba złożyć u pracodawcy najpóźniej 21 dni przed początkiem urlopu. Najlepiej zrobić to kilka dni wcześniej.', rodzaj: 'wniosek', osobaId: 'mama', odcinekId: 'r1', przepis: 'KP art. 182¹d § 1' },
    { data: '2027-11-29', tytul: 'Koniec urlopu rodzicielskiego', opis: 'Następnego dnia przypada powrót do pracy.', rodzaj: 'koniec', osobaId: 'mama', odcinekId: 'r1' },
  ],
};
