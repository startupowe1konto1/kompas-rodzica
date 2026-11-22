/**
 * Szybki kalkulator: jedno wywołanie składa trzy zapytania REST (uprawnienia, plan domyślny, kwoty).
 * UI rozmawia z silnikiem tylko przez `api` – nie importuje jego funkcji.
 */
import type { Plan, Rodzina, WynikKwot, WynikUprawnien } from '../../engine/types';
import { api } from '../../lib/api';
import { wybierzPlan } from './budujRodzine';

export interface WynikKalkulatora {
  uprawnienia: WynikUprawnien;
  /** Wszystkie plany domyślne (do zapisu w profilu); `plan` jest wybranym z nich, z ustawionym wariantem. */
  plany: Plan[];
  /** Null, gdy silnik nie dał żadnego planu (np. brak prawa do zasiłku). */
  plan: Plan | null;
  kwoty: WynikKwot | null;
}

export async function policz(rodzina: Rodzina, wariant815: boolean): Promise<WynikKalkulatora> {
  const [uprawnienia, domyslne] = await Promise.all([api.uprawnienia(rodzina), api.planyDomyslne(rodzina)]);
  let plan = wybierzPlan(domyslne.plany, rodzina);
  if (!plan) return { uprawnienia, plany: domyslne.plany, plan: null, kwoty: null };

  // Wariant 81,5% ustawia silnik, tak jak w planerze (akcja „ustaw_wariant_815”).
  if (plan.wariant815 !== wariant815) {
    plan = (await api.akcja(rodzina, plan, { typ: 'ustaw_wariant_815', wartosc: wariant815 })).plan;
  }
  const kwoty = await api.kwoty(rodzina, plan);
  return { uprawnienia, plany: domyslne.plany, plan, kwoty };
}
