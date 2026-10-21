import { describe, expect, it } from 'vitest';
import { createRequestSchema, credentialsSchema, demandQuerySchema } from './schemas.js';

describe('credentialsSchema', () => {
  it('normalizes email', () => {
    const r = credentialsSchema.parse({ email: '  Foo@Example.COM ', password: 'password1' });
    expect(r.email).toBe('foo@example.com');
  });

  it('rejects short passwords', () => {
    expect(credentialsSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(false);
  });
});

describe('createRequestSchema', () => {
  it('accepts a valid request and drops empty comment', () => {
    const r = createRequestSchema.parse({
      category: 'cafe',
      lat: '52.5',
      lng: 13.4,
      radiusMeters: 500,
      comment: '   ',
    });
    expect(r).toEqual({ category: 'cafe', lat: 52.5, lng: 13.4, radiusMeters: 500 });
  });

  it('rejects radius out of range', () => {
    const base = { category: 'cafe', lat: 0, lng: 0 };
    expect(createRequestSchema.safeParse({ ...base, radiusMeters: 50 }).success).toBe(false);
    expect(createRequestSchema.safeParse({ ...base, radiusMeters: 5000 }).success).toBe(false);
  });
});

describe('demandQuerySchema', () => {
  it('parses bbox', () => {
    const r = demandQuerySchema.parse({ bbox: '13.3,52.4,13.5,52.6', zoom: '14' });
    expect(r.bbox).toEqual({ minLng: 13.3, minLat: 52.4, maxLng: 13.5, maxLat: 52.6 });
    expect(r.zoom).toBe(14);
  });

  it('rejects malformed or inverted bbox', () => {
    expect(demandQuerySchema.safeParse({ bbox: '1,2,3', zoom: 10 }).success).toBe(false);
    expect(demandQuerySchema.safeParse({ bbox: '5,5,1,1', zoom: 10 }).success).toBe(false);
  });
});
