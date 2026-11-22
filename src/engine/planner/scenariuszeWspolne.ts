/**
 * Pomocniki scenariuszy (plany domyślne) – TOR A, zadanie A4. Składanie odcinków, termin rodzicielskiego, ojcowski.
 * Decyzje D9, D11, D13 w docs/superpowers/plans/2026-11-21-tor-a.md oraz decyzje integratora z przeglądu A4.
 */
import { dodajDni, koniecOdcinka, liczbaDni, nachodzaNaSiebie, pozniejsza } from '../daty';
import { poczatekChorobowego, tytulyOsoby, ubezpieczenieWDniu } from '../eligibility/ubezpieczenie';
import type { DataISO, Odcinek, Osoba, Parametry, Plan, Pule, Rodzina, Rola, TypOdcinka } from '../types';
import { dlugoscPrzyLaczeniu, dniBazoweLaczenia } from './akcjeLaczenie';
import { nowyIdOdcinka, przeliczCzesci } from './odcinki';

/** Odcinek przed nadaniem identyfikatora i numeru części. `tytulId` – tylko gdy scenariusz wybiera tytuł sam. */
export interface Szkic {
  osobaId: string;
  typ: TypOdcinka;
  od: DataISO;
  do: DataISO;
  wymiarPracy?: number;
  tytulId?: string;
}

export interface Krok {
  osobaId: string;
  typ: TypOdcinka;
  dni: number;
  wymiarPracy?: number;
}

/** Odcinki jeden po drugim, każdy od dnia po poprzednim. Kroki bez dni pomija. */
export function poKolei(start: DataISO, kroki: Krok[]): Szkic[] {
  const wynik: Szkic[] = [];
  let od = start;
  for (const { dni, ...k } of kroki) {
    if (dni <= 0) continue;
    const koniec = koniecOdcinka(od, dni);
    wynik.push({ ...k, od, do: koniec });
    od = dodajDni(koniec, 1);
  }
  return wynik;
}

/**
 * Najdłuższy odcinek od `od` do najpóźniej `doKiedy`, który zużywa pełne tygodnie puli (odpowiedź ZUS na stoisku 21.11,
 * pytanie nr 15). Przy pracy liczy się zużycie, a długość kalendarzowa – według D10 [KP art. 182¹f § 2, § 4].
 * Brak, gdy nie mieści się ani jeden tydzień.
 */
function koniecPelnychTygodni(od: DataISO, doKiedy: DataISO, wymiarPracy: number): DataISO | undefined {
  const dostepne = liczbaDni(od, doKiedy);
  let tyg = Math.floor(dniBazoweLaczenia(dostepne, wymiarPracy) / 7);
  while (tyg > 0 && dlugoscPrzyLaczeniu(tyg * 7, wymiarPracy) > dostepne) tyg--;
  return tyg > 0 ? koniecOdcinka(od, dlugoscPrzyLaczeniu(tyg * 7, wymiarPracy)) : undefined;
}

/**
 * Rodzicielski najpóźniej do `doKiedy` [KP art. 182¹c; przy zgonie dziecka KP art. 182¹g → art. 180¹ § 2]:
 * odcinek, który kończy się później, przycinamy do pełnych tygodni przed tym dniem (pytanie nr 15), a gdy koniec
 * wynika z przepisu (`koniecZPrzepisu`, zgon dziecka) – co do dnia. Odcinek, który zaczyna się później albo nie
 * mieści ani tygodnia – pomijamy (`utracone` = true). Odcinki innych typów bez zmian.
 */
export function przytnijRodzicielski(
  szkice: Szkic[],
  doKiedy: DataISO | undefined,
  koniecZPrzepisu = false,
): { szkice: Szkic[]; utracone: boolean } {
  if (!doKiedy) return { szkice, utracone: false };
  let utracone = false;
  const wynik: Szkic[] = [];
  for (const s of szkice) {
    if (s.typ !== 'rodzicielski' || s.do <= doKiedy) {
      wynik.push(s);
      continue;
    }
    const koniec = s.od > doKiedy ? undefined : koniecZPrzepisu ? doKiedy : koniecPelnychTygodni(s.od, doKiedy, s.wymiarPracy ?? 0);
    if (koniec) wynik.push({ ...s, do: koniec });
    else utracone = true;
  }
  return { szkice: wynik, utracone };
}

/** Pierwszy dzień od porodu (przyjęcia dziecka), w którym osoba ma ubezpieczenie chorobowe [UZ art. 29 ust. 1 pkt 3]. */
export function pierwszyDzienUbezpieczenia(rodzina: Rodzina, p: Parametry, osoba: Osoba): DataISO | undefined {
  const z = rodzina.zdarzenie.data;
  return [z, ...tytulyOsoby(osoba).map((t) => pozniejsza(z, poczatekChorobowego(t)))]
    .sort()
    .find((d) => ubezpieczenieWDniu(osoba, d, p, rodzina).ubezpieczona);
}

/**
 * Ojcowski osoby `osoba` (D13 i decyzje integratora):
 *  - start w dniu porodu, gdy osoba jest wtedy ubezpieczona; inaczej w pierwszym dniu ubezpieczenia chorobowego po porodzie
 *    [KP art. 182³ § 1 – urlop pracownika; UZ art. 29 ust. 1 pkt 3 – zasiłek ubezpieczonego];
 *  - gdyby nachodził na inny odcinek tej osoby w łańcuchu (np. przejęty macierzyński) – bezpośrednio za jej ostatnim
 *    odcinkiem;
 *  - zawsze w całości przed `ojcowskiDoKiedy` [KP art. 182³ § 1 pkt 1–2], inaczej go nie planujemy.
 */
export function ojcowskiDla(rodzina: Rodzina, p: Parametry, pule: Pule, osoba: Osoba, lancuch: Szkic[]): Szkic[] {
  const dni = pule.ojcowskiTyg * 7; // KP art. 183¹ § 1 odpowiednio: tydzień = 7 dni
  if (dni <= 0) return [];
  const odcinekOd = (od: DataISO): Szkic | undefined => {
    const koniec = koniecOdcinka(od, dni);
    return !pule.ojcowskiDoKiedy || koniec <= pule.ojcowskiDoKiedy ? { osobaId: osoba.id, typ: 'ojcowski', od, do: koniec } : undefined;
  };
  const start = pierwszyDzienUbezpieczenia(rodzina, p, osoba);
  if (!start) return [];
  const o = odcinekOd(start);
  if (!o) return [];
  const wlasne = lancuch.filter((s) => s.osobaId === osoba.id);
  if (!wlasne.some((s) => nachodzaNaSiebie(s, o))) return [o];
  const ostatni = wlasne.reduce((m, s) => pozniejsza(m, s.do), wlasne[0].do);
  const przeniesiony = odcinekOd(dodajDni(ostatni, 1));
  return przeniesiony ? [przeniesiony] : [];
}

/**
 * Plan ze szkiców: identyfikatory według D11 (`nowyIdOdcinka`), `tytulId` ze szkicu albo z `ubezpieczenieWDniu` w dniu
 * startu odcinka, `czescNr` według D9 (`przeliczCzesci`).
 */
export function zloz(rodzina: Rodzina, p: Parametry, id: string, nazwa: string, szkice: Szkic[]): Plan {
  let plan: Plan = { id, nazwa, wariant815: false, odcinki: [] };
  for (const s of szkice) {
    const osoba = rodzina.osoby.find((o) => o.id === s.osobaId) as Osoba;
    const tytulId = s.tytulId ?? ubezpieczenieWDniu(osoba, s.od, p, rodzina).tytulId;
    const o: Odcinek = { id: nowyIdOdcinka(plan, s.osobaId, s.typ), ...s, ...(tytulId ? { tytulId } : {}) };
    plan = { ...plan, odcinki: [...plan.odcinki, o] };
  }
  return przeliczCzesci(plan);
}

export const KTO: Record<Rola, string> = {
  matka: 'Mama',
  ojciec: 'Tata',
  przyjmujacy: 'Osoba przyjmująca dziecko',
  inny_czlonek_rodziny: 'Członek rodziny',
};

/** „1 tydzień”, „2 tygodnie”, „9 tygodni”, „22 tygodnie”. */
export function tygodnie(n: number): string {
  if (n === 1) return '1 tydzień';
  const j = n % 10;
  const d = n % 100;
  return `${n} ${j >= 2 && j <= 4 && (d < 12 || d > 14) ? 'tygodnie' : 'tygodni'}`;
}

/** ['a', 'b', 'c'] → 'a, b i c'. */
export function wyliczenie(czesci: string[]): string {
  return czesci.length > 1 ? `${czesci.slice(0, -1).join(', ')} i ${czesci[czesci.length - 1]}` : (czesci[0] ?? '');
}
