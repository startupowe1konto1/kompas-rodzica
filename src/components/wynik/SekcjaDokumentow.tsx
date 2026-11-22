import Link from 'next/link';
import { useState } from 'react';
import { IconFileDownload } from '@tabler/icons-react';
import type { Dokument, Plan, Rodzina, WynikDokumentow } from '../../engine/types';
import { useProfil } from '../../state/profil';
import { pobierzWniosek } from '../../state/formularze';
import { funkcjaNiegotowa, komunikatBledu } from '../../state/zapytanie';
import { Data, KomunikatTermin, Przycisk, ZnacznikStatusu, type TonStatusu } from '../ui';
import { grupujDokumenty } from './dokumenty';
import { etykietaKtoSklada } from './etykiety';

const GDZIE: Record<Dokument['gdzie'], string> = { pracodawca: 'u pracodawcy', platnik: 'u płatnika', ZUS: 'w ZUS' };

type StanPobierania = { stan: 'wolny' } | { stan: 'laduje' } | { stan: 'niegotowe' } | { stan: 'blad'; komunikat: string } | { stan: 'gotowe'; doUzupelnienia: string[] };

/** Pobranie wypełnionego wniosku (PDF z `POST /api/forms/{kod}`). Wniosków płatnika nie generujemy. */
/** „1 dokument”, „2 dokumenty”, „5 dokumentów”. */
export function liczbaDokumentow(n: number): string {
  const r10 = n % 10;
  const r100 = n % 100;
  if (n === 1) return `${n} dokument`;
  if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14)) return `${n} dokumenty`;
  return `${n} dokumentów`;
}

function PobierzWniosek({ dokument, rodzina, plan, wariant }: { dokument: Dokument; rodzina: Rodzina; plan: Plan | null; wariant: 'glowny' | 'na-bursztynie' | 'drugi' }) {
  const [s, ustaw] = useState<StanPobierania>({ stan: 'wolny' });
  if (dokument.ktoSklada === 'platnik') return <p className="text-sm text-tekst-drugi">Ten dokument wypełnia płatnik.</p>;
  if (!dokument.moznaWygenerowac || !plan) return null;

  async function pobierz() {
    ustaw({ stan: 'laduje' });
    try {
      const { pdf, doUzupelnienia } = await pobierzWniosek(dokument.kod, { rodzina, plan: plan as Plan, osobaId: dokument.ktoSklada, odcinekId: dokument.odcinekId });
      const adres = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = adres;
      a.download = `${dokument.kod}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(adres), 10_000);
      ustaw({ stan: 'gotowe', doUzupelnienia });
    } catch (e) {
      const blad = komunikatBledu(e);
      ustaw(funkcjaNiegotowa(blad) ? { stan: 'niegotowe' } : { stan: 'blad', komunikat: blad.komunikat });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {s.stan === 'niegotowe' ? (
        <p data-stan="niegotowe" className="text-sm text-tekst-drugi">
          Pobieranie wypełnionego wniosku jest w przygotowaniu.
        </p>
      ) : (
        <Przycisk wariant={wariant} ikona={<IconFileDownload size={20} />} laduje={s.stan === 'laduje'} onClick={pobierz}>
          Pobierz wniosek do wydruku
        </Przycisk>
      )}
      {s.stan === 'blad' && (
        <p role="alert" className="text-sm text-tekst-drugi">
          {s.komunikat}
        </p>
      )}
      {s.stan === 'gotowe' && s.doUzupelnienia.length > 0 && (
        <p className="max-w-prose text-sm text-tekst-drugi">Do uzupełnienia ręcznie: {s.doUzupelnienia.join(', ')}.</p>
      )}
    </div>
  );
}

function Pozycja({ d, rodzina, plan }: { d: Dokument; rodzina: Rodzina; plan: Plan | null }) {
  const kto = etykietaKtoSklada(rodzina, d.ktoSklada);
  const opis = `Składa: ${kto}, ${GDZIE[d.gdzie]}.`;
  const pdf = (wariant: 'glowny' | 'na-bursztynie' | 'drugi') => <PobierzWniosek dokument={d} rodzina={rodzina} plan={plan} wariant={wariant} />;
  if (d.status === 'teraz' && d.termin) {
    return (
      <li data-kod={d.kod} data-status={d.status}>
        <KomunikatTermin tytul={d.nazwa} data={d.termin} opis={opis} poziomNaglowka={4} akcja={d.ktoSklada === 'platnik' ? undefined : pdf('na-bursztynie')} />
        {d.ktoSklada === 'platnik' && <p className="mt-1 text-sm text-tekst-drugi">Ten dokument wypełnia płatnik.</p>}
      </li>
    );
  }
  return (
    <li data-kod={d.kod} data-status={d.status} className="flex flex-col gap-1">
      <span className="font-bold">{d.nazwa}</span>
      <span className="text-sm text-tekst-drugi">{opis}</span>
      {d.termin && (
        <span className="text-sm text-tekst-drugi">
          Termin: <Data iso={d.termin} />
        </span>
      )}
      <div className="mt-1">{pdf('drugi')}</div>
    </li>
  );
}

/** Dokumenty w trzech grupach: do złożenia teraz, później, po terminie. Pusta grupa nie jest rysowana. */
export function TrescDokumentow({ dane, rodzina }: { dane: WynikDokumentow; rodzina: Rodzina }) {
  const { wybranyPlan } = useProfil();
  const g = grupujDokumenty(dane.dokumenty);
  const grupy: { etykieta: string; ton: TonStatusu; lista: Dokument[] }[] = [
    { etykieta: 'Do złożenia teraz', ton: 'bursztyn', lista: g.teraz },
    { etykieta: 'Później', ton: 'granat', lista: g.pozniej },
    { etykieta: 'Termin minął', ton: 'blad', lista: g.poTerminie },
  ];
  return (
    <div className="flex flex-col gap-4">
      {dane.dokumenty.length === 0 && <p className="text-tekst-drugi">Na razie nie ma dokumentów do złożenia.</p>}
      {grupy
        .filter((x) => x.lista.length > 0)
        .map((x) => (
          <div key={x.etykieta} className="flex flex-col gap-3 rounded-karta border border-szary-linia bg-white p-4 lg:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-granat lg:text-xl">{x.etykieta}</h3>
              {/* Sama liczba: słowo statusu powtarzałoby nagłówek grupy („Do złożenia teraz” + „Teraz • 2”). */}
              <ZnacznikStatusu etykieta={liczbaDokumentow(x.lista.length)} ton={x.ton} />
            </div>
            <ul className="flex flex-col gap-4">
              {x.lista.map((d) => (
                <Pozycja key={`${d.kod}-${d.ktoSklada}-${d.odcinekId ?? ''}`} d={d} rodzina={rodzina} plan={wybranyPlan} />
              ))}
            </ul>
          </div>
        ))}
      <Link href="/dokumenty" className="inline-flex min-h-11 items-center self-start font-bold text-zielen underline underline-offset-2 hover:text-zielen-ciemna">
        Wszystkie dokumenty
      </Link>
    </div>
  );
}
