'use client';

import { useRouter } from 'next/navigation';
import { IconCheck, IconClockHour4, IconFileCertificate, IconLoader2, IconPencil } from '@tabler/icons-react';
import type { OdpowiedzZrodla, PersonaTestowa, Rodzina, ZrodloId } from '@/src/engine/types';
import { api } from '@/src/lib/api';
import { dzisISO, useProfil } from '@/src/state/profil';
import { useZapytanie, type WynikZapytania } from '@/src/state/useZapytanie';
import { funkcjaNiegotowa } from '@/src/state/zapytanie';
import { PYTANIA } from '../pytania/definicje';
import { brakujaceDane, daneZeZrodel } from '../pytania/zrodla';
import { Karta, Przycisk } from '../ui';
import type { MetodaLogowania } from './logowanie-gov';
import { profilZPersony } from './zrodla-startu';
import { opisyDokumentow, saldoZaleglosci } from './dokumenty-zrodel';
import { formatujKwote } from '../format';

const NAGLOWKI_GRUP: Partial<Record<ZrodloId, string>> = {
  mobywatel: 'Z mObywatela',
  ezus: 'Z eZUS',
  eurzad_skarbowy: 'Z e-Urzędu Skarbowego',
};

/**
 * Krótkie nazwy danych (rzeczowniki) zamiast treści pytań z ankiety: na liście „co przyszło z usługi”
 * pełne pytanie („Z jakich umów…? Proszę zaznaczyć…”) brzmiało jak polecenie (uwaga Wojtka 22.11).
 * Klucz: ostatnia część ścieżki w profilu (bez indeksów).
 */
const NAZWY_DANYCH: Record<string, string> = {
  tytuly: 'Umowy i działalność, z których jest ubezpieczenie',
  rodzaj: 'Rodzaj umowy',
  od: 'Data początku umowy lub działalności',
  do: 'Data zakończenia umowy',
  naCzasOkreslony: 'Czas trwania umowy',
  naZastepstwo: 'Umowa na zastępstwo',
  wymiarEtatu: 'Wymiar etatu',
  chorobowe: 'Ubezpieczenie chorobowe',
  chorobowoOd: 'Data objęcia ubezpieczeniem chorobowym',
  wynagrodzenieMiesieczne: 'Wynagrodzenie brutto',
  podstawaSkladek: 'Podstawa wymiaru składek z ostatnich 12 miesięcy',
  zadeklarowanaPodstawa: 'Zadeklarowana podstawa wymiaru składek',
  platnikPowyzej20: 'Liczba ubezpieczonych u płatnika',
  nazwaPlatnika: 'Nazwa płatnika składek',
  nipPlatnika: 'NIP płatnika składek',
  ustanie: 'Data i przyczyna ustania ubezpieczenia',
  eZLA: 'Zwolnienia lekarskie (e-ZLA)',
  zadluzenieSkladkowe: 'Zaległości w składkach',
};

function czytelnaEtykieta(etykieta: string, sciezka: string): string {
  const pole = (sciezka.split('.').at(-1) ?? '').replace(/\[\d+\]$/, '');
  if (NAZWY_DANYCH[pole]) return NAZWY_DANYCH[pole];
  if (etykieta === sciezka) return 'Dane z usługi';
  // Pytanie bez nazwy w słowniku: zostaje samo pytanie, bez dopisanych poleceń („Proszę…”).
  const doPytajnika = etykieta.indexOf('?');
  return doPytajnika > 0 ? etykieta.slice(0, doPytajnika + 1) : etykieta;
}

/** Pozycje bez powtórzeń; przy parze każda pozycja dostaje imię osoby (albo „Osoba 2”). */
function pozycjeGrupy(pozycje: { sciezka: string; etykieta: string }[], rodzina: Rodzina) {
  const para = rodzina.osoby.length > 1;
  const widziane = new Set<string>();
  const wynik: { klucz: string; tekst: string }[] = [];
  for (const p of pozycje) {
    const nazwa = czytelnaEtykieta(p.etykieta, p.sciezka);
    if (nazwa === 'Dane z usługi') continue;
    // Saldo zaległości to jedyna kwota na tej liście: opis zadania każe pokazać wysokość zadłużenia (pkt 3).
    const saldo = saldoZaleglosci(p.sciezka, rodzina);
    const tekst = saldo ? `${nazwa}: ${formatujKwote(saldo.kwota)}` : nazwa;
    const indeks = /^osoby\[(\d+)\]/.exec(p.sciezka)?.[1];
    const osoba = indeks === undefined ? undefined : (rodzina.osoby[Number(indeks)]?.dane?.imie ?? `Osoba ${Number(indeks) + 1}`);
    const klucz = `${osoba ?? ''}|${tekst}`;
    if (widziane.has(klucz)) continue;
    widziane.add(klucz);
    wynik.push({ klucz, tekst: para && osoba ? `${osoba}: ${tekst}` : tekst });
  }
  return wynik;
}

/** Zapytanie zakończone: są dane albo usługa jeszcze nie działa (404/501 = bierzemy dane persony). */
function koniec(w: WynikZapytania<OdpowiedzZrodla>): boolean {
  return !w.laduje && (w.dane !== null || funkcjaNiegotowa(w.blad));
}

function Status({ nazwa, w, czeka }: { nazwa: string; w: WynikZapytania<OdpowiedzZrodla>; czeka: boolean }) {
  const gotowe = !czeka && koniec(w);
  const nieudane = !czeka && !w.laduje && !gotowe && w.blad !== null;
  return (
    <li
      data-status-pobierania={gotowe ? 'pobrane' : nieudane ? 'blad' : 'pobieramy'}
      className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
    >
      <span className="font-bold text-tekst">{nazwa}</span>
      {gotowe ? (
        <span className="inline-flex items-center gap-1.5 font-bold text-zielen">
          <IconCheck size={20} stroke={2.5} aria-hidden />
          pobrane
        </span>
      ) : nieudane ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="text-tekst-drugi">nie udało się połączyć</span>
          <Przycisk wariant="drugi" onClick={w.odswiez} className="min-h-11! px-3!">
            Spróbuj ponownie
          </Przycisk>
        </span>
      ) : (
        <span role="status" className="inline-flex items-center gap-1.5 text-tekst-drugi">
          <IconLoader2 size={20} stroke={2} aria-hidden className="motion-safe:animate-spin" />
          {czeka ? 'czeka…' : 'pobieramy…'}
        </span>
      )}
    </li>
  );
}

/**
 * Po wyborze persony: zapytania do mObywatela i eZUS idą po kolei, potem lista „co przyszło
 * z której usługi” i „czego żadna usługa nie ma”. Treść list pochodzi z `persona.pochodzenie`;
 * to, że usługa nie ma danej, której persona jej nie przypisała, pilnuje mapa źródeł w `daneZeZrodel`.
 */
export function PobieranieDanych({
  persona,
  metoda,
  onZmiana,
}: {
  persona: PersonaTestowa;
  /** Sposób logowania wybrany w węźle login.gov.pl (symulacja). */
  metoda?: MetodaLogowania;
  onZmiana: () => void;
}) {
  const router = useRouter();
  const profil = useProfil();
  const mobywatel = useZapytanie(`zrodlo:mobywatel:${persona.id}`, () => api.zrodlo('mobywatel', persona.id));
  const mobywatelGotowy = koniec(mobywatel);
  const ezus = useZapytanie(mobywatelGotowy ? `zrodlo:ezus:${persona.id}` : null, () => api.zrodlo('ezus', persona.id));
  const gotowe = mobywatelGotowy && koniec(ezus);

  const { rodzina, pochodzenie } = profilZPersony(persona, dzisISO());
  const grupy = gotowe ? daneZeZrodel(PYTANIA, rodzina, pochodzenie) : [];
  const braki = gotowe ? brakujaceDane(PYTANIA, rodzina, pochodzenie) : [];
  // Dokumenty, które eZUS zwraca razem z danymi (np. zaświadczenie o zadłużeniu) – z odpowiedzi usługi, nie z persony.
  const dokumentyEzus = gotowe ? opisyDokumentow(ezus.dane?.dokumenty ?? [], rodzina) : [];

  return (
    <section aria-labelledby="pobieranie-naglowek" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pobieranie-naglowek" tabIndex={-1} className="text-xl font-bold leading-snug text-tekst outline-none lg:text-2xl">
          Pobieramy dane
        </h2>
        <button type="button" onClick={onZmiana} className="min-h-11 font-bold text-zielen underline underline-offset-2">
          Wybierz inną osobę
        </button>
      </div>
      <p className="max-w-prose leading-normal text-tekst-drugi">
        Zalogowano jako: {persona.nazwa} – osoba testowa{metoda ? `, przez ${metoda.wZdaniu}` : ''}. To symulacja: pobieramy
        tylko to, co dana usługa naprawdę ma.
      </p>

      <Karta>
        <ul className="divide-y divide-szary-linia" aria-label="Postęp pobierania">
          <Status nazwa="mObywatel (symulacja)" w={mobywatel} czeka={false} />
          <Status nazwa="eZUS (symulacja)" w={ezus} czeka={!mobywatelGotowy} />
        </ul>
      </Karta>

      {gotowe && (
        <>
          {/* Dwie kolumny, kafle jeden pod drugim (najdłuższy pierwszy): w siatce krótkie kafle rozciągały się
              do wysokości sąsiada i zostawiały dużo pustego miejsca (uwaga Wojtka 22.11). */}
          <div className="gap-4 lg:columns-2">
            {[...grupy]
              .sort((a, b) => pozycjeGrupy(b.pozycje, rodzina).length - pozycjeGrupy(a.pozycje, rodzina).length)
              .map((g) => (
              <Karta
                key={g.zrodlo}
                jako="section"
                data-grupa-zrodla={g.zrodlo}
                aria-labelledby={`grupa-${g.zrodlo}`}
                className="mb-4 break-inside-avoid"
              >
                <h3 id={`grupa-${g.zrodlo}`} className="text-lg font-bold leading-snug text-tekst">
                  {NAGLOWKI_GRUP[g.zrodlo] ?? g.etykieta.replace(/^z /, 'Z ')}
                  {g.symulacja && <span className="font-normal text-tekst-drugi"> (symulacja)</span>}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {pozycjeGrupy(g.pozycje, rodzina).map((p) => (
                    <li key={p.klucz} className="flex items-start gap-2 leading-normal">
                      <IconCheck size={20} stroke={2.5} aria-hidden className="mt-0.5 shrink-0 text-zielen" />
                      <span>{p.tekst}</span>
                    </li>
                  ))}
                </ul>
              </Karta>
            ))}
          </div>

          {dokumentyEzus.length > 0 && (
            <Karta jako="section" aria-labelledby="dokumenty-ezus" data-dokumenty-zrodla="ezus">
              <h3 id="dokumenty-ezus" className="text-lg font-bold leading-snug text-tekst">
                Dokumenty z eZUS <span className="font-normal text-tekst-drugi">(symulacja)</span>
              </h3>
              <ul className="mt-3 flex flex-col gap-4">
                {dokumentyEzus.map((d) => (
                  <li key={d.kod} data-dokument={d.kod} data-status-dokumentu={d.status} className="flex items-start gap-2 leading-normal">
                    {d.status === 'wystawione' ? (
                      <IconFileCertificate size={20} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-zielen" />
                    ) : (
                      <IconClockHour4 size={20} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-granat" />
                    )}
                    <span>
                      <span className="font-bold text-tekst">{d.nazwa}</span>
                      {d.szczegoly.map((t) => (
                        <span key={t} className="block text-tekst-drugi">
                          {t}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </Karta>
          )}

          {braki.length > 0 ? (
            <Karta jako="section" aria-labelledby="grupa-braki">
              <h3 id="grupa-braki" className="text-lg font-bold leading-snug text-tekst">
                Tego żadna usługa nie ma – te dane wpisze Pani/Pan w ankiecie
              </h3>
              <ul className="mt-3 flex flex-col gap-3">
                {braki.map((b) => (
                  <li key={b.klucz} data-brakuje className="flex items-start gap-2 leading-normal">
                    <IconPencil size={20} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-granat" />
                    <span>
                      {b.etykieta}
                      {b.skadWziac && <span className="block text-sm text-tekst-drugi">{b.skadWziac}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Karta>
          ) : (
            <p className="text-tekst-drugi">Usługi mają wszystko, czego potrzebujemy. Wystarczy sprawdzić, czy dane się zgadzają.</p>
          )}
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-szary-linia bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Przycisk
          pelnaSzerokosc
          disabled={!gotowe}
          className="md:w-auto"
          onClick={() => {
            const p = profilZPersony(persona, dzisISO());
            profil.ustawRodzine(p.rodzina);
            profil.ustawPochodzenie(p.pochodzenie);
            profil.ustawDoPotwierdzenia([]);
            profil.ustawPlany([]);
            router.push('/sytuacja');
          }}
        >
          Dalej: Moja sytuacja
        </Przycisk>
      </div>
    </section>
  );
}
