/**
 * Czyste funkcje budujące profil startowy: z persony (logowanie mObywatel – symulacja),
 * pusty (ankieta ręczna) i z wgranego wniosku. Bez Reacta i bez sieci.
 */
import type { DataISO, OdpowiedzOdczytuWniosku, Osoba, PersonaTestowa, PochodzenieDanej, Rodzina } from '../../engine/types';

export interface ProfilStartowy {
  rodzina: Rodzina;
  pochodzenie: PochodzenieDanej[];
  /** Ścieżki odpowiedzi, które rodzic ma jeszcze sprawdzić (wartość startowa jest tylko domyślna). */
  doPotwierdzenia: string[];
}

export function profilZPersony(persona: PersonaTestowa, dzis: DataISO): ProfilStartowy {
  return {
    rodzina: { ...persona.rodzina, dataAnalizy: dzis },
    pochodzenie: [...persona.pochodzenie],
    doPotwierdzenia: [],
  };
}

export function pustaRodzina(dzis: DataISO): ProfilStartowy {
  return {
    rodzina: {
      osoby: [{ id: 'osoba-1', rola: 'matka', tytuly: [] }],
      zdarzenie: { typ: 'porod', data: '', przewidywana: true, dzieci: [{}] },
      dataAnalizy: dzis,
    },
    pochodzenie: [],
    doPotwierdzenia: ['osoby[0].rola', 'zdarzenie'],
  };
}

/** Scala odczyt wniosku z profilem (albo z pustą rodziną). `null`, gdy plik nie ma pól formularza. */
export function scalOdczytWniosku(
  rodzina: Rodzina | null,
  odczyt: OdpowiedzOdczytuWniosku,
  dzis: DataISO,
): ProfilStartowy | null {
  if (!odczyt.rozpoznano) return null;

  const baza = rodzina ?? pustaRodzina(dzis).rodzina;
  const z = odczyt.osoba;
  const pierwsza = baza.osoby[0];

  // Wniosek daje tytuły częściowe (kontrakt: CzesciowaOsoba). Bez rodzaju nie da się zadać
  // pytań o umowę, więc taki tytuł pomijamy; brakujące pola uzupełni ankieta (jak nowa umowa).
  const tytuly = [...pierwsza.tytuly];
  for (const t of z?.tytuly ?? []) {
    if (!t.rodzaj || tytuly.some((x) => x.id === t.id)) continue;
    tytuly.push({
      ...t,
      rodzaj: t.rodzaj,
      chorobowe: t.chorobowe ?? (t.rodzaj === 'umowa_o_prace' ? 'obowiazkowe' : 'brak'),
      od: t.od ?? '',
    });
  }

  const osoba: Osoba = {
    ...pierwsza,
    ...(z?.rola ? { rola: z.rola } : {}),
    ...(z?.dane ? { dane: { ...pierwsza.dane, ...z.dane } } : {}),
    tytuly,
  };

  const doPotwierdzenia: string[] = [];
  if (!rodzina) {
    if (!z?.rola) doPotwierdzenia.push('osoby[0].rola');
    if (!odczyt.zdarzenie?.data) doPotwierdzenia.push('zdarzenie');
  }

  return {
    rodzina: {
      ...baza,
      osoby: [osoba, ...baza.osoby.slice(1)],
      zdarzenie: { ...baza.zdarzenie, ...odczyt.zdarzenie },
      dataAnalizy: rodzina ? rodzina.dataAnalizy : dzis,
    },
    pochodzenie: [...odczyt.pochodzenie],
    doPotwierdzenia,
  };
}
