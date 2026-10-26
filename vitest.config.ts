import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // tests/*.test.mjs are node:test suites (masoretic marks), run by `node --test`.
    include: ['tests/**/*.test.ts'],
    // Corpus-wide assembly tests take ~8s on a slow runner; don't fail a release run on it.
    testTimeout: 30000,
  },
});
