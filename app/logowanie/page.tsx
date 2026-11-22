import type { Metadata } from "next";
import { EkranLogowania } from "@/src/components/start/EkranLogowania";

export const metadata: Metadata = {
  title: "Zaloguj się (symulacja)",
};

export default function LogowaniePage() {
  return <EkranLogowania />;
}
