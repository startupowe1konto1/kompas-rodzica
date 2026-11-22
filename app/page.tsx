import { CoDostaniesz } from "@/src/components/start/CoDostaniesz";
import { EkranStartowy } from "@/src/components/start/EkranStartowy";
import { TloStartowe } from "@/src/components/start/TloStartowe";

// Ekran startowy (ZADANIA.md, C2). Tytuł strony bierze domyślny z app/layout.tsx.
// Jedno tło (siatka oktagonów) pod pierwszym ekranem i sekcją „Co dostaniesz”: bez twardej krawędzi między nimi.
export default function Home() {
  return (
    <main className="relative isolate flex-1 overflow-clip bg-tlo">
      <TloStartowe />
      <EkranStartowy />
      <CoDostaniesz />
    </main>
  );
}
