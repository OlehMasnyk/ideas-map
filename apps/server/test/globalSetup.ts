import { execSync } from 'node:child_process';
import path from 'node:path';

const serverDir = path.resolve(import.meta.dirname, '..');

export default function setup() {
  const env = {
    ...process.env,
    DATABASE_URL:
      process.env.TEST_DATABASE_URL ?? 'postgresql://ideas:ideas@localhost:5432/ideas_map_test',
  };
  execSync('npx prisma migrate deploy', { cwd: serverDir, env, stdio: 'pipe' });
  execSync('npx tsx prisma/seed.ts', { cwd: serverDir, env, stdio: 'pipe' });
}
