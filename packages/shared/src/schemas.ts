import { z } from 'zod';
import {
  COMMENT_MAX_LENGTH,
  MAX_ZOOM,
  MIN_ZOOM,
  PASSWORD_MIN_LENGTH,
  RADIUS_MAX_METERS,
  RADIUS_MIN_METERS,
} from './limits.js';

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);
const categorySlug = z.string().trim().min(1).max(50);

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(200),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const createRequestSchema = z.object({
  category: categorySlug,
  lat: latitude,
  lng: longitude,
  radiusMeters: z.coerce.number().int().min(RADIUS_MIN_METERS).max(RADIUS_MAX_METERS),
  comment: z
    .string()
    .trim()
    .max(COMMENT_MAX_LENGTH)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type CreateRequestInput = z.input<typeof createRequestSchema>;

export const bboxSchema = z
  .string()
  .transform((value, ctx) => {
    const parts = value.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      ctx.addIssue({ code: 'custom', message: 'bbox must be minLng,minLat,maxLng,maxLat' });
      return z.NEVER;
    }
    const [minLng, minLat, maxLng, maxLat] = parts as [number, number, number, number];
    return { minLng, minLat, maxLng, maxLat };
  })
  .refine(
    (b) =>
      b.minLng >= -180 &&
      b.maxLng <= 180 &&
      b.minLat >= -90 &&
      b.maxLat <= 90 &&
      b.minLng < b.maxLng &&
      b.minLat < b.maxLat,
    { message: 'bbox is out of range or inverted' },
  );
export type BBox = z.output<typeof bboxSchema>;

export const demandQuerySchema = z.object({
  bbox: bboxSchema,
  zoom: z.coerce.number().int().min(MIN_ZOOM).max(MAX_ZOOM),
  category: categorySlug.optional(),
});

export const pointQuerySchema = z.object({
  lat: latitude,
  lng: longitude,
  category: categorySlug.optional(),
});
