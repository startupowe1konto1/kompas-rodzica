'use client';

/**
 * „Dziecko się urodziło” (T2.8): przycisk → pole z faktyczną datą porodu → `planer.urodzilo(data)`.
 * Po sukcesie: komunikat o przesunięciu planu, karta z danymi dziecka z rejestru stanu cywilnego (symulacja)
 * i karta z gotowym wnioskiem do potwierdzenia. Przycisk jest tylko przy przewidywanym porodzie;
 * po sukcesie komponent zostaje na ekranie dzięki własnemu stanem `po`, bo `przewidywana` zmienia się na false.
 */
import { useState } from 'react';
import { IconBabyCarriage, IconCircleCheck, IconFileDownload } from '@tabler/icons-react';
import type { DataISO, OdpowiedzZrodla, Rodzina } from '../../engine/types';
import { api, BladApi } from '../../lib/api';
import { pobierzWniosek } from '../../state/formularze';
import { useZapytanie } from '../../state/useZapytanie';
import { funkcjaNiegotowa, komunikatBledu } from '../../state/zapytanie';
import { Data, Karta, Pole, Przycisk, StanLadowania } from '../ui';
import { KLASY_H3 } from '../ui/klasy';
import { bladDatyPorodu, type KodBleduPorodu } from './porod';
import type { Planer } from './usePlaner';

const KOMUNIKATY_BLEDU: Record<KodBleduPorodu, string> = {
  WYMAGANE: 'Proszę wpisać datę, w której urodziło się dziecko.',
  ZLA_DATA: 'Ta data wygląda nieprawidłowo. Proszę wpisać ją w formacie rok-miesiąc-dzień.',
  DATA_W_PRZYSZLOSCI: 'Ta data jest jeszcze przed nami. Proszę wpisać datę, która już minęła.',
  DATA_ZA_WCZESNIE: 'Ta data jest dużo wcześniejsza niż przewidywany poród. Proszę sprawdzić, czy nie ma w niej pomyłki.',
};

export function DzieckoSieUrodzilo({ planer }: { planer: Planer }) {
  const { rodzina } = planer;
  const [otwarte, setOtwarte] = useState(false);
  const [data, setData] = useState('');
  const [kodBledu, setKodBledu] = useState<KodBleduPorodu | null>(null);
  const [po, setPo] = useState<DataISO | null>(null);

  if (!rodzina) return null;
  const z = rodzina.zdarzenie;
  if (z.typ !== 'porod') return null;
  if (po !== null) return <PoPorodzie planer={planer} rodzina={rodzina} data={po} />;
  if (!z.przewidywana) return null;

  async function przelicz(e: React.FormEvent) {
    e.preventDefault();
    if (!rodzina) return;
    const kod = bladDatyPorodu(data, rodzina);
    setKodBledu(kod);
    if (kod) return;
    if (await planer.urodzilo(data)) setPo(data);
  }

  if (!otwarte) {
    return (
      <div data-slot="dziecko-sie-urodzilo">
        <Przycisk wariant="drugi" ikona={<IconBabyCarriage size={22} />} pelnaSzerokosc className="sm:w-auto" onClick={() => setOtwarte(true)}>
          Dziecko się urodziło
        </Przycisk>
      </div>
    );
  }

  return (
    <Karta jako="section" aria-labelledby="porod-naglowek" data-slot="dziecko-sie-urodzilo">
      <form onSubmit={przelicz} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="porod-naglowek" className={`${KLASY_H3} text-granat`}>
            Dziecko się urodziło
          </h2>
          <p className="max-w-prose text-tekst-drugi">Proszę podać, kiedy to się stało. Przeliczymy plan, terminy i kwoty od tej daty.</p>
        </div>
        <div data-kod-bledu={kodBledu ?? undefined} className="max-w-xs">
          <Pole
            etykieta="Data porodu"
            typ="date"
            value={data}
            max={rodzina.dataAnalizy}
            onChange={(e) => setData(e.target.value)}
            blad={kodBledu ? KOMUNIKATY_BLEDU[kodBledu] : undefined}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Przycisk type="submit" laduje={planer.zajety} etykietaLadowania="Przeliczamy plan" className="sm:w-auto">
            Przelicz plan
          </Przycisk>
          <Przycisk wariant="drugi" disabled={planer.zajety} onClick={() => setOtwarte(false)} className="sm:w-auto">
            Anuluj
          </Przycisk>
        </div>
      </form>
    </Karta>
  );
}

// ───────────────────────── Po sukcesie ─────────────────────────

function PoPorodzie({ planer, rodzina, data }: { planer: Planer; rodzina: Rodzina; data: DataISO }) {
  return (
    <section data-slot="dziecko-sie-urodzilo" aria-label="Dziecko się urodziło" className="flex flex-col gap-4">
      <p role="status" className="flex items-start gap-2 rounded-komunikat bg-white p-4 font-bold text-sukces lg:p-6">
        <IconCircleCheck size={24} aria-hidden className="mt-0.5 shrink-0" />
        <span>
          Plan, terminy i kwoty liczymy od <Data iso={data} />
        </span>
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <KartaRejestru rodzina={rodzina} data={data} />
        <KartaWniosku planer={planer} rodzina={rodzina} />
      </div>
    </section>
  );
}

/** Osoba, której dane ma pobrać rejestr: matka, a gdy jej nie ma – pierwsza osoba. */
function osobaWniosku(rodzina: Rodzina) {
  return rodzina.osoby.find((o) => o.rola === 'matka') ?? rodzina.osoby[0];
}

function KartaRejestru({ rodzina, data }: { rodzina: Rodzina; data: DataISO }) {
  const pesel = rodzina.osoby[0]?.dane?.pesel;
  const w = useZapytanie<OdpowiedzZrodla>(`rsc:${pesel ?? 'brak'}:${data}`, async () => {
    // Profil nie zapamiętuje persony, więc ją odnajdujemy po PESEL pierwszej osoby.
    const persona = (await api.persony()).find((p) => pesel && p.rodzina.osoby[0]?.dane?.pesel === pesel);
    if (!persona) throw new BladApi('Brak persony', 404);
    return api.zrodlo('rsc', persona.id);
  });

  return (
    <Karta jako="section" aria-labelledby="rejestr-naglowek" data-karta="rejestr" data-stan={w.blad && funkcjaNiegotowa(w.blad) ? 'niegotowe' : undefined}>
      <h3 id="rejestr-naglowek" className={`${KLASY_H3} text-granat`}>
        Dane dziecka z rejestru stanu cywilnego (symulacja)
      </h3>
      {w.laduje ? (
        <StanLadowania etykieta="Pobieramy dane dziecka z rejestru…" kafel={false} wiersze={2} className="mt-3 p-0 lg:p-0" />
      ) : w.blad ? (
        <p className="mt-2 max-w-prose text-tekst-drugi">
          {funkcjaNiegotowa(w.blad) ? 'Pobieranie danych dziecka z rejestru jest w przygotowaniu.' : w.blad.komunikat}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2 text-tekst">
          <p>
            Data urodzenia dziecka: <Data iso={data} className="font-bold" />
          </p>
          {w.dane && w.dane.brakuje.length > 0 && (
            <p className="max-w-prose text-sm text-tekst-drugi">Dane, których rejestr nie ma, trzeba uzupełnić samodzielnie: {w.dane.brakuje.join('; ').toLowerCase()}.</p>
          )}
        </div>
      )}
    </Karta>
  );
}

function KartaWniosku({ planer, rodzina }: { planer: Planer; rodzina: Rodzina }) {
  const [stan, ustaw] = useState<{ stan: 'wolny' | 'laduje' | 'niegotowe' } | { stan: 'blad'; komunikat: string } | { stan: 'gotowe'; doUzupelnienia: string[] }>({ stan: 'wolny' });

  async function pobierz() {
    const osoba = osobaWniosku(rodzina);
    if (!planer.plan || !osoba) return;
    ustaw({ stan: 'laduje' });
    try {
      const { pdf, doUzupelnienia } = await pobierzWniosek('ZAM', { rodzina, plan: planer.plan, osobaId: osoba.id });
      const adres = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = adres;
      a.download = 'ZAM.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(adres), 10_000);
      ustaw({ stan: 'gotowe', doUzupelnienia });
    } catch (e) {
      const blad = komunikatBledu(e);
      ustaw(funkcjaNiegotowa(blad) ? { stan: 'niegotowe' } : { stan: 'blad', komunikat: blad.komunikat });
    }
  }

  return (
    <Karta jako="section" aria-labelledby="wniosek-naglowek" data-karta="wniosek">
      <h3 id="wniosek-naglowek" className={`${KLASY_H3} text-granat`}>
        Gotowy wniosek do potwierdzenia
      </h3>
      <p className="mt-2 max-w-prose text-tekst-drugi">Przygotowaliśmy wniosek o zasiłek macierzyński z wpisanych danych i nowej daty porodu. Proszę go sprawdzić i potwierdzić.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {stan.stan === 'niegotowe' ? (
          <p data-stan="niegotowe" className="text-tekst-drugi">
            Pobieranie wypełnionego wniosku jest w przygotowaniu.
          </p>
        ) : (
          <Przycisk ikona={<IconFileDownload size={20} />} laduje={stan.stan === 'laduje'} onClick={pobierz} className="sm:w-auto">
            Pobierz wniosek do wydruku
          </Przycisk>
        )}
        <Przycisk href="/dokumenty" wariant="drugi" className="sm:w-auto">
          Zobacz wszystkie dokumenty
        </Przycisk>
      </div>
      {stan.stan === 'blad' && (
        <p role="alert" className="mt-3 text-sm text-tekst-drugi">
          {stan.komunikat}
        </p>
      )}
      {stan.stan === 'gotowe' && stan.doUzupelnienia.length > 0 && (
        <p className="mt-3 max-w-prose text-sm text-tekst-drugi">Do uzupełnienia ręcznie: {stan.doUzupelnienia.join(', ')}.</p>
      )}
    </Karta>
  );
}
