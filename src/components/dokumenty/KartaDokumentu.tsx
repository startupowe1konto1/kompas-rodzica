'use client';

import { useState } from 'react';
import { IconCircleCheck, IconFileDownload, IconSend } from '@tabler/icons-react';
import type { Dokument, Plan, Rodzina } from '../../engine/types';
import { pobierzWniosek } from '../../state/formularze';
import { funkcjaNiegotowa, komunikatBledu } from '../../state/zapytanie';
import { etykietaKtoSklada } from '../wynik/etykiety';
import { formatujDate } from '../format';
import { Data, Karta, Przycisk, Rozwijane } from '../ui';
import { NAZWA_URLOPU, type OpisCzesci } from './czesci';
import { tekstyWysylki } from './wysylka';

const GDZIE: Record<Dokument['gdzie'], string> = {
  pracodawca: 'Pracodawca',
  platnik: 'Płatnik',
  ZUS: 'ZUS',
};

type StanPdf =
  | { stan: 'wolny' }
  | { stan: 'laduje' }
  | { stan: 'niegotowe' }
  | { stan: 'blad'; komunikat: string }
  | { stan: 'gotowe'; doUzupelnienia: string[] };

export interface KartaDokumentuProps {
  dokument: Dokument;
  rodzina: Rodzina;
  plan: Plan | null;
  /** Gdy plan dzieli urlop na części: która to część i jakiego okresu dotyczy. */
  czesc?: OpisCzesci;
}

/** Jeden dokument: co, kto składa, gdzie, kiedy, załączniki; przy `moznaWygenerowac` także PDF i wysyłka do adresata (symulacja). */
export function KartaDokumentu({ dokument: d, rodzina, plan, czesc }: KartaDokumentuProps) {
  const [pdf, ustawPdf] = useState<StanPdf>({ stan: 'wolny' });
  const [zlozono, ustawZlozono] = useState(false);
  const platnik = d.ktoSklada === 'platnik';
  const wysylka = tekstyWysylki(d.gdzie);
  const akcje = d.moznaWygenerowac && !platnik;

  async function pobierz() {
    if (!plan) return;
    ustawPdf({ stan: 'laduje' });
    try {
      const { pdf: plik, doUzupelnienia } = await pobierzWniosek(d.kod, {
        rodzina,
        plan,
        osobaId: d.ktoSklada,
        odcinekId: d.odcinekId,
      });
      const adres = URL.createObjectURL(plik);
      const a = document.createElement('a');
      a.href = adres;
      a.download = `${d.kod}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(adres), 10_000);
      ustawPdf({ stan: 'gotowe', doUzupelnienia });
    } catch (e) {
      const blad = komunikatBledu(e);
      ustawPdf(funkcjaNiegotowa(blad) ? { stan: 'niegotowe' } : { stan: 'blad', komunikat: blad.komunikat });
    }
  }

  return (
    <Karta jako="li" obramowanie data-kod={d.kod} data-status={d.status} data-czesc={czesc?.nr} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="min-w-0 text-lg font-bold text-granat lg:text-xl">
          {czesc ? `${NAZWA_URLOPU[d.kod] ?? d.nazwa} – część ${czesc.nr}` : d.nazwa}
        </h3>
        {czesc && (
          <p className="text-tekst-drugi">
            od {formatujDate(czesc.od)} do {formatujDate(czesc.do)}
          </p>
        )}
        <p className="font-bold">
          {d.termin ? (
            <>
              Do kiedy: <Data iso={d.termin} />
            </>
          ) : (
            'Bez terminu'
          )}
        </p>
      </div>

      {platnik && (
        <p data-opis="platnik" className="max-w-prose leading-normal">
          To zaświadczenie wystawia płatnik i przekazuje je do ZUS. W kadrach można zapytać, czy już je wysłał.
        </p>
      )}
      {d.kod === 'zalacznik' && (
        <div data-opis="zalacznik" className="max-w-prose leading-normal">
          <p>Zasiłek wypłaca pracodawca. Należy mu przekazać:</p>
          <ul className="mt-1 list-disc pl-5">
            {d.zalaczniki.map((z) => (
              <li key={z}>{z}</li>
            ))}
          </ul>
        </div>
      )}

      {akcje && !zlozono && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {pdf.stan === 'niegotowe' ? (
            <p data-stan="niegotowe" className="max-w-prose text-tekst-drugi">
              Pobieranie wypełnionego wniosku jest w przygotowaniu.
            </p>
          ) : (
            <Przycisk
              // Ten sam wygląd w każdej karcie (uwaga Wojtka 22.11: dwa kolory tego samego przycisku myliły).
              wariant="drugi"
              ikona={<IconFileDownload size={20} />}
              laduje={pdf.stan === 'laduje'}
              disabled={!plan}
              onClick={pobierz}
              pelnaSzerokosc
              className="sm:w-auto"
            >
              Pobierz wniosek do wydruku
            </Przycisk>
          )}
          <Przycisk wariant="drugi" ikona={<IconSend size={20} />} onClick={() => ustawZlozono(true)} pelnaSzerokosc className="sm:w-auto">
            {wysylka.przycisk}
          </Przycisk>
        </div>
      )}

      {akcje && pdf.stan === 'blad' && (
        <p role="alert" className="max-w-prose text-tekst-drugi">
          {pdf.komunikat}
        </p>
      )}

      {akcje && pdf.stan === 'gotowe' && (
        <div role="status" className="flex flex-col gap-2 rounded-komunikat bg-szary-kafel p-4">
          <p className="font-bold text-granat">Wniosek został pobrany.</p>
          {pdf.doUzupelnienia.length > 0 ? (
            <div data-do-uzupelnienia>
              <p className="text-base">Przed złożeniem trzeba uzupełnić:</p>
              <ul className="mt-1 list-disc pl-5 leading-normal">
                {pdf.doUzupelnienia.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-tekst-drugi">Nie zostało nic do uzupełnienia ręcznie.</p>
          )}
        </div>
      )}

      <Rozwijane tytul="Szczegóły">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-base">
          <div>
            <dt className="text-sm text-tekst-drugi">Kto składa</dt>
            <dd className="font-bold">{etykietaKtoSklada(rodzina, d.ktoSklada)}</dd>
          </div>
          <div>
            <dt className="text-sm text-tekst-drugi">Gdzie</dt>
            <dd className="font-bold">{GDZIE[d.gdzie]}</dd>
          </div>
          <div>
            <dt className="text-sm text-tekst-drugi">Od kiedy</dt>
            <dd className="font-bold">{d.odKiedy ? <Data iso={d.odKiedy} /> : 'Już teraz'}</dd>
          </div>
        </dl>
        {d.kod !== 'zalacznik' && d.zalaczniki.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-tekst-drugi">Załączniki</p>
            <ul className="mt-1 list-disc pl-5 leading-normal">
              {d.zalaczniki.map((z) => (
                <li key={z}>{z}</li>
              ))}
            </ul>
          </div>
        )}
        {d.przepis && <p className="mt-3 text-sm text-tekst-drugi">Podstawa: {d.przepis}</p>}
      </Rozwijane>

      {zlozono && (
        <div
          data-stan="zlozono-symulacja"
          role="status"
          className="flex gap-3 rounded-komunikat bg-szary-kafel p-4"
        >
          <IconCircleCheck size={24} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-sukces" />
          <div className="flex flex-col gap-1">
            <p className="font-bold text-granat">{wysylka.naglowek}</p>
            <p className="max-w-prose leading-normal text-tekst-drugi">{wysylka.opis}</p>
          </div>
        </div>
      )}
    </Karta>
  );
}
