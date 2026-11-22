/**
 * WYKORZYSTANIE PUL – TOR A, zadanie A5 (docs/superpowers/plans/2026-11-21-tor-a.md).
 * Liczniki „wykorzystaj albo stracisz”: ile dni każdej puli plan zużywa, ile jest i ile przepadnie.
 */
import type { Parametry, Plan, Pule, Rodzina, WykorzystaniePuli } from '../types';
import {
  dniOdcinka,
  przepadnieRodzicielskiego,
  pulaMacierzynskiego,
  slotyRodzicow,
  suma,
  TYPY_MACIERZYNSKIE,
  zuzycieOdcinka,
} from './walidacjaWspolne';

/**
 * Wykorzystanie pul. Każdy rodzic ma licznik swoich 9 tygodni – także rodzic bez prawa do zasiłku: jego 9 tygodni
 * nie przechodzi na drugiego rodzica, więc przepada (EC-56; odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14).
 * Woła ją też walidacja (`walidujPlanZ`).
 */
export function policzWykorzystanie(rodzina: Rodzina, plan: Plan, pule: Pule, p: Parametry): WykorzystaniePuli[] {
  const wynik: WykorzystaniePuli[] = [];
  const dniTypu = (typy: string[], osobaId?: string) =>
    suma(plan.odcinki.filter((o) => typy.includes(o.typ) && (osobaId === undefined || o.osobaId === osobaId)).map(dniOdcinka));

  // KP art. 180 § 1, § 14; art. 183 § 1: jedna pula macierzyńskiego dla matki i osoby, która przejmuje.
  wynik.push({ pula: 'macierzynski', wykorzystaneDni: dniTypu(TYPY_MACIERZYNSKIE), dostepneDni: pulaMacierzynskiego(rodzina, plan, pule).dni });

  // KP art. 180² § 1, § 3
  if (pule.uzupelniajacyTyg > 0) {
    wynik.push({ pula: 'uzupelniajacy', wykorzystaneDni: dniTypu(['uzupelniajacy']), dostepneDni: pule.uzupelniajacyTyg * 7 });
  }

  // KP art. 182¹a § 1–4, art. 182¹f (D10): pula wspólna i wyłączne 9 tygodni każdego rodzica.
  const rodz = plan.odcinki.filter((o) => o.typ === 'rodzicielski');
  wynik.push({
    pula: 'rodzicielski',
    wykorzystaneDni: suma(rodz.map((o) => zuzycieOdcinka(rodzina, o, p))),
    dostepneDni: pule.rodzicielskiTyg * 7,
    przepadnieDni: przepadnieRodzicielskiego(rodzina, plan, pule, p),
  });
  const n7 = pule.rodzicielskiNieprzenoszalneTyg * 7;
  for (const s of slotyRodzicow(rodzina, plan, p)) {
    if (!s.osobaId) continue;
    const przepada = Math.max(0, n7 - s.wykorzystaneDni);
    wynik.push({
      pula: 'rodzicielski_nieprzenoszalne',
      osobaId: s.osobaId,
      wykorzystaneDni: Math.min(n7, s.wykorzystaneDni),
      dostepneDni: n7,
      ...(przepada > 0 ? { przepadnieDni: przepada } : {}),
    });
  }

  // KP art. 182³ § 1: ojcowski każdej osoby, która ma go w planie, i każdego ojca z rodziny.
  const zOjcowskim = new Set([
    ...plan.odcinki.filter((o) => o.typ === 'ojcowski').map((o) => o.osobaId),
    ...rodzina.osoby.filter((o) => o.rola === 'ojciec').map((o) => o.id),
  ]);
  for (const osobaId of zOjcowskim) {
    const wykorzystane = dniTypu(['ojcowski'], osobaId);
    const dostepne = pule.ojcowskiTyg * 7;
    const przepada = Math.max(0, dostepne - wykorzystane);
    wynik.push({
      pula: 'ojcowski',
      osobaId,
      wykorzystaneDni: wykorzystane,
      dostepneDni: dostepne,
      ...(przepada > 0 ? { przepadnieDni: przepada } : {}),
    });
  }
  return wynik;
}
