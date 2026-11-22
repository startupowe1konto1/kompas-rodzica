import type { NextConfig } from "next";

// Świadomie bez `cacheComponents` i `partialPrefetching`: strony to lekkie powłoki,
// a dane idą przez REST (/api/*). Klasyczny model renderowania = mniej niespodzianek przy buildzie.
const nextConfig: NextConfig = {
  // Trasy wniosków czytają z dysku wzór ZAM i fonty (src/forms/wspolne.ts, process.cwd()). Śledzenie plików
  // tego nie widzi, więc bez tego na hostingu bezserwerowym plików by zabrakło. Klucz = ścieżka trasy (picomatch),
  // wartości = globy od katalogu projektu (node_modules/next/dist/docs/.../next-config-js/output.md).
  outputFileTracingIncludes: {
    "/api/forms/*": ["./materialy/ZUS/wzory-formularzy/ZAM_edytowalny.pdf", "./src/forms/fonts/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
