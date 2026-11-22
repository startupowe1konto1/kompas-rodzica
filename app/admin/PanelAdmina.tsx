'use client';

// Panel administratora: przegląd i edycja wersji parametrów z przepisów (stawki, wymiary, limity, terminy, kwoty, podatek).
// Hasło żyje tylko w stanie tego komponentu.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, BladApi } from '@/src/lib/api';
import type { Parametry } from '@/src/engine/types';
import { komunikatPoZapisie, pobierzStatusyAktow, przywrocDomyslneParametry, zapiszParametry } from './apiAdmina';
import type { OdpowiedzZapisu } from './apiAdmina';
import { OPISY_PARAMETROW } from './opisyParametrow';
import { GRUPY, kopiaZNowaData, polaWersji, przepisDla, ustawWartosc } from './sciezki';
import type { Grupa } from './sciezki';
import PodstawaPrawna from './PodstawaPrawna';
import type { StatusAktu } from '@/src/server/eli';

const NAZWY_GRUP: Record<Grupa, string> = {
  stawkiProc: 'Stawki zasiłków (% podstawy)',
  wymiaryTyg: 'Wymiary urlopów i okresy (tygodnie)',
  limity: 'Limity i progi',
  terminyDni: 'Terminy (dni)',
  kwoty: 'Kwoty i składki',
  podatek: 'Podatek',
};

const FOKUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-300';
const PRZYCISK =
  `inline-flex min-h-11 items-center justify-center rounded border px-4 py-2 text-sm font-medium disabled:opacity-60 ${FOKUS}`;
const PRZYCISK_GLOWNY = `${PRZYCISK} border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900`;
const PRZYCISK_DRUGI = `${PRZYCISK} border-neutral-500 bg-background text-foreground dark:border-neutral-500`;
const POLE = `min-h-11 w-full rounded border border-neutral-500 bg-background px-3 py-2 text-foreground dark:border-neutral-500 ${FOKUS}`;
const TEKST_POMOCNICZY = 'text-neutral-700 dark:text-neutral-300';

type Komunikat = { rodzaj: 'ok' | 'blad' | 'ostrzezenie'; tekst: string };

function sortuj(wersje: Parametry[]): Parametry[] {
  return [...wersje].sort((a, b) => a.obowiazujeOd.localeCompare(b.obowiazujeOd));
}

function opisBledu(e: unknown): string {
  if (e instanceof BladApi) {
    if (e.status === 401) return 'Nieprawidłowe hasło.';
    return e.message;
  }
  return 'Nieznany błąd. Spróbuj ponownie.';
}

const KLASY_KOMUNIKATU: Record<Komunikat['rodzaj'], string> = {
  ok: 'border-green-700 bg-green-50 text-green-950 dark:border-green-500 dark:bg-green-950 dark:text-green-50',
  blad: 'border-red-700 bg-red-50 text-red-950 dark:border-red-400 dark:bg-red-950 dark:text-red-50',
  ostrzezenie: 'border-amber-700 bg-amber-50 text-amber-950 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-50',
};

function PoleLiczbowe(props: {
  id: string;
  wartosc: number;
  opisId: string;
  onZmien: (wartosc: number) => void;
}) {
  const { id, wartosc, opisId, onZmien } = props;
  const [tekst, setTekst] = useState(String(wartosc));
  const poprawna = tekst.trim() !== '' && Number.isFinite(Number(tekst));

  // Wartość zmieniona z zewnątrz (np. przywrócenie domyślnych): pokaż ją w polu.
  const [poprzednia, setPoprzednia] = useState(wartosc);
  if (poprzednia !== wartosc) {
    setPoprzednia(wartosc);
    if (tekst.trim() === '' || Number(tekst) !== wartosc) setTekst(String(wartosc));
  }

  return (
    <input
      id={id}
      type="number"
      step="any"
      inputMode="decimal"
      value={tekst}
      aria-describedby={opisId}
      aria-invalid={!poprawna}
      className={`${POLE} ${poprawna ? '' : 'border-red-700 dark:border-red-400'}`}
      onChange={(e) => {
        setTekst(e.target.value);
        const liczba = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(liczba)) onZmien(liczba);
      }}
      onBlur={() => {
        if (!poprawna) setTekst(String(wartosc));
      }}
    />
  );
}

export default function PanelAdmina() {
  const [wersje, setWersje] = useState<Parametry[] | null>(null);
  const [zapisane, setZapisane] = useState<Parametry[] | null>(null);
  const [bladOdczytu, setBladOdczytu] = useState<string | null>(null);
  const [wybrana, setWybrana] = useState<string>('');
  const [haslo, setHaslo] = useState('');
  const [nowaData, setNowaData] = useState('');
  const [komunikatWersji, setKomunikatWersji] = useState<string | null>(null);
  const [komunikat, setKomunikat] = useState<Komunikat | null>(null);
  const [trwa, setTrwa] = useState(false);
  const [statusyAktow, setStatusyAktow] = useState<StatusAktu[] | null>(null);
  const [potwierdzReset, setPotwierdzReset] = useState(false);
  const hasloRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  const przyjmij = useCallback((nowe: Parametry[], wybor?: string) => {
    const posortowane = sortuj(nowe);
    setWersje(posortowane);
    setZapisane(posortowane);
    setWybrana((biezaca) => {
      const kandydat = wybor ?? biezaca;
      return posortowane.some((w) => w.obowiazujeOd === kandydat)
        ? kandydat
        : (posortowane[posortowane.length - 1]?.obowiazujeOd ?? '');
    });
  }, []);

  const wczytaj = useCallback(() => {
    api
      .parametry()
      .then((w) => {
        przyjmij(w);
        setBladOdczytu(null);
      })
      .catch((e: unknown) => {
        setBladOdczytu(
          e instanceof BladApi && e.status > 0
            ? e.message
            : 'Nie udało się pobrać parametrów. Sprawdź połączenie z internetem.',
        );
      });
  }, [przyjmij]);

  useEffect(wczytaj, [wczytaj]);

  // Statusy aktów z API ELI Sejmu: raz przy wejściu, niezależnie od hasła. Brak odpowiedzi = same linki.
  useEffect(() => {
    let aktywny = true;
    void pobierzStatusyAktow().then((s) => {
      if (aktywny) setStatusyAktow(s);
    });
    return () => {
      aktywny = false;
    };
  }, []);

  // Po otwarciu potwierdzenia resetu fokus idzie na okno potwierdzenia.
  useEffect(() => {
    if (potwierdzReset) dialogRef.current?.focus();
  }, [potwierdzReset]);

  const wersja = wersje?.find((w) => w.obowiazujeOd === wybrana);
  const pola = useMemo(() => (wersja ? polaWersji(wersja) : []), [wersja]);
  const zmieniono = wersje !== null && JSON.stringify(wersje) !== JSON.stringify(zapisane);

  function zmienWartosc(sciezka: string, wartosc: number) {
    setWersje((biezace) =>
      biezace ? biezace.map((w) => (w.obowiazujeOd === wybrana ? ustawWartosc(w, sciezka, wartosc) : w)) : biezace,
    );
    setKomunikat(null);
  }

  function dodajWersje() {
    setKomunikatWersji(null);
    if (!wersje || !wersja) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nowaData) || Number.isNaN(Date.parse(nowaData))) {
      setKomunikatWersji('Wybierz poprawną datę.');
      return;
    }
    if (wersje.some((w) => w.obowiazujeOd === nowaData)) {
      setKomunikatWersji('Wersja z tą datą już istnieje. Wybierz inny dzień.');
      return;
    }
    setWersje(sortuj([...wersje, kopiaZNowaData(wersja, nowaData)]));
    setWybrana(nowaData);
    setKomunikatWersji(`Dodano wersję od ${nowaData} jako kopię wersji od ${wersja.obowiazujeOd}. Zmień wartości i zapisz.`);
    setNowaData('');
    setKomunikat(null);
  }

  async function wykonaj(akcja: (h: string) => Promise<OdpowiedzZapisu>, rodzajAkcji: 'zapis' | 'przywrocenie') {
    if (haslo === '') {
      setKomunikat({ rodzaj: 'blad', tekst: 'Podaj hasło administratora.' });
      hasloRef.current?.focus();
      return;
    }
    setTrwa(true);
    setKomunikat(null);
    try {
      const wynik = await akcja(haslo);
      przyjmij(wynik.wersje);
      setKomunikat(komunikatPoZapisie(rodzajAkcji, wynik.trwale));
    } catch (e) {
      setKomunikat({ rodzaj: 'blad', tekst: opisBledu(e) });
      if (e instanceof BladApi && e.status === 401) hasloRef.current?.focus();
    } finally {
      setTrwa(false);
    }
  }

  function zapisz() {
    if (!wersje) return;
    const doZapisu = wersje;
    void wykonaj((h) => zapiszParametry(h, doZapisu), 'zapis');
  }

  function przywroc() {
    setPotwierdzReset(false);
    void wykonaj(przywrocDomyslneParametry, 'przywrocenie');
  }

  const wstep = (
    <p className={`mt-2 text-sm ${TEKST_POMOCNICZY}`}>
      Zmiany wpływają na wyniki dla wszystkich użytkowników aplikacji.
    </p>
  );

  if (bladOdczytu) {
    return (
      <div className="mt-4">
        {wstep}
        <div role="alert" className={`mt-6 rounded border p-3 text-sm ${KLASY_KOMUNIKATU.blad}`}>
          {bladOdczytu}
        </div>
        <button
          type="button"
          className={`${PRZYCISK_DRUGI} mt-3`}
          onClick={() => {
            setBladOdczytu(null);
            wczytaj();
          }}
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (!wersje) {
    return (
      <div className="mt-4">
        {wstep}
        <p role="status" className={`mt-6 text-sm ${TEKST_POMOCNICZY}`}>
          Wczytuję parametry…
        </p>
      </div>
    );
  }

  if (wersje.length === 0 || !wersja) {
    return (
      <div className="mt-4">
        {wstep}
        <p role="status" className={`mt-6 text-sm ${TEKST_POMOCNICZY}`}>
          Brak zapisanych parametrów. Przywróć wartości domyślne, wpisując hasło poniżej.
        </p>
        {pasekZapisu()}
      </div>
    );
  }

  // Dolna część formularza: hasło, zapis i przywracanie domyślnych.
  function pasekZapisu() {
    return (
      <section aria-labelledby="zapis-naglowek" className="mt-10 border-t border-neutral-300 pt-6 dark:border-neutral-700">
        <h2 id="zapis-naglowek" className="text-lg font-semibold">
          Zapis
        </h2>
        <form onSubmit={(e) => e.preventDefault()} className="mt-3 max-w-sm">
          <label htmlFor="haslo-admina" className="block text-sm font-medium">
            Hasło administratora
          </label>
          <input
            id="haslo-admina"
            type="password"
            autoComplete="off"
            ref={hasloRef}
            value={haslo}
            onChange={(e) => setHaslo(e.target.value)}
            className={`${POLE} mt-1`}
          />
        </form>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={zapisz}
            disabled={trwa || wersje === null || wersje.length === 0}
            className={PRZYCISK_GLOWNY}
          >
            {trwa ? 'Zapisuję…' : 'Zapisz zmiany'}
          </button>
          <button
            type="button"
            ref={resetRef}
            disabled={trwa}
            className={PRZYCISK_DRUGI}
            onClick={() => setPotwierdzReset(true)}
          >
            Przywróć domyślne
          </button>
        </div>
        {potwierdzReset && (
          <div
            role="alertdialog"
            aria-labelledby="reset-pytanie"
            tabIndex={-1}
            ref={dialogRef}
            className="mt-4 rounded border border-amber-700 p-3 dark:border-amber-400">
            <p id="reset-pytanie" className="text-sm">
              Wszystkie wersje parametrów wrócą do wartości domyślnych, a Twoje zmiany zostaną utracone. Kontynuować?
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button type="button" className={PRZYCISK_GLOWNY} onClick={przywroc}>
                Tak, przywróć domyślne
              </button>
              <button type="button" className={PRZYCISK_DRUGI} onClick={() => {
                  setPotwierdzReset(false);
                  resetRef.current?.focus();
                }}
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
        <div role="status" aria-live="polite" className="mt-4 space-y-2">
          {zmieniono && <p className={`text-sm ${TEKST_POMOCNICZY}`}>Masz niezapisane zmiany.</p>}
          {komunikat && komunikat.rodzaj !== 'blad' && (
            <p className={`rounded border p-3 text-sm ${KLASY_KOMUNIKATU[komunikat.rodzaj]}`}>{komunikat.tekst}</p>
          )}
        </div>
        <div role="alert" className="mt-2">
          {komunikat && komunikat.rodzaj === 'blad' && (
            <p className={`rounded border p-3 text-sm ${KLASY_KOMUNIKATU.blad}`}>{komunikat.tekst}</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="mt-4">
      {wstep}

      <section aria-labelledby="wersje-naglowek" className="mt-6">
        <h2 id="wersje-naglowek" className="text-lg font-semibold">
          Wersje parametrów
        </h2>
        <p className={`mt-1 text-sm ${TEKST_POMOCNICZY}`}>
          Każda wersja obowiązuje od podanego dnia do dnia przed następną wersją.
        </p>
        <div className="mt-3 max-w-md">
          <label htmlFor="wersja-wybor" className="block text-sm font-medium">
            Wersja obowiązująca od
          </label>
          <select
            id="wersja-wybor"
            value={wybrana}
            onChange={(e) => setWybrana(e.target.value)}
            className={`${POLE} mt-1`}
          >
            {wersje.map((w) => (
              <option key={w.obowiazujeOd} value={w.obowiazujeOd}>
                {w.obowiazujeOd}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-sm">{wersja.opis}</p>
        <p className={`mt-1 text-sm ${TEKST_POMOCNICZY}`}>Źródło: {wersja.zrodlo}</p>

        <div className="mt-4 flex max-w-md flex-col gap-3">
          <div>
            <label htmlFor="nowa-data" className="block text-sm font-medium">
              Dodaj wersję od dnia
            </label>
            <input
              id="nowa-data"
              type="date"
              value={nowaData}
              onChange={(e) => setNowaData(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  dodajWersje();
                }
              }}
              aria-describedby="nowa-data-opis"
              className={`${POLE} mt-1`}
            />
            <p id="nowa-data-opis" className={`mt-1 text-sm ${TEKST_POMOCNICZY}`}>
              Utworzy kopię wersji od {wersja.obowiazujeOd} z nową datą. Wartości zmienisz poniżej.
            </p>
          </div>
          <button type="button" className={`${PRZYCISK_DRUGI} self-start`} onClick={dodajWersje}>
            Dodaj wersję
          </button>
          <div role="status" aria-live="polite" className="text-sm">
            {komunikatWersji}
          </div>
        </div>
      </section>

      {GRUPY.map((grupa) => {
        const polaGrupy = pola.filter((p) => p.grupa === grupa);
        if (polaGrupy.length === 0) return null;
        return (
          <fieldset key={grupa} className="mt-8 min-w-0 border-0 p-0">
            <legend className="text-lg font-semibold">{NAZWY_GRUP[grupa]}</legend>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {polaGrupy.map((pole) => {
                const opis = OPISY_PARAMETROW[pole.sciezka];
                const przepis = przepisDla(wersja, pole.sciezka);
                const id = `pole-${wybrana}-${pole.sciezka}`;
                return (
                  <div key={pole.sciezka} className="rounded border border-neutral-300 p-3 dark:border-neutral-700">
                    <label htmlFor={id} className="block text-sm font-medium">
                      {opis?.etykieta ?? pole.sciezka}
                    </label>
                    <div className="mt-2">
                      <PoleLiczbowe
                        key={id}
                        id={id}
                        wartosc={pole.wartosc}
                        opisId={`${id}-opis`}
                        onZmien={(w) => zmienWartosc(pole.sciezka, w)}
                      />
                    </div>
                    <div id={`${id}-opis`} className={`mt-2 text-sm ${TEKST_POMOCNICZY}`}>
                      {opis && <p>Czego dotyczy: {opis.dotyczy}</p>}
                      <PodstawaPrawna przepis={przepis} statusy={statusyAktow} />
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {pasekZapisu()}
    </div>
  );
}
