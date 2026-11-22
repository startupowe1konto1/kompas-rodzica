/**
 * WALIDACJA PLANU – TOR A, zadanie A5 (docs/superpowers/plans/2026-11-21-tor-a.md).
 * Reguły podzielone na pliki `walidacja*.ts`. Tu: reguły wspólne dla wszystkich odcinków i złożenie wyniku.
 * D5: walidacja nie zwraca kodów `WNIOSEK_*` – terminy wniosków liczy tor D.
 */
import { nachodzaNaSiebie } from '../daty';
import type { Komunikat, Parametry, Plan, Rodzina, WynikUprawnien, WynikWalidacji } from '../types';
import { walidujMacierzynski, walidujUzupelniajacy } from './walidacjaMacierzynski';
import { walidujOjcowski } from './walidacjaOjcowski';
import { walidujRodzicielski } from './walidacjaRodzicielski';
import { walidujWariant815 } from './walidacjaWariant815';
import {
  czyZasilkowy,
  dataPowrotu,
  dataSlownie,
  koniecZasilku,
  komunikat,
  type Kontekst,
  maEtatWDniu,
  nazwaOsoby,
  SWIADCZENIE_ODCINKA,
  uprawnienieDo,
  zWielkiej,
} from './walidacjaWspolne';
import { policzWykorzystanie } from './wykorzystanie';

/** Podstawa prawna świadczenia – do komunikatu `BRAK_UPRAWNIENIA`, gdy wpisu w uprawnieniach brak. */
const PRZEPIS_SWIADCZENIA: Record<string, string> = {
  macierzynski: 'UZ art. 29 ust. 1; KP art. 180',
  na_warunkach_macierzynskiego: 'UZ art. 29 ust. 1; KP art. 183',
  uzupelniajacy: 'KP art. 180²',
  rodzicielski: 'KP art. 182¹a',
  ojcowski: 'KP art. 182³',
  zasilek_chorobowy_ciaza: 'UZ art. 4, art. 11',
  zasilek_w_wys_macierzynskiego: 'UZ art. 29',
};

function walidujWspolne(ctx: Kontekst): Komunikat[] {
  const { rodzina, plan, uprawnienia } = ctx;
  const wynik: Komunikat[] = [];

  for (const o of plan.odcinki) {
    // Odcinek domknięty: pierwszy dzień nie może być po ostatnim (kontrakt w types.ts; to nie reguła z przepisu).
    if (o.od > o.do) {
      wynik.push(
        komunikat('ODCINEK_ZLE_DATY', 'blad', `Ten odcinek kończy się (${dataSlownie(o.do)}) przed swoim początkiem (${dataSlownie(o.od)}).`, undefined, {
          osobaId: o.osobaId,
          odcinekId: o.id,
          coZrobic: 'Proszę poprawić daty odcinka.',
        }),
      );
    }

    // Zasiłek przysługuje tylko osobie, która ma do niego prawo [UZ art. 29 ust. 1; KP art. 180, 180², 182¹a, 182³].
    // 'warunkowo' nie blokuje planu – warunek opisuje uprawnienie (np. przejęcie macierzyńskiego).
    const swiadczenie = SWIADCZENIE_ODCINKA[o.typ];
    if (!swiadczenie) continue;
    const u = uprawnienieDo(uprawnienia.uprawnienia, o.osobaId, swiadczenie);
    if (!u || u.przysluguje === false) {
      wynik.push(
        komunikat(
          'BRAK_UPRAWNIENIA',
          'blad',
          // Powód z uprawnień jest w drugiej osobie (do osoby, której dotyczy) – poprzedzamy go tylko jej nazwą.
          u?.powod
            ? `${zWielkiej(nazwaOsoby(rodzina, o.osobaId))}: ${u.powod}`
            : `${zWielkiej(nazwaOsoby(rodzina, o.osobaId))} nie ma prawa do tego świadczenia przy danych, które znamy.`,
          u?.przepis ?? PRZEPIS_SWIADCZENIA[swiadczenie],
          { osobaId: o.osobaId, odcinekId: o.id, coZrobic: u?.alternatywa ?? 'Ten odcinek trzeba usunąć albo przenieść na osobę, która ma do niego prawo.' },
        ),
      );
    }
  }

  // Ta sama osoba nie pobiera dwóch zasiłków za ten sam dzień [UZ art. 29a; KP art. 182¹a § 6 dotyczy dwóch osób].
  // Praca (także w czasie rodzicielskiego z `wymiarPracy`) nie jest odcinkiem zasiłkowym.
  const zasilkowe = plan.odcinki.filter(czyZasilkowy);
  for (let i = 0; i < zasilkowe.length; i++) {
    for (let j = i + 1; j < zasilkowe.length; j++) {
      const [a, b] = [zasilkowe[i], zasilkowe[j]];
      if (a.osobaId === b.osobaId && nachodzaNaSiebie(a, b)) {
        wynik.push(
          komunikat(
            'ODCINKI_NACHODZA',
            'blad',
            `${zWielkiej(nazwaOsoby(rodzina, a.osobaId))} ma w planie dwa urlopy w tych samych dniach. Za jeden dzień przysługuje jeden zasiłek.`,
            'UZ art. 29a',
            { osobaId: a.osobaId, odcinekId: b.id, coZrobic: 'Proszę przesunąć jeden z odcinków tak, żeby się nie nakładały.' },
          ),
        );
      }
    }
  }

  // KP art. 186⁴: po urlopie pracodawca dopuszcza pracownika do pracy. Data powrotu = dzień po ostatnim urlopie osoby
  // (zasiłkowym albo wychowawczym), jedna konsekwencja na osobę – tylko przy umowie o pracę trwającej w tym dniu.
  // Osoba bez umowy o pracę w dniu powrotu nie „wraca do pracy” – dostaje datę końca zasiłku [UZ art. 29a ust. 1].
  for (const osobaId of [...new Set(zasilkowe.map((o) => o.osobaId))]) {
    const powrot = dataPowrotu(plan, osobaId);
    const koniec = koniecZasilku(plan, osobaId);
    if (!powrot || !koniec) continue;
    const kto = zWielkiej(nazwaOsoby(rodzina, osobaId));
    wynik.push(
      maEtatWDniu(rodzina, osobaId, powrot)
        ? komunikat('POWROT_DO_PRACY', 'konsekwencja', `${kto} wraca do pracy ${dataSlownie(powrot)}.`, 'KP art. 186⁴', { osobaId })
        : komunikat('KONIEC_ZASILKU', 'konsekwencja', `Ostatni dzień zasiłku: ${dataSlownie(koniec)}. ${kto} dostaje go za dni urlopu z tego planu.`, 'UZ art. 29a ust. 1', {
            osobaId,
          }),
    );
  }
  return wynik;
}

export function walidujPlanZ(rodzina: Rodzina, plan: Plan, uprawnienia: WynikUprawnien, p: Parametry): WynikWalidacji {
  const ctx: Kontekst = { rodzina, plan, uprawnienia, pule: uprawnienia.pule, p };
  const wszystkie = [
    ...walidujWspolne(ctx),
    ...walidujMacierzynski(ctx),
    ...walidujUzupelniajacy(ctx),
    ...walidujRodzicielski(ctx),
    ...walidujOjcowski(ctx),
    ...walidujWariant815(ctx),
  ];
  const bledy = wszystkie.filter((k) => k.poziom === 'blad');
  return {
    poprawny: bledy.length === 0,
    bledy,
    ostrzezenia: wszystkie.filter((k) => k.poziom === 'ostrzezenie'),
    konsekwencje: wszystkie.filter((k) => k.poziom === 'konsekwencja' || k.poziom === 'info'),
    wykorzystanie: policzWykorzystanie(rodzina, plan, uprawnienia.pule, p),
  };
}
