/**
 * DOKUMENTY I TERMINY – TOR D (Mikołaj). ZADANIA.md, zadanie D2.
 *
 *  - `ktoWyplaca.ts` – kto wypłaca zasiłek (UZ art. 61);
 *  - `terminy.ts` – jakie wnioski wynikają z planu i do kiedy je złożyć, terminy do kalendarza;
 *  - `dokumenty.ts` – lista dokumentów z załącznikami i statusem;
 *  - `ics.ts` – plik kalendarza (.ics).
 */
import { czyPoprawna } from '../daty';
import { parametryNaDzien } from '../params';
import type { Parametry, Plan, Rodzina, WynikDokumentow } from '../types';
import { dokumentyDlaPlanu, uwagiDoListy } from './dokumenty';
import { ustalKtoWyplaca, uwzglednijPrzedluzenie } from './ktoWyplaca';
import { terminyDlaPlanu } from './terminy';

export { dokumentyDlaPlanu, statusDokumentu, uwagiDoListy, ZALACZNIKI } from './dokumenty';
export { naICS, type OpcjeICS } from './ics';
export { ustalKtoWyplaca } from './ktoWyplaca';
export { KODY_TERMINOW_WNIOSKOW, terminyDlaPlanu } from './terminy';

/**
 * Kto wypłaca zasiłek, jakie dokumenty i do kiedy trzeba złożyć – dla konkretnego planu.
 * Parametry (liczby dni) z wersji obowiązującej w dniu porodu albo przyjęcia dziecka.
 * `uwagi` (np. ZAPYTAJ_W_KADRACH) pojawiają się tylko wtedy, gdy jakaś jest.
 */
export function dokumentyITerminy(rodzinaWejscie: Rodzina, plan: Plan, wersje: Parametry[]): WynikDokumentow {
  const p = parametryNaDzien(rodzinaWejscie.zdarzenie.data, wersje);
  // KP art. 177 § 3: umowy przedłużone do porodu – raz dla wszystkich funkcji (każda i tak robi to sama, idempotentnie).
  const rodzina = uwzglednijPrzedluzenie(rodzinaWejscie, p);
  const uwagi = uwagiDoListy(rodzina, plan, p);
  return {
    ktoWyplaca: ustalKtoWyplaca(rodzina, plan, p),
    dokumenty: dokumentyDlaPlanu(rodzina, plan, p),
    terminy: terminyDlaPlanu(rodzina, plan, p),
    ...(uwagi.length > 0 ? { uwagi } : {}),
  };
}

/**
 * Sprawdza, czy dane wystarczą do policzenia dokumentów i terminów. Zwraca opis pierwszego problemu
 * (warstwa REST odpowiada wtedy 400) albo `undefined`, gdy wszystko jest w porządku.
 */
export function bladDanychDokumentow(rodzina: unknown, plan: unknown): string | undefined {
  const r = rodzina as Partial<Rodzina> | null;
  const pl = plan as Partial<Plan> | null;
  if (typeof r !== 'object' || r === null) return 'Pole "rodzina" musi być obiektem.';
  if (typeof pl !== 'object' || pl === null) return 'Pole "plan" musi być obiektem.';
  if (!Array.isArray(r.osoby)) return 'Brakuje listy osób w rodzinie.';
  if (r.osoby.some((o) => typeof o !== 'object' || o === null || !Array.isArray(o.tytuly))) return 'Każda osoba musi mieć listę tytułów ubezpieczenia.';
  if (typeof r.dataAnalizy !== 'string' || !czyPoprawna(r.dataAnalizy)) return 'Niepoprawna data analizy (oczekiwano RRRR-MM-DD).';
  const z = r.zdarzenie;
  if (typeof z !== 'object' || z === null || typeof z.data !== 'string' || !czyPoprawna(z.data)) return 'Niepoprawna data porodu albo przyjęcia dziecka.';
  if (!Array.isArray(z.dzieci)) return 'Brakuje listy dzieci.';
  if (!Array.isArray(pl.odcinki)) return 'Brakuje listy odcinków planu.';
  for (const o of pl.odcinki) {
    if (typeof o !== 'object' || o === null || typeof o.od !== 'string' || typeof o.do !== 'string' || !czyPoprawna(o.od) || !czyPoprawna(o.do)) {
      return 'Odcinek planu ma niepoprawną datę (oczekiwano RRRR-MM-DD).';
    }
  }
  for (const o of r.osoby) {
    for (const t of o.tytuly) {
      for (const d of [t.od, t.do, t.chorobowoOd, t.ustanie?.data]) {
        if (d !== undefined && (typeof d !== 'string' || !czyPoprawna(d))) return 'Tytuł ubezpieczenia ma niepoprawną datę (oczekiwano RRRR-MM-DD).';
      }
    }
  }
  return undefined;
}
