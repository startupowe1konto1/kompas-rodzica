/**
 * Odpowiedzi do poprawy: lista pytań, przez które nie możemy policzyć wyniku albo wynik byłby bez sensu
 * (uwaga z testów z użytkownikiem 22.11: przy sprzecznych danych wynik się „sypał”, a rodzic nie wiedział, co poprawić).
 *
 * Dwa źródła:
 *  1. błędy pojedynczych odpowiedzi – ta sama walidacja co w ankiecie (`walidujAnkiete`);
 *  2. sprzeczności między odpowiedziami – tylko łapanie pomyłek w datach i brakujących danych, bez reguł prawnych
 *     (o prawie do zasiłku decyduje silnik).
 *
 * Czysta funkcja: każda pozycja ma `klucz` pytania, więc ekran może zrobić z niej link do ankiety (`/sytuacja?pytanie=…`).
 */
import { roznicaDni } from '../../engine/daty';
import type { Rodzina } from '../../engine/types';
import { PYTANIA } from './definicje';
import { nazwaTytulu } from './listy';
import { walidujAnkiete, widocznePytania, type OpcjeWidocznosci } from './silnik-ankiety';
import type { PytanieWidoczne } from './typy';

export type KodDoPoprawy = string;

export interface OdpowiedzDoPoprawy {
  /** Kod błędu pola (np. 'DATA_ZA_WCZESNA') albo sprzeczności ('UMOWA_PO_ZDARZENIU', 'BRAK_TYTULOW', 'KONIEC_PRZED_POCZATKIEM'). */
  kod: KodDoPoprawy;
  pytanieId: string;
  /** Klucz pytania w ankiecie, np. 'tytul_od@o0.t0'. */
  klucz: string;
  /** Treść pytania, tak jak w ankiecie. */
  pytanie: string;
  /** Czego dotyczy, gdy to nie jest oczywiste, np. „Umowa o pracę” albo „Anna: Umowa zlecenia”. */
  kontekst: string | null;
  /** Co jest nie tak, prostym językiem. */
  powod: string;
}

function etykieta(p: PytanieWidoczne, rodzina: Rodzina): string {
  const { osoba, tytul } = p.zakres;
  const rodzaj = osoba !== undefined && tytul !== undefined ? rodzina.osoby[osoba]?.tytuly?.[tytul]?.rodzaj : undefined;
  return (rodzaj && p.def.wgRodzaju?.[rodzaj]?.etykieta) || p.def.etykieta;
}

function kontekst(p: PytanieWidoczne, rodzina: Rodzina): string | null {
  const { osoba, tytul } = p.zakres;
  const osoby = rodzina.osoby;
  const kto = osoba !== undefined && osoby.length > 1 ? (osoby[osoba]?.dane?.imie ?? `Osoba ${osoba + 1}`) : null;
  const co = osoba !== undefined && tytul !== undefined ? nazwaTytulu(osoby[osoba]?.tytuly ?? [], tytul, false) || null : null;
  if (kto && co) return `${kto}: ${co}`;
  return kto ?? co;
}

export function odpowiedziDoPoprawy(rodzina: Rodzina, opcje: OpcjeWidocznosci = {}): OdpowiedzDoPoprawy[] {
  const widoczne = widocznePytania(PYTANIA, rodzina, opcje);
  const wynik: OdpowiedzDoPoprawy[] = [];
  const dodaj = (p: PytanieWidoczne | undefined, kod: string, powod: string) => {
    if (!p || wynik.some((x) => x.klucz === p.klucz)) return;
    wynik.push({ kod, pytanieId: p.def.id, klucz: p.klucz, pytanie: etykieta(p, rodzina), kontekst: kontekst(p, rodzina), powod });
  };
  const pytanie = (sciezka: string) => widoczne.find((p) => p.sciezka === sciezka);

  // 1. Błędy pojedynczych odpowiedzi (puste wymagane pola, daty poza zakresem, nierealne kwoty).
  for (const b of walidujAnkiete(PYTANIA, rodzina, opcje).bledy) {
    dodaj(
      widoczne.find((p) => p.klucz === b.klucz),
      b.kod,
      b.komunikat,
    );
  }

  // 2. Sprzeczności między odpowiedziami.
  const zdarzenie = rodzina.zdarzenie;
  const przyjecie = zdarzenie !== undefined && zdarzenie.typ !== 'porod';
  rodzina.osoby.forEach((osoba, o) => {
    if (osoba.tytuly.length === 0) {
      dodaj(
        pytanie(`osoby[${o}].tytuly`),
        'BRAK_TYTULOW',
        'Nie zaznaczono żadnej umowy ani działalności. Bez nich nie policzymy zasiłku. Jeśli Pani/Pan pracuje albo prowadzi działalność, proszę to zaznaczyć.',
      );
    }
    osoba.tytuly.forEach((t, i) => {
      const baza = `osoby[${o}].tytuly[${i}]`;
      if (t.do && roznicaDni(t.od, t.do) < 0) {
        dodaj(
          pytanie(`${baza}.do`) ?? pytanie(`${baza}.od`),
          'KONIEC_PRZED_POCZATKIEM',
          'Data zakończenia umowy jest wcześniejsza niż data jej początku. Proszę sprawdzić obie daty.',
        );
      }
      if (zdarzenie?.data && roznicaDni(zdarzenie.data, t.od) > 0) {
        dodaj(
          pytanie(`${baza}.od`),
          'UMOWA_PO_ZDARZENIU',
          przyjecie
            ? 'Ta umowa zaczyna się później niż dzień, w którym dziecko trafia do Pani/Pana. Proszę sprawdzić datę początku umowy.'
            : 'Ta umowa zaczyna się później niż data porodu. Proszę sprawdzić datę początku umowy.',
        );
      }
    });
  });

  return wynik;
}
