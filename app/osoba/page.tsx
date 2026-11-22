import type { Metadata } from "next";
import { Suspense } from "react";
import { EkranDodajOsobe } from "@/src/components/osoba/EkranDodajOsobe";
import { StanLadowania } from "@/src/components/ui";

export const metadata: Metadata = {
  title: "Dodaj osobę",
};

// Tor C, C4. Którą osobę wypełniamy, mówi adres (?osoba=<id>), więc ekran czyta parametry w Suspense.
export default function OsobaPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
          <h1 className="text-2xl font-black text-granat">Dodaj osobę</h1>
          <StanLadowania />
        </main>
      }
    >
      <EkranDodajOsobe />
    </Suspense>
  );
}
