import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { defaultRateLimits } from '../src/rateLimits.js';
import { makeApp, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('rate limiting', () => {
  it('limits repeated login attempts', async () => {
    const app = makeApp({ rateLimits: { ...defaultRateLimits, authPer15Minutes: 3 } });
    const body = { email: 'brute@example.com', password: 'password123' };
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/auth/login').send(body).expect(401);
    }
    const res = await request(app).post('/api/auth/login').send(body).expect(429);
    expect(res.body.error).toMatch(/Too many/);
  });

  it('does not limit read-only endpoints with the auth limiter', async () => {
    const app = makeApp({ rateLimits: { ...defaultRateLimits, authPer15Minutes: 1 } });
    for (let i = 0; i < 3; i++) {
      await request(app).get('/api/auth/me').expect(200);
    }
  });
});
