/**
 * Walidacja urlopu ojcowskiego – TOR A, zadanie A5. Przepis: KP art. 182³.
 */
import type { Komunikat } from '../types';
import { dni as dniSlownie, tygodni } from '../eligibility/uprawnieniaTeksty';
import { czesciOsoby } from './odcinki';
import { dataSlownie, dniOdcinka, komunikat, type Kontekst, nazwaOsoby, suma, zWielkiej } from './walidacjaWspolne';

export function walidujOjcowski(ctx: Kontekst): Komunikat[] {
  const { rodzina, plan, pule, p } = ctx;
  const wynik: Komunikat[] = [];
  const ojc = plan.odcinki.filter((o) => o.typ === 'ojcowski');
  const pula = pule.ojcowskiTyg * 7;

  for (const osobaId of [...new Set(ojc.map((o) => o.osobaId))]) {
    const odcinki = ojc.filter((o) => o.osobaId === osobaId);
    const ostatni = odcinki[odcinki.length - 1];
    const kto = zWielkiej(nazwaOsoby(rodzina, osobaId));

    // KP art. 182³ § 1: urlop ojcowski do 2 tygodni.
    const dni = suma(odcinki.map(dniOdcinka));
    if (dni > pula) {
      wynik.push(
        komunikat(
          'OJC_ZA_DUZO',
          'blad',
          `Urlop ojcowski trwa najwyżej ${tygodni(pule.ojcowskiTyg)} (${dniSlownie(pula)}). ${kto} ma w planie ${dniSlownie(dni)}.`,
          'KP art. 182³ § 1',
          { osobaId, odcinekId: ostatni.id, coZrobic: `Proszę skrócić urlop ojcowski do ${dniSlownie(pula)}.` },
        ),
      );
    }

    // KP art. 182³ § 1¹: jednorazowo albo najwyżej w 2 częściach, żadna krótsza niż tydzień.
    const czesci = czesciOsoby(plan, osobaId, 'ojcowski');
    const zaKrotka = czesci.find((c) => dniOdcinka(c) < p.limity.ojcowskiMinDniCzesci);
    if (czesci.length > p.limity.ojcowskiMaxCzesci || zaKrotka) {
      const odcinek = zaKrotka ? odcinki.find((o) => o.od === zaKrotka.od) : ostatni;
      wynik.push(
        komunikat(
          'OJC_ZLE_CZESCI',
          'blad',
          `Urlop ojcowski można wziąć w całości albo najwyżej w ${p.limity.ojcowskiMaxCzesci} częściach, a każda część trwa co najmniej ${dniSlownie(p.limity.ojcowskiMinDniCzesci)}.`,
          'KP art. 182³ § 1¹',
          { osobaId, odcinekId: odcinek?.id, coZrobic: `Warto połączyć krótkie części albo wydłużyć każdą do co najmniej ${dniSlownie(p.limity.ojcowskiMinDniCzesci)}.` },
        ),
      );
    }

    // KP art. 182³ § 1 pkt 1–2: do ukończenia przez dziecko 12 miesięcy (przy przysposobieniu – 12 miesięcy od
    // uprawomocnienia, nie dłużej niż do 14 lat dziecka). Ostatni dzień liczy A1 (pytanie 12).
    if (pule.ojcowskiDoKiedy) {
      for (const o of odcinki.filter((x) => x.do > pule.ojcowskiDoKiedy!)) {
        wynik.push(
          komunikat(
            'OJC_PO_TERMINIE',
            'blad',
            `Z urlopu ojcowskiego można korzystać najpóźniej do ${dataSlownie(pule.ojcowskiDoKiedy)}. Potem prawo do niego wygasa.`,
            'KP art. 182³ § 1',
            { osobaId, odcinekId: o.id, coZrobic: `Urlop ojcowski trzeba zaplanować tak, żeby skończył się najpóźniej ${dataSlownie(pule.ojcowskiDoKiedy)}.` },
          ),
        );
      }
    }
  }
  return wynik;
}
