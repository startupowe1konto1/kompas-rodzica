import type { Swiadczenie } from '../../engine/types';

export const NAZWY_SWIADCZEN: Record<Swiadczenie, string> = {
  zasilek_chorobowy_ciaza: 'Zasiłek chorobowy w ciąży',
  swiadczenie_rehabilitacyjne: 'Świadczenie rehabilitacyjne',
  zasilek_w_wys_macierzynskiego: 'Zasiłek w wysokości macierzyńskiego',
  macierzynski: 'Zasiłek macierzyński',
  na_warunkach_macierzynskiego: 'Zasiłek na warunkach macierzyńskiego',
  uzupelniajacy: 'Zasiłek za okres urlopu uzupełniającego',
  rodzicielski: 'Zasiłek za okres urlopu rodzicielskiego',
  ojcowski: 'Zasiłek za okres urlopu ojcowskiego',
};

// Nazwy wyborów (Mozliwosc) są w etykiety.ts (NAZWY_MOZLIWOSCI, nazwaMozliwosci).
