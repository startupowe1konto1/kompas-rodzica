import Link from 'next/link';
import { IconExternalLink } from '@tabler/icons-react';
import { ZnakKompasu } from './ZnakKompasu';

/** Linki wymagane w treści zadania (ZADANIA.md, C1). */
export const LINKI_ZEWNETRZNE = [
  { href: 'https://www.zus.pl', nazwa: 'zus.pl', opis: 'Zakład Ubezpieczeń Społecznych' },
  { href: 'https://www.gov.pl/web/rodzina/urlop-rodzicielski', nazwa: 'gov.pl', opis: 'urlop rodzicielski' },
  {
    href: 'https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo',
    nazwa: 'pip.gov.pl',
    opis: 'rodzicielstwo w prawie pracy',
  },
] as const;

const LINKI_WEWNETRZNE = [
  { href: '/trudne-sytuacje', nazwa: 'Trudne sytuacje' },
  { href: '/inne-wsparcie', nazwa: 'Inne wsparcie' },
  { href: '/kalkulator', nazwa: 'Szybki kalkulator' },
  { href: '/faq', nazwa: 'Najczęstsze pytania (FAQ)' },
  { href: '/dostepnosc', nazwa: 'Dostępność' },
] as const;

// Na zieleni obrys fokusu jest biały (granat ma tu za mały kontrast). `!` bije globalną regułę
// `:focus-visible` z globals.css, która jest poza warstwami Tailwinda.
const LINK = 'rounded-przycisk font-bold text-white underline underline-offset-4 hover:decoration-2 focus-visible:outline-white!';

export function Stopka() {
  return (
    <footer className="mt-auto bg-zielen text-white">
      {/* Dolny odstęp z env(safe-area-inset-bottom): na iPhonie treść stopki nie wchodzi pod pasek gestów. */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] md:grid-cols-3 md:pt-10 md:pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <div>
          {/* Link do strony głównej (WCAG 2.4.5): po usunięciu belki z nazwą w nagłówku to jedyna stała droga na start.
              Pierwszy wiersz wszystkich trzech kolumn ma tę samą wysokość (min-h-11) i ten sam tekst (1 rem, 700), więc linie się zgrywają. */}
          {/* Nazwa aplikacji jako napis jak nagłówki kolumn obok, nie link: wyglądała na klikalną (uwaga Wojtka 22.11). */}
          {/* Znak bez kafla (naZieleni): zielony kafel zlałby się z tłem stopki. */}
          <p className="flex min-h-11 items-center gap-2.5 text-base leading-6 font-bold">
            <ZnakKompasu rozmiar={36} naZieleni className="shrink-0" />
            Kompas Rodzica
          </p>
          <p className="text-sm">Zasiłkowy przewodnik przyszłego rodzica.</p>
          <p className="mt-2 text-sm">To symulacja. Wynik nie jest decyzją ZUS. Dane zostają w tej przeglądarce.</p>
        </div>

        <div>
          <h2 className="flex min-h-11 items-center text-base leading-6 font-bold">Oficjalne informacje</h2>
          <ul className="space-y-1">
            {LINKI_ZEWNETRZNE.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${LINK} inline-flex min-h-11 items-center gap-1.5`}
                >
                  <span>
                    {l.nazwa} – {l.opis}
                  </span>
                  <IconExternalLink size={16} stroke={2} aria-hidden="true" className="shrink-0" />
                  <span className="sr-only">(otwiera się w nowej karcie)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="flex min-h-11 items-center text-base leading-6 font-bold">W przewodniku</h2>
          <ul className="space-y-1">
            {LINKI_WEWNETRZNE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`${LINK} inline-flex min-h-11 items-center`}>
                  {l.nazwa}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
