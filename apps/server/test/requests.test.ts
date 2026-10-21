import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { MAX_REQUESTS_PER_USER_PER_CATEGORY } from '@ideas-map/shared';
import { prisma } from '../src/db.js';
import { createRequest, makeApp, resetDb, signedInAgent } from './helpers.js';

const app = makeApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('demand requests', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/requests/mine').expect(401);
    await request(app)
      .post('/api/requests')
      .send({ category: 'cafe', lat: 1, lng: 1, radiusMeters: 500 })
      .expect(401);
  });

  it('creates and lists a request', async () => {
    const { agent } = await signedInAgent(app);
    const res = await createRequest(agent, { comment: '  Good coffee  ' }).expect(201);
    expect(res.body).toMatchObject({
      category: 'cafe',
      lat: 52.52,
      lng: 13.405,
      radiusMeters: 500,
      comment: 'Good coffee',
    });

    const mine = await agent.get('/api/requests/mine').expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].id).toBe(res.body.id);
  });

  it('only lists your own requests', async () => {
    const a = await signedInAgent(app);
    const b = await signedInAgent(app);
    await createRequest(a.agent).expect(201);
    const mine = await b.agent.get('/api/requests/mine').expect(200);
    expect(mine.body).toEqual([]);
  });

  it('rejects unknown categories and invalid input', async () => {
    const { agent } = await signedInAgent(app);
    await createRequest(agent, { category: 'spaceport' }).expect(400);
    await createRequest(agent, { radiusMeters: 10 }).expect(400);
    await createRequest(agent, { lat: 120 }).expect(400);
  });

  it(`limits each user to ${MAX_REQUESTS_PER_USER_PER_CATEGORY} requests per category`, async () => {
    const { agent } = await signedInAgent(app);
    for (let i = 0; i < MAX_REQUESTS_PER_USER_PER_CATEGORY; i++) {
      await createRequest(agent).expect(201);
    }
    await createRequest(agent).expect(409);
    await createRequest(agent, { category: 'gym' }).expect(201);
  });

  it('enforces the limit under concurrent creates', async () => {
    const { agent } = await signedInAgent(app);
    const results = await Promise.all(
      Array.from({ length: MAX_REQUESTS_PER_USER_PER_CATEGORY + 3 }, () => createRequest(agent)),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(
      MAX_REQUESTS_PER_USER_PER_CATEGORY,
    );
  });

  it("deletes your own requests but not other people's", async () => {
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app);
    const { body } = await createRequest(owner.agent).expect(201);

    await other.agent.delete(`/api/requests/${body.id}`).expect(404);
    await owner.agent.delete(`/api/requests/${body.id}`).expect(204);
    await owner.agent.delete(`/api/requests/${body.id}`).expect(404);
    await owner.agent.delete('/api/requests/not-a-uuid').expect(404);
  });
});
