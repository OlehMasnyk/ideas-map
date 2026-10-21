import request from 'supertest';
import type { CreateRequestInput } from '@ideas-map/shared';
import { createApp, type AppOptions } from '../src/app.js';
import { prisma } from '../src/db.js';

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE demand_requests, users CASCADE');
}

export function makeApp(options: AppOptions = { rateLimits: false }) {
  return createApp(options);
}

let userCounter = 0;

/** Registers a fresh user and returns a supertest agent that carries their auth cookie. */
export async function signedInAgent(app: ReturnType<typeof makeApp>) {
  const agent = request.agent(app);
  const email = `user${++userCounter}-${Date.now()}@test.local`;
  await agent.post('/api/auth/register').send({ email, password: 'password123' }).expect(201);
  return { agent, email };
}

export function createRequest(
  agent: ReturnType<typeof request.agent>,
  input: Partial<CreateRequestInput> = {},
) {
  return agent
    .post('/api/requests')
    .send({ category: 'cafe', lat: 52.52, lng: 13.405, radiusMeters: 500, ...input });
}
