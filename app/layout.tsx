import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { NaGorePoZmianie } from "@/src/components/uklad/NaGorePoZmianie";
import { PasekKrokow } from "@/src/components/uklad/PasekKrokow";
import { Stopka } from "@/src/components/uklad/Stopka";
import { ZuSik } from "@/src/components/czat/ZuSik";
import { ProfilProvider } from "@/src/state/profil";
import "./globals.css";

// Lato jak na zus.pl (SIL OFL 1.1). latin-ext jest konieczny dla polskich znaków (ą, ę, ł, ż…).
const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700", "900"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Kompas Rodzica",
    default: "Kompas Rodzica – ile, od kiedy i co złożyć",
  },
  description:
    "Zasiłki i urlopy w ciąży i po urodzeniu dziecka: co przysługuje, jak je zaplanować na osi czasu i jakie wnioski przygotować. Symulacja – wynik nie jest decyzją ZUS.",
};

// Układ zostaje komponentem serwerowym; części zależne od przeglądarki (pasek kroków,
// „Zacznij od nowa”) są w osobnych plikach 'use client' w src/components/uklad/.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pl"
      className={`${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ProfilProvider>
          <a
            href="#tresc"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-przycisk focus:bg-granat focus:px-4 focus:py-3 focus:font-bold focus:text-white"
          >
            Przejdź do treści
          </a>
          <NaGorePoZmianie />
          <PasekKrokow />
          {/* tabIndex -1: link „Przejdź do treści” przenosi tu fokus, nie tylko przewija.
              Przyklejony pasek akcji na telefonie (design.md) kładź jako ostatnie dziecko strony
              z `sticky bottom-0` i `pb-[env(safe-area-inset-bottom)]`, nie `fixed`: wtedy trzyma się
              dołu ekranu, a na końcu strony staje nad stopką zamiast ją zasłaniać. Żaden przodek
              (ten div, body) nie ma overflow, więc sticky działa. Wysokość ekranu: 100dvh, nie 100vh. */}
          <div id="tresc" tabIndex={-1} className="flex flex-1 flex-col outline-none!">
            {children}
          </div>
          <Stopka />
          {/* ZuSik – czat o planie (AI). Sam się ukrywa w /admin oraz bez klucza API. */}
          <ZuSik />
        </ProfilProvider>
      </body>
    </html>
  );
}
