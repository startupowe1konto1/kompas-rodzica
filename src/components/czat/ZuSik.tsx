'use client';

/**
 * ZuSik – czat „Zapytaj o swój plan” (funkcja z AI). Okrągły przycisk z robocikiem w prawym dolnym rogu
 * każdej strony dla rodzica (poza panelem admina); panel rozmowy (telefon: cały ekran, komputer: panel w rogu).
 * Bez wypełnionej ankiety ZuSik opowiada o aplikacji i odsyła do ankiety. Ukryty tylko wtedy, gdy serwer
 * nie ma klucza API (GET /api/chat → dostepny: false).
 */
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { IconRobot, IconSend, IconX } from '@tabler/icons-react';
import type { OdpowiedzCzatu, Plan, Rodzina } from '../../engine/types';
import { ZAPYTAJ_ZUS } from '../../content/linki';
import { api, BladApi } from '../../lib/api';
import { useProfil } from '../../state/profil';
import { formatujOkres } from '../format';
import { NAZWY_TYPOW } from '../os-czasu/teksty';
import { Przycisk } from '../ui/Przycisk';
import { polacz } from '../ui/klasy';
import { etykietaOsoby } from '../wynik/etykiety';
import { czyPokazacZusika, historiaDoWyslania, zmianyPlanu } from './logika';

const PYTANIA_BEZ_PROFILU = [
  'Co sprawdzę w tej aplikacji?',
  'Jak zacząć?',
  'Ile dostanę zasiłku macierzyńskiego?',
];

const PYTANIA_NA_START = [
  'Dlaczego mam tyle tygodni urlopu?',
  'Ile dostanę i za jaki okres?',
  'Co jeśli tata weźmie część urlopu rodzicielskiego?',
  'Jakie dokumenty muszę złożyć i do kiedy?',
];

type Wiadomosc =
  | { id: number; od: 'rodzic'; tekst: string }
  | { id: number; od: 'zusik'; tekst: string; odpowiedz?: OdpowiedzCzatu; blad?: boolean; planPrzed?: Plan };

export function ZuSik() {
  const sciezka = usePathname();
  const { gotowy, rodzina, wybranyPlan } = useProfil();
  const [dostepny, setDostepny] = useState(false);
  const [otwarty, setOtwarty] = useState(false);

  useEffect(() => {
    let aktywny = true;
    api
      .czatDostepny()
      .then((d) => aktywny && setDostepny(d.dostepny))
      .catch(() => aktywny && setDostepny(false));
    return () => {
      aktywny = false;
    };
  }, []);

  if (!dostepny || !gotowy || !czyPokazacZusika(sciezka)) return null;

  return (
    <>
      {!otwarty && (
        <button
          type="button"
          onClick={() => setOtwarty(true)}
          aria-label="Otwórz ZuSika – zapytaj o swój plan"
          title="ZuSik – zapytaj o swój plan"
          className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex size-16 items-center justify-center rounded-full border-[3px] border-zielen bg-white text-zielen shadow-[0_4px_16px_rgb(16_24_40/0.35)] transition-colors duration-150 hover:bg-szary-kafel sm:right-6 sm:bottom-6"
        >
          <IconRobot size={32} stroke={1.75} aria-hidden />
        </button>
      )}
      {otwarty && <Panel rodzina={rodzina} plan={rodzina ? wybranyPlan : null} zamknij={() => setOtwarty(false)} />}
    </>
  );
}

function Panel({ rodzina, plan, zamknij }: { rodzina: Rodzina | null; plan: Plan | null; zamknij: () => void }) {
  const { aktualizujPlan } = useProfil();
  const [wiadomosci, setWiadomosci] = useState<Wiadomosc[]>([]);
  const [tekst, setTekst] = useState('');
  const [czeka, setCzeka] = useState(false);
  const [zastosowane, setZastosowane] = useState<Set<number>>(new Set());
  const licznik = useRef(0);
  const pole = useRef<HTMLTextAreaElement>(null);
  const koniec = useRef<HTMLDivElement>(null);
  const tytulId = useId();

  useEffect(() => {
    pole.current?.focus();
    const naKlawisz = (e: KeyboardEvent) => e.key === 'Escape' && zamknij();
    window.addEventListener('keydown', naKlawisz);
    return () => window.removeEventListener('keydown', naKlawisz);
  }, [zamknij]);

  useEffect(() => {
    koniec.current?.scrollIntoView({ block: 'end' });
  }, [wiadomosci, czeka]);

  async function zapytaj(pytanie: string) {
    const p = pytanie.trim();
    if (!p || czeka) return;
    const historia = historiaDoWyslania(
      wiadomosci.flatMap((w, i) => {
        const nast = wiadomosci[i + 1];
        return w.od === 'rodzic' && nast?.od === 'zusik' && !nast.blad ? [{ pytanie: w.tekst, odpowiedz: nast.tekst }] : [];
      }),
    );
    setWiadomosci((ws) => [...ws, { id: ++licznik.current, od: 'rodzic', tekst: p }]);
    setTekst('');
    setCzeka(true);
    try {
      const odp = await api.czat({ rodzina, plan, pytanie: p, historia });
      setWiadomosci((ws) => [
        ...ws,
        { id: ++licznik.current, od: 'zusik', tekst: odp.odpowiedz, odpowiedz: odp, ...(plan ? { planPrzed: plan } : {}) },
      ]);
    } catch (e) {
      const tresc = e instanceof BladApi ? e.message : 'Nie udało się połączyć z ZuSikiem. Proszę spróbować za chwilę.';
      setWiadomosci((ws) => [...ws, { id: ++licznik.current, od: 'zusik', tekst: tresc, blad: true }]);
    } finally {
      setCzeka(false);
      pole.current?.focus();
    }
  }

  function wyslij(e: FormEvent) {
    e.preventDefault();
    void zapytaj(tekst);
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={tytulId}
      className="fixed inset-0 z-50 flex h-dvh flex-col bg-white sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(42rem,calc(100dvh-3rem))] sm:w-[26rem] sm:overflow-hidden sm:rounded-karta sm:border sm:border-szary-linia sm:shadow-kafel"
    >
      <header className="flex items-center gap-3 bg-zielen px-4 py-3 text-white">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <IconRobot size={26} stroke={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={tytulId} className="text-lg leading-tight font-black">
            ZuSik
          </h2>
          <p className="text-sm leading-tight">Asystent AI · pytania o plan</p>
        </div>
        <button
          type="button"
          onClick={zamknij}
          aria-label="Zamknij ZuSika"
          className="flex size-11 items-center justify-center rounded-przycisk hover:bg-zielen-ciemna"
        >
          <IconX size={24} stroke={2} aria-hidden />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        <Dymek od="zusik">
          {plan
            ? 'Dzień dobry! Jestem ZuSik. Chętnie wyjaśnię wynik i plan z tej aplikacji: co przysługuje, ile wyniesie zasiłek i co się zmieni, gdy coś w planie się przesunie.'
            : 'Dzień dobry! Jestem ZuSik. Chętnie opowiem, co można sprawdzić w tej aplikacji. Po wypełnieniu ankiety wyjaśnię wynik, kwoty i plan.'}{' '}
          Proszę nie podawać mi numeru PESEL ani innych danych osobowych.
        </Dymek>
        {wiadomosci.length === 0 && (
          <ul className="flex flex-col items-start gap-2" aria-label="Przykładowe pytania">
            {(plan ? PYTANIA_NA_START : PYTANIA_BEZ_PROFILU).map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => void zapytaj(p)}
                  className="min-h-11 rounded-przycisk border-2 border-zielen bg-white px-3 py-2 text-left text-sm font-bold text-zielen hover:bg-szary-kafel"
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        )}
        {wiadomosci.map((w) =>
          w.od === 'rodzic' ? (
            <Dymek key={w.id} od="rodzic">
              {w.tekst}
            </Dymek>
          ) : (
            <div key={w.id} className="space-y-2">
              <Dymek od="zusik" blad={w.blad}>
                {w.tekst}
              </Dymek>
              {w.odpowiedz && w.odpowiedz.zrodla.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Przepisy">
                  {w.odpowiedz.zrodla.map((z) => (
                    <li key={z} className="rounded-full border border-granat px-2.5 py-0.5 text-sm text-granat">
                      {z}
                    </li>
                  ))}
                </ul>
              )}
              {w.odpowiedz?.propozycja && w.planPrzed && rodzina && (
                <KartaPropozycji
                  rodzina={rodzina}
                  przed={w.planPrzed}
                  odpowiedz={w.odpowiedz}
                  zastosowana={zastosowane.has(w.id)}
                  zastosuj={() => {
                    aktualizujPlan(w.odpowiedz!.propozycja!.plan);
                    setZastosowane((s) => new Set(s).add(w.id));
                  }}
                />
              )}
              {w.odpowiedz?.zapytajZus && <KartaZapytajZus />}
            </div>
          ),
        )}
        {czeka && (
          <p className="text-sm text-tekst-drugi" role="status">
            ZuSik pisze…
          </p>
        )}
        <div ref={koniec} />
      </div>

      <form onSubmit={wyslij} className="border-t border-szary-linia px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <label htmlFor="zusik-pytanie" className="sr-only">
          Pytanie do ZuSika
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="zusik-pytanie"
            ref={pole}
            rows={2}
            maxLength={500}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void zapytaj(tekst);
              }
            }}
            placeholder="Proszę wpisać pytanie…"
            className="min-h-12 flex-1 resize-none rounded-przycisk border border-szary-ramka px-3 py-2 text-base"
          />
          <button
            type="submit"
            disabled={czeka || !tekst.trim()}
            aria-label="Wyślij pytanie"
            className="flex size-12 shrink-0 items-center justify-center rounded-przycisk bg-zielen text-white hover:bg-zielen-ciemna disabled:cursor-not-allowed disabled:bg-szary-kafel disabled:text-tekst-drugi"
          >
            <IconSend size={22} stroke={2} aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}

function Dymek({ od, blad, children }: { od: 'rodzic' | 'zusik'; blad?: boolean; children: React.ReactNode }) {
  return (
    <p
      className={polacz(
        'max-w-[85%] rounded-komunikat px-3.5 py-2.5 whitespace-pre-line',
        od === 'rodzic' ? 'ml-auto bg-granat text-white' : 'bg-szary-kafel text-tekst',
        blad && 'border-2 border-blad',
      )}
    >
      <span className="sr-only">{od === 'rodzic' ? 'Pytanie: ' : 'ZuSik: '}</span>
      {children}
    </p>
  );
}

function KartaPropozycji({
  rodzina,
  przed,
  odpowiedz,
  zastosowana,
  zastosuj,
}: {
  rodzina: Rodzina;
  przed: Plan;
  odpowiedz: OdpowiedzCzatu;
  zastosowana: boolean;
  zastosuj: () => void;
}) {
  const p = odpowiedz.propozycja!;
  const zmiany = zmianyPlanu(przed, p.plan);
  const bledy = p.walidacja.bledy;
  return (
    <div className="space-y-3 rounded-karta border border-szary-linia bg-white p-4">
      <h3 className="font-bold text-granat">Sprawdzona zmiana planu</h3>
      <p className="text-sm text-tekst-drugi">Plan pozostaje bez zmian do kliknięcia „Zastosuj”.</p>
      {zmiany.length > 0 && (
        <ul className="space-y-1 text-sm">
          {zmiany.map((z) => (
            <li key={`${z.rodzaj}-${z.odcinek.id}`}>
              <span className="font-bold">
                {z.rodzaj === 'nowy' ? 'Nowy: ' : z.rodzaj === 'usuniety' ? 'Usunięty: ' : 'Zmieniony: '}
              </span>
              {NAZWY_TYPOW[z.odcinek.typ]}, {etykietaOsoby(rodzina, z.odcinek.osobaId)},{' '}
              {formatujOkres(z.odcinek.od, z.odcinek.do, { krotko: true })}
            </li>
          ))}
        </ul>
      )}
      {bledy.length > 0 && (
        <ul className="space-y-2">
          {bledy.map((b) => (
            <li key={b.kod} className="rounded-komunikat bg-blad px-3 py-2 text-sm text-white">
              {b.tresc}
              {b.przepis && <span className="block">{b.przepis}</span>}
            </li>
          ))}
        </ul>
      )}
      {zastosowana ? (
        <p className="text-sm font-bold text-sukces" role="status">
          Zastosowano. Plan jest zaktualizowany.
        </p>
      ) : bledy.length > 0 ? (
        <p className="text-sm">Tej zmiany nie da się zastosować, bo plan miałby błędy.</p>
      ) : (
        <Przycisk wariant="glowny" pelnaSzerokosc onClick={zastosuj}>
          Zastosuj w moim planie
        </Przycisk>
      )}
    </div>
  );
}

function KartaZapytajZus() {
  const kanaly = ZAPYTAJ_ZUS.kanaly.filter((k) => k.rodzaj === 'email' || k.rodzaj === 'telefon' || k.rodzaj === 'ezus').slice(0, 3);
  return (
    <div className="space-y-2 rounded-karta border-2 border-info bg-white p-4">
      <h3 className="font-bold text-info">{ZAPYTAJ_ZUS.tytul}</h3>
      <ul className="space-y-2 text-sm">
        {kanaly.map((k) => (
          <li key={k.href}>
            <a href={k.href} className="font-bold text-zielen underline" {...(k.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {k.rodzaj === 'ezus' ? k.nazwa : k.wartosc}
            </a>
            <span className="block text-tekst-drugi">
              {k.rodzaj === 'ezus' ? k.opis : k.nazwa}
              {k.godziny ? ` (${k.godziny})` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
