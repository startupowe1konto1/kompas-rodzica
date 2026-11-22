/**
 * Który odcinek zaznaczyć na osi po „Zmień na osi” przy decyzji: najbliższy pasujący odcinek osoby,
 * która decyduje. „Pasujący” = typ, którego dotyczy ta możliwość; „najbliższy” = ten, który obejmuje początek
 * okna wyboru albo leży do niego najbliżej (bez okna: najwcześniejszy). Czyste dane, bez Reacta.
 */
import type { Mozliwosc, Odcinek, Plan, TypOdcinka } from '../../engine/types';
import { dniMiedzy } from '../os-czasu/daty';

const MACIERZYNSKIE: TypOdcinka[] = ['macierzynski', 'na_warunkach_macierzynskiego'];

const TYPY: Record<Mozliwosc['kod'], TypOdcinka[]> = {
  wariant_815: [...MACIERZYNSKIE, 'rodzicielski'],
  rezygnacja_matki_i_przejecie: MACIERZYNSKIE,
  podzial_rodzicielskiego: ['rodzicielski'],
  rodzicielski_jednoczesnie: ['rodzicielski'],
  laczenie_z_praca: ['rodzicielski'],
  ojcowski_w_czesciach: ['ojcowski'],
  uzupelniajacy: ['uzupelniajacy'],
  urlop_przed_porodem: ['macierzynski', 'w_wys_macierzynskiego'],
  przejecie_sytuacja_szczegolna: [...MACIERZYNSKIE, 'rodzicielski'],
};

const NIE_URLOP: TypOdcinka[] = ['praca', 'przerwa'];

function odleglosc(o: Odcinek, wzorzec: string): number {
  if (o.od <= wzorzec && wzorzec <= o.do) return 0;
  return Math.min(Math.abs(dniMiedzy(o.od, wzorzec)), Math.abs(dniMiedzy(o.do, wzorzec)));
}

function najblizszy(odcinki: Odcinek[], wzorzec: string | undefined): Odcinek | null {
  if (odcinki.length === 0) return null;
  const posortowane = [...odcinki].sort((a, b) => (a.od < b.od ? -1 : a.od > b.od ? 1 : 0));
  if (!wzorzec) return posortowane[0];
  return posortowane.reduce((najlepszy, o) => (odleglosc(o, wzorzec) < odleglosc(najlepszy, wzorzec) ? o : najlepszy));
}

/** Id odcinka do zaznaczenia albo null, gdy plan nie ma żadnego odcinka, którego dotyczy ta decyzja. */
export function odcinekDlaDecyzji(plan: Plan, m: Pick<Mozliwosc, 'kod' | 'ktoDecyduje' | 'odKiedy' | 'doKiedy'>): string | null {
  const wzorzec = m.odKiedy ?? m.doKiedy;
  const typy = TYPY[m.kod] ?? [];
  const pasujace = plan.odcinki.filter((o) => typy.includes(o.typ));
  const swoje = pasujace.filter((o) => o.osobaId === m.ktoDecyduje);
  const urlopyOsoby = plan.odcinki.filter((o) => o.osobaId === m.ktoDecyduje && !NIE_URLOP.includes(o.typ));
  const urlopy = plan.odcinki.filter((o) => !NIE_URLOP.includes(o.typ));
  const wybrany = najblizszy(swoje, wzorzec) ?? najblizszy(pasujace, wzorzec) ?? najblizszy(urlopyOsoby, wzorzec) ?? najblizszy(urlopy, wzorzec);
  return wybrany?.id ?? null;
}
