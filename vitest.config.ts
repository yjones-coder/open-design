import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'jsdom',
    include: [
      'apps/web/src/**/*.test.{ts,tsx,js,mjs,cjs}',
      'apps/daemon/**/*.test.{ts,tsx,js,mjs,cjs}',
      'tests/**/*.test.{ts,tsx}',
    ],
  },
});
