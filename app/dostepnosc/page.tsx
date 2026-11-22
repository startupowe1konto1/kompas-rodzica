import type { Metadata } from "next";

// Deklaracja dostępności według struktury z ustawy z 4 kwietnia 2019 r. o dostępności cyfrowej stron internetowych
// i aplikacji mobilnych podmiotów publicznych (art. 10) i wzoru ministra cyfryzacji. Stan z samooceny zespołu
// (audyt automatyczny Playwright, kontrast, klawiatura, reflow) z 21.11.2026. Bez danych kontaktowych osób.

export const metadata: Metadata = {
  title: "Deklaracja dostępności",
};

const DATA_PRZEGLADU = "21 listopada 2026";

export default function DostepnoscPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-granat lg:text-3xl">Deklaracja dostępności</h1>
        <p className="max-w-prose text-lg leading-normal">
          Chcemy, żeby z Zasiłkowego Przewodnika Przyszłego Rodzica mógł skorzystać każdy, także osoba z niepełnosprawnością. Ta deklaracja
          dotyczy prototypu przygotowanego na HackNation 2026.
        </p>
      </div>

      <section aria-labelledby="stan" className="flex flex-col gap-3 rounded-karta bg-white p-4 lg:p-6">
        <h2 id="stan" className="text-xl font-bold text-granat lg:text-2xl">
          Stan dostępności
        </h2>
        <p className="max-w-prose leading-normal">
          Aplikacja jest <strong>częściowo zgodna</strong> z ustawą o dostępności cyfrowej stron internetowych i aplikacji mobilnych podmiotów
          publicznych oraz ze standardem WCAG 2.1 na poziomie AA (norma EN 301 549).
        </p>
        <h3 className="text-lg font-bold">Co już działa</h3>
        <ul className="ml-5 flex max-w-prose list-disc flex-col gap-1 leading-normal">
          <li>Kontrast tekstu co najmniej 4,5:1, a ramek pól i ikon co najmniej 3:1.</li>
          <li>Całą aplikację można obsłużyć klawiaturą. Fokus jest zawsze widoczny, a na początku strony jest link „Przejdź do treści”.</li>
          <li>Przyciski i pola mają co najmniej 44 na 44 piksele.</li>
          <li>Każde pole ma widoczną etykietę, a błąd pokazuje się przy polu.</li>
          <li>Oś czasu ma równoważny widok listy, a wykres – tabelę z tymi samymi danymi.</li>
          <li>Strona działa przy powiększeniu 200% i na ekranie o szerokości 320 pikseli.</li>
          <li>Po włączeniu w systemie ograniczenia ruchu animacje się wyłączają.</li>
        </ul>
        <h3 className="text-lg font-bold">Czego jeszcze nie sprawdziliśmy albo co jest do poprawy</h3>
        <ul className="ml-5 flex max-w-prose list-disc flex-col gap-1 leading-normal">
          <li>Nie przeprowadziliśmy jeszcze pełnego testu z czytnikiem ekranu (NVDA, VoiceOver).</li>
          <li>Planer na osi czasu ma dużo elementów do przejścia klawiszem Tab. Pracujemy nad krótszą drogą.</li>
          <li>Wnioski do wydruku (pliki PDF) są wzorami formularzy i mogą nie być w pełni dostępne dla czytników ekranu.</li>
        </ul>
      </section>

      <section aria-labelledby="jak" className="flex flex-col gap-3 rounded-karta bg-white p-4 lg:p-6">
        <h2 id="jak" className="text-xl font-bold text-granat lg:text-2xl">
          Jak dopasować stronę do siebie
        </h2>
        <ul className="ml-5 flex max-w-prose list-disc flex-col gap-1 leading-normal">
          <li>Tekst powiększa się skrótem Ctrl i + (na Macu Cmd i +), a pomniejsza Ctrl i −.</li>
          <li>Tryb wysokiego kontrastu można włączyć w ustawieniach systemu (Windows: Ustawienia → Ułatwienia dostępu → Motywy kontrastu).</li>
          <li>Kolejne elementy wybiera się klawiszem Tab, a przyciski i pola wyboru – Spacją albo Enterem.</li>
        </ul>
      </section>

      <section aria-labelledby="przygotowanie" className="flex flex-col gap-3 rounded-karta bg-white p-4 lg:p-6">
        <h2 id="przygotowanie" className="text-xl font-bold text-granat lg:text-2xl">
          Przygotowanie deklaracji
        </h2>
        <p className="max-w-prose leading-normal">
          Deklarację przygotowaliśmy {DATA_PRZEGLADU} na podstawie samooceny zespołu projektu: automatycznego pomiaru kontrastu, rozmiaru
          elementów i struktury strony na wszystkich ekranach oraz ręcznej próby obsługi klawiaturą.
        </p>
        <p className="max-w-prose leading-normal">
          To symulacja przygotowana na hackathon. Po wdrożeniu w ZUS deklaracja powinna zawierać dane kontaktowe do zgłaszania problemów
          z dostępnością i informację o procedurze odwoławczej.
        </p>
      </section>
    </main>
  );
}
