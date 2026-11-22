import { IntroStartowe } from './IntroStartowe';
import { Wejscia } from './Wejscia';
// Arkusz tła ekranu startowego (jedyne miejsce importu).
import './start.css';
// Animacja wejścia intro i kafli.
import './wejscie.css';

/**
 * Ekran startowy (ZADANIA.md, C2): najpierw intro na cały ekran (IntroStartowe, z h1), pod nim wybór,
 * jak zacząć: cztery wejścia w jednej siatce (login.gov.pl, ręcznie, wniosek PDF, szybki kalkulator).
 * Przycisk „Zaczynamy” w intro prowadzi kotwicą do #start-wybor (tabIndex -1: fokus idzie za przewinięciem).
 * Tło (TloStartowe) leży w app/page.tsx pod intro, wyborem i sekcją „Co dostaniesz” naraz.
 */
export function EkranStartowy() {
  return (
    <>
      <IntroStartowe />

      <section
        id="start-wybor"
        tabIndex={-1}
        aria-labelledby="start-wybor-naglowek"
        className="relative scroll-mt-4 text-tekst outline-none"
      >
        <div id="start-tresc" className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6 pb-8 md:gap-6 md:pt-10 md:pb-14">
          <h2
            id="start-wybor-naglowek"
            className="text-[1.5rem] leading-tight font-black tracking-[-0.01em] text-granat md:text-4xl"
          >
            Jak zacząć?
          </h2>
          <Wejscia />
        </div>
      </section>
    </>
  );
}
