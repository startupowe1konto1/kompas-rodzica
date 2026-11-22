/**
 * „Dziecko się urodziło” – TOR A, zadanie A6 (EC-34, KP art. 180 § 2–3, pytania 19–20).
 * Plan ułożony pod przewidywaną datę porodu przeliczamy na datę faktyczną.
 */
import { czyPoprawna, dodajDni, koniecOdcinka, liczbaDni, roznicaDni } from '../daty';
import type { DataISO, Odcinek, Parametry, Plan, Rodzina } from '../types';
import { przeliczCzesci } from './odcinki';

/**
 * Zasady:
 * 1. Odcinki zaczynające się w dniu poprzedniej daty zdarzenia albo później przesuwają się o różnicę dat.
 * 2. Urlop macierzyński zaczęty przed poprzednią datą (urlop przed porodem, KP art. 180 § 2) nie przesuwa
 *    początku, chyba że poród był wcześniej niż ten początek – wtedy zaczyna się w dniu porodu (KP art. 183¹ § 2).
 *    Długość w dniach zostaje: dni przed porodem zużywają pulę, reszta przysługuje po porodzie aż do wyczerpania
 *    wymiaru (KP art. 180 § 3; pytanie 20 – tymczasowo tak).
 * 3. Następne odcinki tej samej osoby i odcinki stykające się z tym urlopem (np. przejęcie przez ojca, potem jego
 *    rodzicielski) zachowują ciągłość: przesuwają się tak jak koniec urlopu macierzyńskiego.
 * 4. Pozostałe odcinki zaczęte przed poprzednią datą (np. zwolnienie w ciąży) zostają. Odcinków
 *    `w_wys_macierzynskiego` i `chorobowy_ciaza` NIE skracamy przy wcześniejszym porodzie (mogą wtedy nachodzić
 *    na macierzyński); nakładanie się odcinków pokaże walidacja (A5), rodzic poprawi je akcją.
 * 5. `wniosek815Data` przesuwa się o różnicę dat.
 */
export function przesunNaDatePorodu(rodzina: Rodzina, plan: Plan, poprzedniaData: DataISO, p: Parametry): Plan {
  void p;
  const nowaData = rodzina.zdarzenie.data;
  // Bez poprawnych dat nie ma czego liczyć – zwracamy plan bez zmian (silnik nie rzuca wyjątków w akcjach).
  // Także odcinek ze złą datą: przeliczCzesci i daty.ts mogłyby rzucić wyjątek, więc oddajemy kopię bez zmian.
  const zlyOdcinek = plan.odcinki.some((o) => !czyPoprawna(o.od) || !czyPoprawna(o.do));
  if (!czyPoprawna(poprzedniaData) || !czyPoprawna(nowaData) || zlyOdcinek) {
    return { ...plan, odcinki: plan.odcinki.map((o) => ({ ...o })) };
  }
  const roznica = roznicaDni(poprzedniaData, nowaData);

  /** id odcinka → odcinek po przeliczeniu według zasad 2–3. */
  const nowe = new Map<string, Odcinek>();
  const przesun = (o: Odcinek, dni: number): Odcinek => ({ ...o, od: dodajDni(o.od, dni), do: dodajDni(o.do, dni) });

  // Zasada 2: urlop macierzyński wzięty przed porodem.
  const przedPorodem = plan.odcinki.filter((o) => o.typ === 'macierzynski' && o.od < poprzedniaData);
  for (const m of przedPorodem) {
    // KP art. 183¹ § 2: bez urlopu przed porodem pierwszym dniem jest dzień porodu
    const od = nowaData < m.od ? nowaData : m.od;
    // KP art. 180 § 3: długość zostaje – dni przed porodem zużywają pulę.
    // NIEJASNE (pytanie nr 19): gdy poród jest później, przed porodem może wyjść więcej niż
    // `macierzynskiPrzedPorodemMax` tygodni (KP art. 180 § 2). Zostawiamy plan – ostrzega walidacja.
    const nowy: Odcinek = { ...m, od, do: koniecOdcinka(od, liczbaDni(m.od, m.do)) };
    nowe.set(m.id, nowy);

    // Zasada 3: ciąg odcinków po tym urlopie przesuwa się razem z jego końcem.
    const przesuniecieKonca = roznicaDni(m.do, nowy.do);
    const ciag: Odcinek[] = [m];
    for (let i = 0; i < ciag.length; i++) {
      const poprzedni = ciag[i];
      for (const x of plan.odcinki) {
        if (nowe.has(x.id)) continue;
        const styka = x.od === dodajDni(poprzedni.do, 1);
        const nastepnyTejOsoby = x.osobaId === m.osobaId && x.od > m.do;
        if (styka || nastepnyTejOsoby) {
          nowe.set(x.id, przesun(x, przesuniecieKonca));
          ciag.push(x);
        }
      }
    }
  }

  const odcinki = plan.odcinki.map((o) => {
    const gotowy = nowe.get(o.id);
    if (gotowy) return gotowy;
    if (o.od >= poprzedniaData) return przesun(o, roznica); // zasada 1
    return { ...o }; // zasada 4
  });

  const wynik: Plan = { ...plan, odcinki };
  if (plan.wniosek815Data && czyPoprawna(plan.wniosek815Data)) wynik.wniosek815Data = dodajDni(plan.wniosek815Data, roznica);
  return przeliczCzesci(wynik);
}
