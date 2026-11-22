import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // `sprawy/` to lokalne złote testy ze spraw ZUS – folder jest poza repozytorium (.gitignore).
    include: ['src/**/*.test.ts', 'sprawy/**/*.test.ts'],
  },
});
