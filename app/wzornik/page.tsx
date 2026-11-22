import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IconCalendarPlus, IconCash, IconFileText } from '@tabler/icons-react';
import {
  Data,
  KafelLiczby,
  Karta,
  KartaRyzyka,
  KomunikatPlanu,
  KomunikatTermin,
  Kwota,
  LicznikPuli,
  Pole,
  Przycisk,
  Rozwijane,
  StanLadowania,
  StanPusty,
  ZnacznikStatusu,
  ZnacznikUprawnienia,
  ZnacznikZrodla,
} from '@/src/components/ui';
import { PrzykladBledu, PrzykladFormularza } from '@/src/components/ui/wzornik/PrzykladyInteraktywne';

// Galeria komponentów toru C. Wszystkie dane są fikcyjne (poród 1 grudnia 2026).
export const metadata: Metadata = {
  title: 'Wzornik komponentów',
  robots: { index: false, follow: false },
};

function Sekcja({ id, tytul, opis, children }: { id: string; tytul: string; opis?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <h2 id={id} className="text-[1.375rem] font-bold text-granat lg:text-2xl">
          {tytul}
        </h2>
        {opis && <p className="mt-1 max-w-prose text-tekst-drugi">{opis}</p>}
      </div>
      {children}
    </section>
  );
}

export default function WzornikPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-8 lg:px-6 lg:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-[1.625rem] font-black leading-tight text-granat lg:text-[2rem]">Wzornik komponentów</h1>
        <p className="max-w-prose text-tekst-drugi">
          Wszystkie elementy interfejsu w jednym miejscu, z fikcyjnymi danymi. Zasady wyglądu opisuje{' '}
          <code className="rounded-przycisk bg-white px-1 text-sm">src/components/design.md</code>.
        </p>
      </header>

      <Sekcja id="kafle" tytul="Kafle liczb (bento)" opis="Jeden ciemnozielony kafel z kwotą główną i jeden zielony z sumą, reszta biała. Bursztyn tylko dla terminów i ostrzeżeń.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KafelLiczby
            kolor="zielen-noc"
            etykieta="Zasiłek macierzyński miesięcznie"
            wartosc={<Kwota wartosc={6903.2} />}
            podpis="100% podstawy przez 20 tygodni"
            ikona={<IconCash size={24} stroke={1.75} />}
          />
          <KafelLiczby kolor="zielen" etykieta="Razem za cały urlop" wartosc={<Kwota wartosc={76412.48} />} podpis="Przed podatkiem" />
          <KafelLiczby etykieta="Koniec urlopu rodzicielskiego" wartosc={<Data iso="2027-11-28" krotko />} podpis="Przy wykorzystaniu całego naraz" />
          <KafelLiczby etykieta="Tygodnie tylko dla taty" wartosc="9 tygodni" podpis="Nie przechodzą na mamę" />
        </div>
        <Karta obramowanie className="grid gap-3 sm:grid-cols-2">
          <KafelLiczby kolor="szary" etykieta="Wariant szary (w białej karcie)" wartosc={<Kwota wartosc={4832.24} />} podpis="70% podstawy" />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-tekst-drugi">Kwoty w trzech rozmiarach</p>
            <Kwota wartosc={6903.2} rozmiar="glowny" className="text-granat" />
            <Kwota wartosc={6903.2} rozmiar="duzy" />
            <Kwota wartosc={6903.2} rozmiar="maly" />
          </div>
        </Karta>
      </Sekcja>

      <Sekcja id="przyciski" tytul="Przyciski">
        <Karta className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Przycisk href="/sytuacja">Zacznij</Przycisk>
            <Przycisk wariant="drugi" href="/plan">
              Zobacz plan
            </Przycisk>
            <Przycisk laduje>Liczymy</Przycisk>
            <Przycisk wariant="drugi" disabled>
              Niedostępny
            </Przycisk>
          </div>
          <div className="rounded-komunikat bg-bursztyn p-4">
            <Przycisk wariant="na-bursztynie" ikona={<IconCalendarPlus size={20} stroke={2} />}>
              Dodaj do kalendarza
            </Przycisk>
          </div>
          <Przycisk pelnaSzerokosc href="/wynik">
            Przycisk na całą szerokość
          </Przycisk>
        </Karta>
      </Sekcja>

      <Sekcja id="formularz" tytul="Pola i wybory" opis="Etykieta zawsze nad polem, błędy pod polem z ikoną, kafelki wyboru jako duże cele dotykowe.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Karta>
            <PrzykladFormularza />
          </Karta>
          <Karta className="flex flex-col gap-6">
            <Pole etykieta="Przewidywana data porodu" typ="date" defaultValue="2026-12-01" znacznik={<ZnacznikZrodla zrodlo="ikp" />} />
            <Pole etykieta="Imię" defaultValue="Anna" znacznik={<ZnacznikZrodla zrodlo="mobywatel" />} />
            <Pole etykieta="Nazwa płatnika" defaultValue="Piekarnia Kłos sp. z o.o." znacznik={<ZnacznikZrodla zrodlo="uzytkownik" />} />
            <Pole etykieta="Ile tygodni urlopu rodzicielskiego bierze tata?" typ="number" przyrostek="tyg." defaultValue="50" blad="Pula urlopu rodzicielskiego to 41 tygodni na rodzinę." />
          </Karta>
        </div>
      </Sekcja>

      <Sekcja id="terminy" tytul="Termin i komunikaty planu">
        <KomunikatTermin
          tytul="Wniosek o zasiłek w wysokości 81,5%"
          data="2026-12-22"
          opis="Termin to 21 dni od porodu. Później zasiłek wyniesie 100% za urlop macierzyński i 70% za rodzicielski."
          akcja={
            <Przycisk wariant="na-bursztynie" href="/kalendarz" ikona={<IconCalendarPlus size={20} stroke={2} />}>
              Dodaj do kalendarza
            </Przycisk>
          }
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <KomunikatPlanu
            komunikat={{
              poziom: 'blad',
              tresc: 'Nie można wrócić do pracy po 10 tygodniach: mama musi wykorzystać co najmniej 14 tygodni urlopu macierzyńskiego po porodzie.',
              coZrobic: 'Proszę przesunąć powrót na 9 marca 2027 albo sprawdzić, czy zachodzi sytuacja szczególna.',
              przepis: 'KP art. 180 § 4',
            }}
          />
          <KomunikatPlanu
            komunikat={{
              poziom: 'ostrzezenie',
              tresc: 'Tata nie wykorzystuje swoich 9 tygodni urlopu rodzicielskiego. Przy tym planie przepadną.',
              coZrobic: 'Warto dodać tacie urlop rodzicielski przed końcem 2032 roku.',
            }}
          />
          <KomunikatPlanu
            komunikat={{
              poziom: 'konsekwencja',
              tresc: 'Jeśli mama wróci po 14 tygodniach, tata przejmuje resztę urlopu macierzyńskiego od następnego dnia.',
              coZrobic: 'Tata składa wniosek co najmniej 14 dni przed przejęciem.',
              przepis: 'KP art. 180 § 5',
            }}
          />
          <KomunikatPlanu
            komunikat={{
              poziom: 'info',
              tresc: 'Zasiłek wypłaci ZUS, bo pracodawca zgłasza do ubezpieczenia chorobowego nie więcej niż 20 osób.',
            }}
          />
        </div>
      </Sekcja>

      <Sekcja id="ryzyka" tytul="Karta ryzyka">
        <KartaRyzyka
          ryzyko={{
            tytul: 'Umowa na czas określony kończy się w trakcie ciąży',
            coMozeSieStac: 'Jeśli umowa skończy się przed porodem i nie przedłuży się, zasiłek macierzyński może nie przysługiwać.',
            dlaczego: 'Umowa przedłuża się do dnia porodu, gdy skończyłaby się po 3. miesiącu ciąży. Nie dotyczy umowy na zastępstwo.',
            coZrobic: 'Proszę sprawdzić datę końca umowy i przekazać pracodawcy zaświadczenie lekarskie o ciąży.',
            coPrzygotowac: ['Umowa o pracę z aneksami', 'Zaświadczenie lekarskie potwierdzające ciążę'],
            przepis: 'KP art. 177 § 3; UZ art. 30 ust. 4',
          }}
        />
      </Sekcja>

      <Sekcja id="znaczniki" tytul="Znaczniki">
        <Karta className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-tekst-drugi">Uprawnienie</p>
            <div className="flex flex-wrap gap-2">
              <ZnacznikUprawnienia przysluguje={true} />
              <ZnacznikUprawnienia przysluguje={false} />
              <ZnacznikUprawnienia przysluguje="warunkowo" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-tekst-drugi">Źródło danych</p>
            <div className="flex flex-wrap gap-2">
              <ZnacznikZrodla zrodlo="ezus" />
              <ZnacznikZrodla zrodlo="mobywatel" />
              <ZnacznikZrodla zrodlo="eurzad_skarbowy" />
              <ZnacznikZrodla zrodlo="formularz_pdf" />
              <ZnacznikZrodla zrodlo="uzytkownik" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-tekst-drugi">Status dokumentów</p>
            <div className="flex flex-wrap gap-2">
              <ZnacznikStatusu etykieta="Teraz" ton="bursztyn" liczba={3} coLiczymy="dokumenty" />
              <ZnacznikStatusu etykieta="Później" ton="granat" liczba={2} coLiczymy="dokumenty" />
              <ZnacznikStatusu etykieta="Po terminie" ton="blad" liczba={0} coLiczymy="dokumentów" />
              <ZnacznikStatusu etykieta="Złożone" ton="zielen" />
            </div>
          </div>
        </Karta>
      </Sekcja>

      <Sekcja id="pule" tytul="Liczniki pul">
        <Karta className="flex flex-col gap-6">
          <LicznikPuli nazwa="Urlop macierzyński – Anna" kolor="macierzynski" pula={20} wykorzystane={20} />
          <LicznikPuli nazwa="Urlop rodzicielski – rodzina" kolor="rodzicielski" pula={41} wykorzystane={23} przepadnie={9} />
          <LicznikPuli nazwa="Urlop ojcowski – Tomasz" kolor="ojcowski" pula={2} wykorzystane={1} />
          <LicznikPuli nazwa="Urlop uzupełniający" kolor="uzupelniajacy" pula={21} wykorzystane={4} jednostka="dni" />
        </Karta>
      </Sekcja>

      <Sekcja id="rozwijane" tytul="Ścieżka wyliczenia">
        <Rozwijane tytul="Jak policzyliśmy 6 903,20 zł">
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>
              Średnie wynagrodzenie z 12 miesięcy: <Kwota wartosc={8000} />
            </li>
            <li>
              Po odliczeniu składek (13,71%): <Kwota wartosc={6903.2} />
            </li>
            <li>
              Zasiłek macierzyński 100% podstawy: <Kwota wartosc={6903.2} className="font-bold" /> miesięcznie
            </li>
          </ol>
          <p className="mt-3 text-sm text-tekst-drugi">UZ art. 36 ust. 1, art. 31 ust. 1. To symulacja. Wynik nie jest decyzją ZUS.</p>
        </Rozwijane>
      </Sekcja>

      <Sekcja id="stany" tytul="Stany: ładowanie, błąd, pusto">
        <div className="grid gap-4 lg:grid-cols-3">
          <StanLadowania />
          <PrzykladBledu />
          <StanPusty
            tytul="Na razie nie ma dokumentów"
            opis="Po uzupełnieniu planu pokażemy tu wnioski do złożenia i terminy."
            ikona={<IconFileText size={32} stroke={1.75} />}
            akcja={
              <Przycisk wariant="drugi" href="/plan">
                Przejdź do planu
              </Przycisk>
            }
          />
        </div>
      </Sekcja>

      <p className="rounded-komunikat bg-granat-ciemny px-4 py-3 text-white">To symulacja. Wynik nie jest decyzją ZUS.</p>
    </main>
  );
}
