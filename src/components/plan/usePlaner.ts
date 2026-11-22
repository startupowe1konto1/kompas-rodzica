'use client';

/**
 * Wspólny stan planera: oś czasu i lista czytają ten sam `Planer`.
 *
 * Źródłem prawdy o planach jest profil (`useProfil`). Walidacja startowa idzie z `useWalidacja`,
 * po akcji bierzemy ją z odpowiedzi akcji (bez drugiego zapytania), aż plan zmieni się z zewnątrz.
 * Błąd walidacji (np. 500 z API) nie chowa planu: `walidacjaBlad` + `ponowWalidacje()`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AkcjaPlanu, DataISO, Mozliwosc, Plan, Rodzina, WynikUprawnien, WynikWalidacji } from '../../engine/types';
import { api } from '../../lib/api';
import { useProfil } from '../../state/profil';
import { useUprawnienia, usePlanyDomyslne, useWalidacja, type BladZapytania } from '../../state/useZapytanie';
import { komunikatBledu } from '../../state/zapytanie';
import { dzieckoSieUrodzilo } from './porod';
import { nadpisanieWalidacji, nowyPodglad, odcinekWPlanie, podgladDlaPlanu, walidacjaZNadpisania, type NadpisanieWalidacji, type PodgladPlanu } from './stanPlanera';
import { czyBrakPlanu } from '../wynik/brakPlanu';

export interface Planer {
  rodzina: Rodzina | null;
  plan: Plan | null;
  plany: Plan[];
  uprawnienia: WynikUprawnien | null;
  walidacja: WynikWalidacji | null;
  /** true, gdy trwa akcja – przyciski akcji mają wtedy `disabled` i `aria-busy`. */
  zajety: boolean;
  /** Błąd ostatniej akcji / „Dziecko się urodziło” albo pobrania planów. Czyszczony przy następnej akcji. */
  blad: BladZapytania | null;
  wybranyOdcinekId: string | null;
  wybierzOdcinek: (id: string | null) => void;
  /** api.akcja → aktualizujPlan(odp.plan) + walidacja = odp.walidacja. Zwraca true po sukcesie. */
  wykonaj: (akcja: AkcjaPlanu) => Promise<boolean>;
  wybierzScenariusz: (planId: string) => void;
  /** „Dziecko się urodziło”: dzieckoSieUrodzilo → api.przesunPlan → ustawRodzine + aktualizujPlan + walidacja. Zwraca true po sukcesie. */
  urodzilo: (data: DataISO) => Promise<boolean>;
  /** Dopisuje kopię planu (porównanie); wybór planu zostaje bez zmian. */
  dodajPlan: (plan: Plan) => void;

  // Rozszerzenia ponad szkicem interfejsu z planu:
  /** Zaznaczona decyzja (okno wyboru z `uprawnienia.mozliwosci`) – karty decyzji i pin z linią na osi (T2.5). */
  wybranaDecyzja: Mozliwosc['kod'] | null;
  wybierzDecyzje: (kod: Mozliwosc['kod'] | null) => void;
  /** Plan alternatywny „po zmianie” (api.akcja bez zastosowania) – drugi wiersz osi i kwoty. Znika po zmianie planu. */
  podglad: { plan: Plan; walidacja: WynikWalidacji } | null;
  /** api.akcja bez zmiany planu w profilu; wynik w `podglad`. Zwraca true po sukcesie. */
  pokazPodglad: (akcja: AkcjaPlanu) => Promise<boolean>;
  zamknijPodglad: () => void;
  /** Zastępuje plan podglądem (jak `wykonaj`, ale bez ponownego zapytania). */
  zastosujPodglad: () => void;
  /** Profil wczytany z localStorage (przed tym nie przekierowujemy ani nie pokazujemy „brak profilu”). */
  gotowy: boolean;
  /** Trwa pobieranie planów domyślnych (profil ma rodzinę, ale jeszcze nie ma planu). */
  ladujePlany: boolean;
  /** Silnik nie ułożył żadnego planu (np. sprzeczne odpowiedzi): zamiast ładowania pokazujemy, co poprawić. */
  brakPlanu: boolean;
  /** Walidacja się liczy (pierwszy raz albo po zmianie planu z zewnątrz). */
  walidacjaLaduje: boolean;
  /** Walidacja niedostępna (np. 500): plan jest pokazany, walidacja = null. */
  walidacjaBlad: BladZapytania | null;
  ponowWalidacje: () => void;
  ladujeUprawnienia: boolean;
  uprawnieniaBlad: BladZapytania | null;
  ponowUprawnienia: () => void;
  ponowPlany: () => void;
}

export function usePlaner(): Planer {
  const profil = useProfil();
  const { gotowy, rodzina, plany, wybranyPlan: plan, ustawPlany, aktualizujPlan, wybierzPlan, ustawRodzine } = profil;

  const planyDomyslne = usePlanyDomyslne(plany.length === 0 ? rodzina : null);
  const planyZApi = planyDomyslne.dane?.plany;
  useEffect(() => {
    if (planyZApi && plany.length === 0) ustawPlany(planyZApi);
  }, [planyZApi, plany.length, ustawPlany]);

  const uprawnienia = useUprawnienia(rodzina);

  const [nadpisanie, setNadpisanie] = useState<NadpisanieWalidacji | null>(null);
  const zOdpowiedzi = walidacjaZNadpisania(nadpisanie, plan);
  // Gdy mamy walidację z odpowiedzi akcji, nie pytamy API drugi raz.
  const walidacjaApi = useWalidacja(rodzina, zOdpowiedzi ? null : plan);

  const [wybrany, setWybrany] = useState<string | null>(null);
  const [zajety, setZajety] = useState(false);
  const [bladAkcji, setBladAkcji] = useState<BladZapytania | null>(null);

  const wybranyOdcinekId = odcinekWPlanie(plan, wybrany);
  const [wybranaDecyzja, wybierzDecyzje] = useState<Mozliwosc['kod'] | null>(null);
  const [podgladStan, setPodglad] = useState<PodgladPlanu | null>(null);
  const podglad = podgladDlaPlanu(podgladStan, plan);

  const pokazPodglad = useCallback(
    async (akcja: AkcjaPlanu): Promise<boolean> => {
      if (!rodzina || !plan) return false;
      setZajety(true);
      setBladAkcji(null);
      try {
        const odp = await api.akcja(rodzina, plan, akcja);
        setPodglad(nowyPodglad(plan, odp.plan, odp.walidacja));
        return true;
      } catch (e) {
        setBladAkcji(komunikatBledu(e));
        return false;
      } finally {
        setZajety(false);
      }
    },
    [rodzina, plan],
  );
  const zamknijPodglad = useCallback(() => setPodglad(null), []);
  const zastosujPodglad = useCallback(() => {
    if (!podglad) return;
    setNadpisanie(nadpisanieWalidacji(podglad.plan, podglad.walidacja));
    aktualizujPlan(podglad.plan);
    setPodglad(null);
  }, [podglad, aktualizujPlan]);

  const wykonaj = useCallback(
    async (akcja: AkcjaPlanu): Promise<boolean> => {
      if (!rodzina || !plan) return false;
      setZajety(true);
      setBladAkcji(null);
      try {
        const odp = await api.akcja(rodzina, plan, akcja);
        setNadpisanie(nadpisanieWalidacji(odp.plan, odp.walidacja));
        aktualizujPlan(odp.plan);
        return true;
      } catch (e) {
        setBladAkcji(komunikatBledu(e));
        return false;
      } finally {
        setZajety(false);
      }
    },
    [rodzina, plan, aktualizujPlan],
  );

  const urodzilo = useCallback(
    async (data: DataISO): Promise<boolean> => {
      if (!rodzina || !plan) return false;
      setZajety(true);
      setBladAkcji(null);
      try {
        const { rodzina: nowa, poprzedniaData } = dzieckoSieUrodzilo(rodzina, data);
        const odp = await api.przesunPlan(nowa, plan, poprzedniaData);
        setNadpisanie(nadpisanieWalidacji(odp.plan, odp.walidacja));
        ustawRodzine(nowa);
        aktualizujPlan(odp.plan);
        return true;
      } catch (e) {
        setBladAkcji(komunikatBledu(e));
        return false;
      } finally {
        setZajety(false);
      }
    },
    [rodzina, plan, ustawRodzine, aktualizujPlan],
  );

  const wybierzScenariusz = useCallback(
    (planId: string) => {
      setBladAkcji(null);
      wybierzPlan(planId);
    },
    [wybierzPlan],
  );

  const walidacja = zOdpowiedzi ?? walidacjaApi.dane;
  const blad = bladAkcji ?? (plany.length === 0 ? planyDomyslne.blad : null);
  const brakPlanu = czyBrakPlanu(plan, planyDomyslne);
  const ladujePlany = rodzina !== null && plan === null && planyDomyslne.blad === null && !brakPlanu;
  const walidacjaLaduje = plan !== null && !zOdpowiedzi && walidacjaApi.laduje;
  const walidacjaBlad = zOdpowiedzi ? null : walidacjaApi.blad;
  const ladujeUprawnienia = rodzina !== null && uprawnienia.laduje;

  return useMemo<Planer>(
    () => ({
      rodzina,
      plan,
      plany,
      uprawnienia: uprawnienia.dane,
      walidacja,
      zajety,
      blad,
      wybranyOdcinekId,
      wybierzOdcinek: setWybrany,
      wykonaj,
      wybierzScenariusz,
      urodzilo,
      dodajPlan: aktualizujPlan,
      wybranaDecyzja,
      wybierzDecyzje,
      podglad: podglad ? { plan: podglad.plan, walidacja: podglad.walidacja } : null,
      pokazPodglad,
      zamknijPodglad,
      zastosujPodglad,
      gotowy,
      ladujePlany,
      brakPlanu,
      walidacjaLaduje,
      walidacjaBlad,
      ponowWalidacje: walidacjaApi.odswiez,
      ladujeUprawnienia,
      uprawnieniaBlad: uprawnienia.blad,
      ponowUprawnienia: uprawnienia.odswiez,
      ponowPlany: planyDomyslne.odswiez,
    }),
    [
      rodzina, plan, plany, uprawnienia.dane, uprawnienia.blad, uprawnienia.odswiez, walidacja, zajety, blad, wybranyOdcinekId,
      wykonaj, wybierzScenariusz, urodzilo, aktualizujPlan, wybranaDecyzja, podglad, pokazPodglad, zamknijPodglad, zastosujPodglad, gotowy, ladujePlany, brakPlanu, walidacjaLaduje, walidacjaBlad,
      walidacjaApi.odswiez, ladujeUprawnienia, planyDomyslne.odswiez,
    ],
  );
}
