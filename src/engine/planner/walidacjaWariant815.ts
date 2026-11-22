/**
 * Walidacja wariantu 81,5% – TOR A, zadanie A5. Przepisy: UZ art. 30a, art. 31 ust. 3, 3f, 3g, 4. Decyzja D18.
 */
import { dodajDni, dodajLata } from '../daty';
import { tygodni } from '../eligibility/uprawnieniaTeksty';
import type { DataISO, Komunikat } from '../types';
import { dataSlownie, DO_POTWIERDZENIA, komunikat, type Kontekst, nazwaOsoby, stawka, TYPY_MACIERZYNSKIE, zWielkiej } from './walidacjaWspolne';

export function walidujWariant815(ctx: Kontekst): Komunikat[] {
  const { rodzina, plan, pule, p } = ctx;
  if (!plan.wariant815) return [];
  const wynik: Komunikat[] = [];
  const s815 = stawka(p.stawkiProc.wariant815);
  const sMac = stawka(p.stawkiProc.macierzynski);
  const sRodz = stawka(p.stawkiProc.rodzicielski);

  // UZ art. 30a ust. 1: wniosek najpóźniej 21 dni po porodzie (ostatni dzień w pule, D18; pytanie 23).
  // Bez daty wniosku przyjmujemy, że rodzic złoży go dziś (`dataAnalizy`).
  const dataWniosku = plan.wniosek815Data ?? rodzina.dataAnalizy;
  if (pule.wniosek815DoKiedy && dataWniosku > pule.wniosek815DoKiedy) {
    wynik.push(
      komunikat(
        'WARIANT_815_PO_TERMINIE',
        'blad',
        `Wniosek o zasiłek ${s815} za cały okres trzeba złożyć najpóźniej ${dataSlownie(pule.wniosek815DoKiedy)}. Po tym dniu zostaje wariant ${sMac} za urlop macierzyński i ${sRodz} za okres urlopu rodzicielskiego.`,
        'UZ art. 30a ust. 1',
        { coZrobic: `Proszę wyłączyć wariant ${s815} w planie.` },
      ),
    );
  }

  // Wniosek składa matka (UZ art. 30a ust. 1), a przy przyjęciu dziecka osoba z urlopem na warunkach macierzyńskiego (ust. 2).
  const matka = rodzina.osoby.find((o) => o.rola === 'matka');
  const pierwszyMac = [...plan.odcinki].filter((o) => TYPY_MACIERZYNSKIE.includes(o.typ)).sort((a, b) => a.od.localeCompare(b.od))[0];
  const wnioskujacy = matka?.id ?? pierwszyMac?.osobaId;

  // UZ art. 30a ust. 1; NIEJASNE (odpowiedź ZUS na stoisku 21.11, pytanie nr 23 – niepewna, „chyba”): wniosek złożony
  // przed porodem jest ważny tylko, gdy mama zaczyna macierzyński przed porodem i składa go nie wcześniej niż w jego
  // pierwszym dniu. Inaczej wniosek składa się po porodzie. Sprawdzamy tylko datę wpisaną w planie.
  const z = rodzina.zdarzenie.data;
  if (rodzina.zdarzenie.typ === 'porod' && plan.wniosek815Data && plan.wniosek815Data < z) {
    const wniosek = plan.wniosek815Data;
    const startPrzedPorodem = plan.odcinki
      .filter((o) => o.osobaId === wnioskujacy && o.typ === 'macierzynski' && o.od < z)
      .reduce<DataISO | undefined>((m, o) => (m === undefined || o.od < m ? o.od : m), undefined);
    if (!startPrzedPorodem || wniosek < startPrzedPorodem) {
      const termin = pule.wniosek815DoKiedy ? `, najpóźniej ${dataSlownie(pule.wniosek815DoKiedy)}` : '';
      wynik.push(
        komunikat(
          'WARIANT_815_WNIOSEK_PRZED_PORODEM',
          'ostrzezenie',
          `Wniosek o zasiłek ${s815} złożony przed porodem jest ważny prawdopodobnie tylko wtedy, gdy urlop macierzyński zaczyna się przed porodem, a wniosek jest złożony najwcześniej w pierwszym dniu tego urlopu. ${DO_POTWIERDZENIA}`,
          'UZ art. 30a ust. 1',
          { osobaId: wnioskujacy, coZrobic: `Najbezpieczniej złożyć wniosek po porodzie${termin}.` },
        ),
      );
    }
  }

  // UZ art. 31 ust. 3f: 9 tygodni drugiego rodzica zawsze 70%.
  const rodz = plan.odcinki.filter((o) => o.typ === 'rodzicielski');
  for (const osobaId of [...new Set(rodz.filter((o) => o.osobaId !== wnioskujacy).map((o) => o.osobaId))]) {
    wynik.push(
      komunikat(
        'STAWKA_70_DLA_9_TYG',
        'konsekwencja',
        `${zWielkiej(nazwaOsoby(rodzina, osobaId))} dostanie za swoje ${tygodni(pule.rodzicielskiNieprzenoszalneTyg)} urlopu rodzicielskiego ${sRodz} podstawy, nie ${s815}.`,
        'UZ art. 31 ust. 3f',
        { osobaId, odcinekId: rodz.find((o) => o.osobaId === osobaId)?.id },
      ),
    );
  }

  // UZ art. 31 ust. 3g, ust. 4: ani dnia rodzicielskiego w 1. roku życia → rodzicielski 70% i wyrównanie
  // macierzyńskiego do 100% na wniosek.
  const urodzenie: DataISO =
    rodzina.zdarzenie.typ === 'porod' ? rodzina.zdarzenie.data : (rodzina.zdarzenie.dzieci[0]?.dataUrodzenia ?? rodzina.zdarzenie.data);
  const koniecPierwszegoRoku = dodajDni(dodajLata(urodzenie, 1), -1);
  if (!rodz.some((o) => o.od <= koniecPierwszegoRoku && o.do >= urodzenie)) {
    wynik.push(
      komunikat(
        'WYROWNANIE_DO_100',
        'konsekwencja',
        `W pierwszym roku życia dziecka (do ${dataSlownie(koniecPierwszegoRoku)}) nie ma w planie ani dnia urlopu rodzicielskiego. Wtedy zasiłek za okres urlopu rodzicielskiego wyniesie ${sRodz}, a za urlop macierzyński można otrzymać wyrównanie do ${sMac}.`,
        'UZ art. 31 ust. 3g, ust. 4',
        { osobaId: wnioskujacy, coZrobic: `O wyrównanie do ${sMac} trzeba złożyć osobny wniosek.` },
      ),
    );
  }
  return wynik;
}
