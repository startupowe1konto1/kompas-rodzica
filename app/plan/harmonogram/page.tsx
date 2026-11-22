import type { Metadata } from "next";
import { HarmonogramWyplat } from "../../../src/components/harmonogram/HarmonogramWyplat";

export const metadata: Metadata = {
  title: "Harmonogram wypłat",
};

export default function HarmonogramPage() {
  return <HarmonogramWyplat />;
}
