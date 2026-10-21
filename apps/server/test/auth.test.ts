import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { makeApp, resetDb } from './helpers.js';

const app = makeApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('auth', () => {
  it('registers, reads the session and logs out', async () => {
    const agent = request.agent(app);
    const reg = await agent
      .post('/api/auth/register')
      .send({ email: 'New@Example.com', password: 'password123' })
      .expect(201);
    expect(reg.body).toEqual({ id: expect.any(String), email: 'new@example.com' });
    expect(reg.headers['set-cookie']?.[0]).toMatch(/dm_token=.*HttpOnly/);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.email).toBe('new@example.com');

    await agent.post('/api/auth/logout').expect(204);
    const after = await agent.get('/api/auth/me').expect(200);
    expect(after.body).toBeNull();
  });

  it('does not store plain-text passwords', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'hash@example.com', password: 'password123' })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'hash@example.com' } });
    expect(user.passwordHash).not.toContain('password123');
  });

  it('rejects duplicate emails', async () => {
    const body = { email: 'dup@example.com', password: 'password123' };
    await request(app).post('/api/auth/register').send(body).expect(201);
    const res = await request(app).post('/api/auth/register').send(body).expect(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  it('validates input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nope', password: 'short' })
      .expect(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('logs in with correct credentials only', async () => {
    const body = { email: 'login@example.com', password: 'password123' };
    await request(app).post('/api/auth/register').send(body).expect(201);
    await request(app).post('/api/auth/login').send(body).expect(200);
    await request(app)
      .post('/api/auth/login')
      .send({ ...body, password: 'wrong-password' })
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ ...body, email: 'other@example.com' })
      .expect(401);
  });

  it('ignores tampered tokens', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'dm_token=not-a-real-token')
      .expect(200);
    expect(res.body).toBeNull();
  });
});
