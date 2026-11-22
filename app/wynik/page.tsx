import type { Metadata } from "next";
import { EkranWyniku } from "../../src/components/wynik/EkranWyniku";

export const metadata: Metadata = {
  title: "Wynik",
};

export default function WynikPage() {
  return <EkranWyniku />;
}
