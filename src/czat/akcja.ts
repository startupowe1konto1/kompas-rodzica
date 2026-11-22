/**
 * Sprawdza akcję planu, którą zaproponował model AI, zanim trafi do silnika.
 * Kształt zgodny z `AkcjaPlanu` w src/engine/types.ts.
 */
import { czyPoprawna } from '../engine/daty';
import type { AkcjaPlanu, TypOdcinka } from '../engine/types';

const TYPY_ODCINKOW: readonly TypOdcinka[] = [
  'chorobowy_ciaza',
  'w_wys_macierzynskiego',
  'macierzynski',
  'na_warunkach_macierzynskiego',
  'uzupelniajacy',
  'rodzicielski',
  'ojcowski',
  'praca',
  'przerwa',
  'wychowawczy',
];

type Obiekt = Record<string, unknown>;
const obiekt = (x: unknown): x is Obiekt => typeof x === 'object' && x !== null && !Array.isArray(x);
const napis = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';
const data = (x: unknown): boolean => typeof x === 'string' && czyPoprawna(x);
const liczba = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x);
const liczbaLubBrak = (x: unknown): boolean => x === undefined || liczba(x);
const napisLubBrak = (x: unknown): boolean => x === undefined || napis(x);

function czyNowyOdcinek(o: unknown): boolean {
  return (
    obiekt(o) &&
    napis(o.osobaId) &&
    TYPY_ODCINKOW.includes(o.typ as TypOdcinka) &&
    data(o.od) &&
    data(o.do) &&
    liczbaLubBrak(o.wymiarPracy) &&
    napisLubBrak(o.tytulId)
  );
}

export function czyAkcjaPlanu(x: unknown): x is AkcjaPlanu {
  if (!obiekt(x)) return false;
  switch (x.typ) {
    case 'przesun':
      return napis(x.odcinekId) && data(x.nowyOd);
    case 'zmien_koniec':
      return napis(x.odcinekId) && data(x.nowyDo);
    case 'podziel':
      return napis(x.odcinekId) && data(x.pierwszyDzienDrugiejCzesci);
    case 'usun':
      return napis(x.odcinekId);
    case 'dodaj':
      return czyNowyOdcinek(x.odcinek);
    case 'przenies_na_osobe':
      return napis(x.odcinekId) && napis(x.osobaId);
    case 'rezygnacja_matki':
      return liczba(x.poTygodniach) && napis(x.przejmujeOsobaId);
    case 'polacz_z_praca':
      return napis(x.odcinekId) && liczba(x.wymiarPracy);
    case 'ustaw_wariant_815':
      return typeof x.wartosc === 'boolean';
    default:
      return false;
  }
}
