/**
 * Akcje planera budowane z przycisków na odcinku. UI tylko składa obiekty `AkcjaPlanu`;
 * czy akcja jest dozwolona, rozstrzyga silnik przez REST (`api.akcja`).
 */
import type { AkcjaPlanu, DataISO, Odcinek, Osoba, Parametry, Pule, Rodzina } from '../../engine/types';
import { dniMiedzy, dodajDni } from '../os-czasu/daty';

const DNI_W_TYGODNIU = 7;

/** Skraca koniec o tydzień; null, gdy nowy koniec wypadłby przed początkiem. */
export function skrocOTydzien(o: Odcinek): AkcjaPlanu | null {
  const nowyDo = dodajDni(o.do, -DNI_W_TYGODNIU);
  if (nowyDo < o.od) return null;
  return { typ: 'zmien_koniec', odcinekId: o.id, nowyDo };
}

export function wydluzOTydzien(o: Odcinek): AkcjaPlanu {
  return { typ: 'zmien_koniec', odcinekId: o.id, nowyDo: dodajDni(o.do, DNI_W_TYGODNIU) };
}

export function przesunOTydzien(o: Odcinek, kierunek: 1 | -1): AkcjaPlanu {
  return { typ: 'przesun', odcinekId: o.id, nowyOd: dodajDni(o.od, kierunek * DNI_W_TYGODNIU) };
}

/** Dzieli odcinek w połowie; druga część zaczyna się w dniu `od + ceil(dni / 2)`. Null dla 1 dnia. */
export function podzielWPolowie(o: Odcinek): AkcjaPlanu | null {
  const dni = dniMiedzy(o.od, o.do) + 1;
  if (dni < 2) return null;
  return { typ: 'podziel', odcinekId: o.id, pierwszyDzienDrugiejCzesci: dodajDni(o.od, Math.ceil(dni / 2)) };
}

/** Druga osoba w rodzinie (ta, która nie jest `osobaId`). */
export function drugaOsoba(rodzina: Rodzina, osobaId: string): Osoba | undefined {
  return rodzina.osoby.find((o) => o.id !== osobaId);
}

/** „Mama wraca po obowiązkowych tygodniach”: resztę macierzyńskiego przejmuje druga osoba. */
export function mamaWracaPoObowiazkowych(rodzina: Rodzina, pule: Pule): AkcjaPlanu | null {
  const matka = rodzina.osoby.find((o) => o.rola === 'matka');
  if (!matka) return null;
  const przejmuje = drugaOsoba(rodzina, matka.id);
  if (!przejmuje) return null;
  return { typ: 'rezygnacja_matki', poTygodniach: pule.obowiazkoweMatkiTyg, przejmujeOsobaId: przejmuje.id };
}

/** Limit wymiaru pracy przy łączeniu z wersji parametrów obowiązującej w danym dniu. */
export function maksWymiarPracy(wersje: Parametry[], dzien: DataISO): number | null {
  let wybrana: Parametry | null = null;
  for (const w of wersje) {
    if (w.obowiazujeOd <= dzien && (!wybrana || w.obowiazujeOd > wybrana.obowiazujeOd)) wybrana = w;
  }
  return wybrana ? wybrana.limity.maxWymiarPracyPrzyLaczeniu : null;
}

/** Wymiary pracy do wyboru: ósme części etatu (k/8) nie większe niż limit. */
export function opcjeWymiaruPracy(max: number): number[] {
  const wynik: number[] = [];
  for (let k = 1; k <= 8; k += 1) {
    if (k / 8 <= max + 1e-9) wynik.push(k / 8);
  }
  return wynik;
}
