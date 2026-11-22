// POST /api/calculate – kwoty dla każdego odcinka planu ze ścieżką wyliczenia. Właściciel: tor B.
// Złe kształty danych (brak list, tytuł bez daty) dają 400 z { blad }. Błędne daty odcinków nie są błędem kształtu:
// kalkulator pomija taki odcinek i zwraca uwagę ODCINEK_BLEDNA_DATA.
import { obliczKwoty } from '@/src/engine';
import { czyPoprawna } from '@/src/engine/daty';
import type { ZapytaniePlan } from '@/src/engine/types';
import { BladDanych, obsluz, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

const jestObiektem = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const listaObiektow = (x: unknown): boolean => Array.isArray(x) && x.every(jestObiektem);
const dataLubBrak = (x: unknown): boolean => x === undefined || (typeof x === 'string' && czyPoprawna(x));

/** Opis pierwszego błędu kształtu danych po polsku; undefined = kształt poprawny. */
function bladKsztaltu(rodzina: unknown, plan: unknown): string | undefined {
  if (!jestObiektem(rodzina)) return 'Pole "rodzina" musi być obiektem.';
  if (!listaObiektow(rodzina.osoby)) return 'Rodzina musi mieć listę osób.';
  for (const [i, osoba] of (rodzina.osoby as Record<string, unknown>[]).entries()) {
    const kto = `Osoba ${i + 1}`;
    if (typeof osoba.id !== 'string') return `${kto}: brakuje identyfikatora (pole "id").`;
    if (!listaObiektow(osoba.tytuly)) return `${kto}: brakuje listy tytułów ubezpieczenia (pole "tytuly", może być pusta).`;
    if (osoba.zdrowie !== undefined) {
      const eZLA = jestObiektem(osoba.zdrowie) ? osoba.zdrowie.eZLA : null;
      if (eZLA !== undefined && !listaObiektow(eZLA)) return `${kto}: zwolnienia lekarskie (pole "zdrowie.eZLA") muszą być listą.`;
    }
    for (const [j, tytul] of (osoba.tytuly as Record<string, unknown>[]).entries()) {
      const ktory = `${kto}, tytuł ${j + 1}`;
      if (typeof tytul.id !== 'string') return `${ktory}: brakuje identyfikatora (pole "id").`;
      if (typeof tytul.od !== 'string' || !czyPoprawna(tytul.od)) return `${ktory}: potrzebna data początku (pole "od", RRRR-MM-DD).`;
      const ustanie = jestObiektem(tytul.ustanie) ? tytul.ustanie.data : tytul.ustanie;
      if (![tytul.do, tytul.chorobowoOd, ustanie].every(dataLubBrak)) return `${ktory}: niepoprawna data (oczekiwano RRRR-MM-DD).`;
      for (const pole of ['podstawaSkladek', 'skladnikiKwartalne'] as const) {
        if (tytul[pole] !== undefined && !listaObiektow(tytul[pole])) return `${ktory}: pole "${pole}" musi być listą.`;
      }
    }
  }
  if (!jestObiektem(plan)) return 'Pole "plan" musi być obiektem.';
  if (!listaObiektow(plan.odcinki)) return 'Plan musi mieć listę odcinków (pole "odcinki", może być pusta).';
  return undefined;
}

export async function POST(request: Request) {
  return obsluz(request, async (cialo) => {
    const { rodzina, plan } = wymagaj<ZapytaniePlan>(cialo, ['rodzina', 'plan']);
    const blad = bladKsztaltu(rodzina, plan);
    if (blad) throw new BladDanych(blad);
    return obliczKwoty(rodzina, plan, await pobierzWersje());
  });
}
