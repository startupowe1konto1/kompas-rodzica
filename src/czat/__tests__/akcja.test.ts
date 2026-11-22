import { describe, expect, it } from 'vitest';
import type { AkcjaPlanu } from '../../engine/types';
import { czyAkcjaPlanu } from '../akcja';

const POPRAWNE: AkcjaPlanu[] = [
  { typ: 'przesun', odcinekId: 'r1', nowyOd: '2027-05-01' },
  { typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-10-01' },
  { typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-06-01' },
  { typ: 'usun', odcinekId: 'r1' },
  { typ: 'dodaj', odcinek: { osobaId: 'osoba-2', typ: 'rodzicielski', od: '2027-06-01', do: '2027-08-02' } },
  { typ: 'przenies_na_osobe', odcinekId: 'r1', osobaId: 'osoba-2' },
  { typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'osoba-2' },
  { typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.5 },
  { typ: 'ustaw_wariant_815', wartosc: true },
];

describe('czyAkcjaPlanu – akcja od modelu, zanim trafi do silnika', () => {
  it.each(POPRAWNE)('przyjmuje $typ', (a) => expect(czyAkcjaPlanu(a)).toBe(true));

  it.each([
    ['nie obiekt', 'przesun'],
    ['null', null],
    ['nieznany typ', { typ: 'teleportuj', odcinekId: 'r1' }],
    ['brak pola', { typ: 'przesun', odcinekId: 'r1' }],
    ['zła data', { typ: 'przesun', odcinekId: 'r1', nowyOd: '1 maja' }],
    ['nieistniejąca data', { typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-02-30' }],
    ['tygodnie jako tekst', { typ: 'rezygnacja_matki', poTygodniach: '14', przejmujeOsobaId: 'osoba-2' }],
    ['wariant jako tekst', { typ: 'ustaw_wariant_815', wartosc: 'tak' }],
    ['zły typ odcinka', { typ: 'dodaj', odcinek: { osobaId: 'osoba-2', typ: 'wakacje', od: '2027-06-01', do: '2027-06-02' } }],
    ['odcinek bez dat', { typ: 'dodaj', odcinek: { osobaId: 'osoba-2', typ: 'rodzicielski' } }],
  ])('odrzuca: %s', (_opis, a) => expect(czyAkcjaPlanu(a)).toBe(false));
});
