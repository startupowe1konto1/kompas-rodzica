/**
 * Link „Zapytaj ZUS” dla wyników do potwierdzenia. Adres i opis pochodzą z `src/content/linki.ts` (tor D).
 * Link otwiera pytanie w eZUS (kanał `ezus`); pozostałe kanały są w `ZAPYTAJ_ZUS.kanaly`.
 */
import { LINKI, ZAPYTAJ_ZUS } from '../../content/linki';

const KANAL_EZUS = ZAPYTAJ_ZUS.kanaly.find((k) => k.rodzaj === 'ezus');

export const LINK_ZAPYTAJ_ZUS = {
  tekst: ZAPYTAJ_ZUS.tytul,
  adres: KANAL_EZUS?.href ?? LINKI.zus.url,
  opis: KANAL_EZUS?.opis ?? ZAPYTAJ_ZUS.opis,
} as const;

export { ZAPYTAJ_ZUS };
