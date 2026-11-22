import type { Metadata } from 'next';
import PanelAdmina from './PanelAdmina';

export const metadata: Metadata = {
  title: 'Panel administratora – Zasiłkowy Przewodnik Przyszłego Rodzica',
};

export default function StronaAdmina() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold">Panel administratora: parametry przepisów</h1>
      <PanelAdmina />
    </main>
  );
}
