import { IconArrowDown } from '@tabler/icons-react';
import { klasyPrzycisku, polacz } from '../ui';
import { ZnakKompasu } from '../uklad/ZnakKompasu';

/**
 * Intro aplikacji: pierwszy pełny ekran strony startowej (decyzja Wojtka 21.11: „musi być pierwsze
 * intro do aplikacji”). Nazwa przewodnika, jedno zdanie, co robi, i jeden przycisk „Zaczynamy”,
 * który przewija do wyboru, jak zacząć (#start-wybor). Zwykła kotwica, bez skryptu; płynne
 * przewijanie daje start.css (wyłączone przy prefers-reduced-motion).
 * Tło (siatka oktagonów) leży pod całą stroną w app/page.tsx.
 */
export function IntroStartowe() {
  return (
    <section
      id="start-intro"
      aria-labelledby="start-naglowek"
      className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col justify-center px-4 py-12 md:min-h-[calc(100dvh-3.5rem)] md:py-16"
    >
      {/* Marka nad h1: znak, nazwa i hasło. Nazwa nie jest nagłówkiem, h1 zostaje opisem tego, co robi aplikacja. */}
      <div className="start-wjazd flex items-center gap-3 md:gap-4">
        <ZnakKompasu rozmiar={56} className="shrink-0 md:h-16 md:w-16" />
        <div className="flex flex-col">
          <p className="text-2xl leading-tight font-black tracking-[-0.01em] text-granat md:text-3xl">Kompas Rodzica</p>
          <p className="text-base font-bold text-tekst-drugi md:text-lg">Ile, od kiedy i co złożyć.</p>
        </div>
      </div>

      <h1
        id="start-naglowek"
        className="start-wjazd mt-5 max-w-4xl text-[2.5rem] leading-[1.05] font-black tracking-[-0.02em] text-balance text-granat md:mt-6 md:text-7xl md:leading-[1.02]"
      >
        Zasiłki i urlopy dla rodziców w jednym planie
      </h1>

      <p className="start-wjazd mt-5 max-w-2xl text-lg leading-snug text-tekst md:mt-6 md:text-2xl">
        Od ciąży do powrotu do pracy: kwota zasiłku, plan urlopów obojga rodziców i wnioski z terminami.
      </p>

      <div className="start-wjazd mt-8 flex flex-col items-start gap-4 md:mt-10">
        <a
          href="#start-wybor"
          data-kontrast-wlasny
          className={polacz(klasyPrzycisku('glowny'), 'min-h-14 px-7 text-lg')}
        >
          Zaczynamy
          <IconArrowDown size={22} stroke={2.25} aria-hidden="true" className="shrink-0" />
        </a>
        <p className="text-sm text-tekst-drugi md:text-base">To symulacja. Wynik nie jest decyzją ZUS.</p>
      </div>
    </section>
  );
}
