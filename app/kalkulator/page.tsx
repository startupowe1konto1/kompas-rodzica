import type { Metadata } from "next";
import { Kalkulator } from "../../src/components/kalkulator/Kalkulator";

export const metadata: Metadata = {
  title: "Szybki kalkulator",
};

export default function KalkulatorPage() {
  return <Kalkulator />;
}
