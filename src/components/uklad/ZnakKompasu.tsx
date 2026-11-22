/**
 * Znak Kompasu Rodzica: śpiący bobas w kompasie, bursztynowa strzałka przechylona w prawo.
 * Wzór i pliki SVG: docs/nazwa-i-logo/. Rysunek własny, bez godła i logotypów ZUS, mObywatela, gov.pl.
 *
 * Domyślnie w zielonym kaflu. `naZieleni`: bez kafla, do położenia wprost na zielonym tle (stopka),
 * gdzie kafel zlałby się z tłem. Znak jest ozdobą obok nazwy, więc aria-hidden; nazwa stoi obok jako tekst.
 */
export function ZnakKompasu({
  rozmiar = 48,
  naZieleni = false,
  className,
}: {
  rozmiar?: number;
  naZieleni?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={rozmiar}
      height={rozmiar}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {!naZieleni && <rect width="64" height="64" rx="15" fill="#007834" />}
      <circle cx="32" cy="33" r="25" fill="none" stroke="#fff" strokeWidth="3.5" />
      <circle cx="32" cy="33" r="20.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="1.6 3.77" opacity=".75" />
      <path d="M32 2 L38 13.5 H26 Z" fill="#fab856" transform="rotate(30 32 33)" />
      <g transform="translate(7 7.2) scale(0.78125)">
        <circle cx="15.5" cy="36" r="4.5" fill="#fff" />
        <circle cx="48.5" cy="36" r="4.5" fill="#fff" />
        <circle cx="32" cy="35" r="17" fill="#fff" />
        <path d="M32 19 C30.5 13.5 37 11 39.5 14.5 C41.2 17 38 19.6 35.8 17.6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M24 34.5 q3 3.2 6 0 M34 34.5 q3 3.2 6 0" fill="none" stroke="#00416e" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="22.5" cy="40.5" r="2.7" fill="#fab856" />
        <circle cx="41.5" cy="40.5" r="2.7" fill="#fab856" />
        <path d="M29.2 43.2 q2.8 2.6 5.6 0" fill="none" stroke="#00416e" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
