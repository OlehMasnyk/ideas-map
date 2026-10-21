import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { createRequest, makeApp, resetDb, signedInAgent } from './helpers.js';

const app = makeApp();
const BBOX = '13.3,52.45,13.5,52.6';

beforeAll(async () => {
  await resetDb();
  const a = await signedInAgent(app);
  const b = await signedInAgent(app);
  // Two cafes and a gym close together, one bakery a few km away.
  await createRequest(a.agent, { category: 'cafe', lat: 52.52, lng: 13.405, radiusMeters: 500 });
  await createRequest(b.agent, { category: 'cafe', lat: 52.5205, lng: 13.4055, radiusMeters: 300 });
  await createRequest(a.agent, { category: 'gym', lat: 52.5202, lng: 13.4052, radiusMeters: 1000 });
  await createRequest(a.agent, { category: 'bakery', lat: 52.48, lng: 13.45, radiusMeters: 400 });
});
afterAll(() => prisma.$disconnect());

describe('GET /api/demand', () => {
  it('aggregates requests into grid cells at low zoom', async () => {
    const res = await request(app).get(`/api/demand?bbox=${BBOX}&zoom=10`).expect(200);
    const total = res.body.cells.reduce((s: number, c: { count: number }) => s + c.count, 0);
    expect(total).toBe(4);
    expect(res.body.cells.length).toBeLessThan(4);
    expect(res.body.cellSizeDegrees).toBeGreaterThan(0);
  });

  it('never returns exact request locations', async () => {
    const res = await request(app).get(`/api/demand?bbox=${BBOX}&zoom=19`).expect(200);
    const cell = res.body.cellSizeDegrees as number;
    for (const c of res.body.cells) {
      expect(Math.abs(c.lat / cell - Math.round(c.lat / cell))).toBeLessThan(1e-6);
      expect(Math.abs(c.lng / cell - Math.round(c.lng / cell))).toBeLessThan(1e-6);
    }
    expect(res.body.cells.some((c: { lat: number }) => c.lat === 52.52)).toBe(false);
  });

  it('filters by category', async () => {
    const res = await request(app).get(`/api/demand?bbox=${BBOX}&zoom=12&category=cafe`);
    const total = res.body.cells.reduce((s: number, c: { count: number }) => s + c.count, 0);
    expect(total).toBe(2);
  });

  it('only includes requests inside the bbox', async () => {
    const res = await request(app).get('/api/demand?bbox=0,0,1,1&zoom=10').expect(200);
    expect(res.body.cells).toEqual([]);
  });

  it('validates the query', async () => {
    await request(app).get('/api/demand?bbox=1,2,3&zoom=10').expect(400);
    await request(app).get(`/api/demand?bbox=${BBOX}&zoom=99`).expect(400);
    await request(app).get('/api/demand').expect(400);
  });
});

describe('GET /api/demand/point', () => {
  it('counts requests whose radius covers the point', async () => {
    const res = await request(app).get('/api/demand/point?lat=52.5203&lng=13.4053').expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.categories).toEqual([
      { category: 'cafe', name: 'Cafe', icon: expect.any(String), count: 2 },
      { category: 'gym', name: 'Gym', icon: expect.any(String), count: 1 },
    ]);
  });

  it('respects each request radius', async () => {
    // ~700 m from the cluster: only the 1 km gym request reaches this far.
    const res = await request(app).get('/api/demand/point?lat=52.5265&lng=13.4053').expect(200);
    expect(res.body.categories.map((c: { category: string }) => c.category)).toEqual(['gym']);
  });

  it('filters by category and handles empty areas', async () => {
    const cafe = await request(app).get('/api/demand/point?lat=52.5203&lng=13.4053&category=cafe');
    expect(cafe.body.total).toBe(2);
    const empty = await request(app).get('/api/demand/point?lat=0&lng=0').expect(200);
    expect(empty.body).toEqual({ lat: 0, lng: 0, total: 0, categories: [] });
  });
});
