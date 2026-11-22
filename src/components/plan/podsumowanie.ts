/**
 * Jedno zdanie nad osią: kto, ile tygodni urlopu i od kiedy. Czyste dane z planu (bez Reacta, bez zegara).
 * Liczą się tylko odcinki urlopowe i zasiłkowe: bez pracy, przerw, zwolnienia w ciąży i urlopu wychowawczego.
 */
import type { Plan, Rodzina, TypOdcinka } from '../../engine/types';
import { dniMiedzy } from '../os-czasu/daty';
import { formatujDate } from '../format';
import { etykietaOsoby } from '../wynik/etykiety';

const LICZONE: ReadonlySet<TypOdcinka> = new Set<TypOdcinka>([
  'w_wys_macierzynskiego',
  'macierzynski',
  'na_warunkach_macierzynskiego',
  'uzupelniajacy',
  'rodzicielski',
  'ojcowski',
]);

export interface PodsumowanieOsoby {
  osobaId: string;
  tygodnie: number;
  od: string;
  do: string;
}

/** „1 tydzień”, „2 tygodnie”, „5 tygodni”, „22 tygodnie”. */
export function tygodnieSlownie(n: number): string {
  if (n === 1) return '1 tydzień';
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? `${n} tygodnie` : `${n} tygodni`;
}

export function podsumowanieOsob(rodzina: Rodzina, plan: Plan): PodsumowanieOsoby[] {
  const wynik: PodsumowanieOsoby[] = [];
  for (const osoba of rodzina.osoby) {
    const odcinki = plan.odcinki.filter((o) => o.osobaId === osoba.id && LICZONE.has(o.typ));
    if (odcinki.length === 0) continue;
    const dni = odcinki.reduce((s, o) => s + dniMiedzy(o.od, o.do) + 1, 0);
    const od = odcinki.reduce((min, o) => (o.od < min ? o.od : min), odcinki[0].od);
    const doDnia = odcinki.reduce((max, o) => (o.do > max ? o.do : max), odcinki[0].do);
    wynik.push({ osobaId: osoba.id, tygodnie: Math.round(dni / 7), od, do: doDnia });
  }
  return wynik;
}

/** „Mama: urlop od 1 grudnia 2026 do 29 listopada 2027, razem 52 tygodnie.”; null, gdy w planie nie ma urlopu. */
export function zdaniePodsumowania(rodzina: Rodzina, plan: Plan): string | null {
  const osoby = podsumowanieOsob(rodzina, plan);
  if (osoby.length === 0) return null;
  return osoby.map((o) => `${etykietaOsoby(rodzina, o.osobaId)}: urlop od ${formatujDate(o.od)} do ${formatujDate(o.do)}, razem ${tygodnieSlownie(o.tygodnie)}.`).join(' ');
}
