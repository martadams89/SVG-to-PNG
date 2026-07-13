import { defineConfig } from 'vitest/config';

// Standalone config so Vitest runs the pure helpers in a plain Node context
// without loading the Vite/React build plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
