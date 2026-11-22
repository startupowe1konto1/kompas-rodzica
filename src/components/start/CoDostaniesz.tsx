import { IconCalendarDue, IconCoins, IconScale, IconUsers, type Icon } from '@tabler/icons-react';

const KORZYSCI: { ikona: Icon; tytul: string; opis: string }[] = [
  {
    ikona: IconCoins,
    tytul: 'Wysokość zasiłku',
    opis: 'Kwoty brutto i netto, miesiąc po miesiącu i za cały urlop.',
  },
  {
    ikona: IconUsers,
    tytul: 'Kolejność urlopów',
    opis: 'Urlopy obojga rodziców po kolei, od porodu do powrotu do pracy.',
  },
  {
    ikona: IconScale,
    tytul: 'Decyzje i terminy wyboru',
    opis: 'Co i do kiedy trzeba wybrać, np. 81,5% albo 100% i 70%. Widać, co zmienia każdy wybór.',
  },
  {
    ikona: IconCalendarDue,
    tytul: 'Gotowe wnioski i terminy',
    opis: 'Wnioski wypełnione Pani/Pana danymi i terminy do dodania do kalendarza.',
  },
];

/**
 * Sekcja pod ekranem startowym: cztery kafle informacyjne (nie przyciski). Ikona bez wypełnionego
 * kwadratu, sam kolor zieleni; bez cieni i efektów hover, żeby kafel nie wyglądał na klikalny.
 */
export function CoDostaniesz() {
  return (
    <section aria-labelledby="co-dostaniesz" className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
      <h2 id="co-dostaniesz" className="text-[1.375rem] leading-tight font-bold text-granat md:text-2xl">
        Co Pani/Pan otrzyma
      </h2>
      <ul className="mt-5 grid gap-3 md:mt-6 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {KORZYSCI.map(({ ikona: Ikona, tytul, opis }) => (
          <li key={tytul} className="flex gap-3 rounded-karta bg-white p-4 md:flex-col md:gap-3 md:p-6">
            <Ikona size={28} stroke={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-zielen md:mt-0" />
            <div>
              <h3 className="text-lg leading-snug font-bold text-tekst md:text-xl">{tytul}</h3>
              <p className="mt-1 text-tekst-drugi">{opis}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
