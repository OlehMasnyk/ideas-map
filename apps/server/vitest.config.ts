import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://ideas:ideas@localhost:5432/ideas_map_test',
    },
  },
});
