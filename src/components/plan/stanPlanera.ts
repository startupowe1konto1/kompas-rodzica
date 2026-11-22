/** Czyste pomocnicze stanu planera (bez Reacta): testowane w Vitest, używane przez `usePlaner` i ekran planu. */
import type { Plan, WynikWalidacji } from '../../engine/types';

export type Widok = 'os' | 'lista';

/** Od tej szerokości (px) domyślnym widokiem jest oś czasu; poniżej – lista (telefon). */
export const PROG_OSI_PX = 768;

export function widokDomyslny(szerokoscPx: number): Widok {
  return szerokoscPx >= PROG_OSI_PX ? 'os' : 'lista';
}

/** Treść planu jako klucz: plan wraca z localStorage jako nowy obiekt, więc tożsamość obiektu nie wystarcza. */
export function kluczPlanu(plan: Plan): string {
  return JSON.stringify(plan);
}

/** Walidacja przyniesiona przez odpowiedź akcji, razem z planem, którego dotyczy. */
export interface NadpisanieWalidacji {
  klucz: string;
  walidacja: WynikWalidacji;
}

export function nadpisanieWalidacji(plan: Plan, walidacja: WynikWalidacji): NadpisanieWalidacji {
  return { klucz: kluczPlanu(plan), walidacja };
}

/** Walidacja z odpowiedzi akcji, o ile `plan` nadal jest tym planem; po zmianie z zewnątrz null (pytamy API). */
export function walidacjaZNadpisania(nadpisanie: NadpisanieWalidacji | null, plan: Plan | null): WynikWalidacji | null {
  if (!nadpisanie || !plan) return null;
  return nadpisanie.klucz === kluczPlanu(plan) ? nadpisanie.walidacja : null;
}

/** Id zaznaczonego odcinka, o ile plan go nadal zawiera. */
export function odcinekWPlanie(plan: Plan | null, id: string | null): string | null {
  if (!plan || id === null) return null;
  return plan.odcinki.some((o) => o.id === id) ? id : null;
}

/** Kod okna wyboru z fragmentu adresu: „#wybor-wariant_815” daje „wariant_815”. */
export function kodZHasha(hash: string): string | null {
  const m = /^#?wybor-(.+)$/.exec(hash);
  return m ? m[1] : null;
}

/** Plan alternatywny do podglądu „po zmianie” (odpowiedź api.akcja, której nie zastosowano), z kluczem planu bazowego. */
export interface PodgladPlanu {
  kluczBazy: string;
  plan: Plan;
  walidacja: WynikWalidacji;
}

export function nowyPodglad(baza: Plan, plan: Plan, walidacja: WynikWalidacji): PodgladPlanu {
  return { kluczBazy: kluczPlanu(baza), plan, walidacja };
}

/** Podgląd obowiązuje, dopóki plan bazowy się nie zmienił; potem znika. */
export function podgladDlaPlanu(podglad: PodgladPlanu | null, baza: Plan | null): PodgladPlanu | null {
  if (!podglad || !baza) return null;
  return podglad.kluczBazy === kluczPlanu(baza) ? podglad : null;
}
