import { Router } from 'express';
import { z } from 'zod';
import {
  createRequestSchema,
  MAX_REQUESTS_PER_USER_PER_CATEGORY,
  type DemandRequest,
} from '@ideas-map/shared';
import { prisma } from '../db.js';
import { HttpError } from '../errors.js';
import { currentUserId, requireAuth } from '../auth.js';

export const requestsRouter = Router();
requestsRouter.use(requireAuth);

requestsRouter.post('/', async (req, res) => {
  const userId = currentUserId(res);
  const input = createRequestSchema.parse(req.body);

  const created = await prisma.$transaction(async (tx) => {
    // Serialize creates per user so the per-category limit can't be raced past.
    const users = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    if (users.length === 0) throw new HttpError(401, 'Authentication required');

    const category = await tx.category.findUnique({ where: { slug: input.category } });
    if (!category) throw new HttpError(400, `Unknown category "${input.category}"`);

    const existing = await tx.demandRequest.count({
      where: { userId, categoryId: category.id },
    });
    if (existing >= MAX_REQUESTS_PER_USER_PER_CATEGORY) {
      throw new HttpError(
        409,
        `You can have at most ${MAX_REQUESTS_PER_USER_PER_CATEGORY} requests per category. Delete an old one first.`,
      );
    }

    const rows = await tx.$queryRaw<DemandRequest[]>`
      INSERT INTO demand_requests (id, user_id, category_id, location, radius_meters, comment)
      VALUES (
        gen_random_uuid(),
        ${userId}::uuid,
        ${category.id},
        ST_SetSRID(ST_MakePoint(${input.lng}::float8, ${input.lat}::float8), 4326)::geography,
        ${input.radiusMeters},
        ${input.comment ?? null}
      )
      RETURNING
        id,
        ${category.slug} AS category,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        radius_meters AS "radiusMeters",
        comment,
        created_at AS "createdAt"`;
    return rows[0]!;
  });

  res.status(201).json(created);
});

requestsRouter.get('/mine', async (_req, res) => {
  const userId = currentUserId(res);
  const rows = await prisma.$queryRaw<DemandRequest[]>`
    SELECT
      d.id,
      c.slug AS category,
      ST_Y(d.location::geometry) AS lat,
      ST_X(d.location::geometry) AS lng,
      d.radius_meters AS "radiusMeters",
      d.comment,
      d.created_at AS "createdAt"
    FROM demand_requests d
    JOIN categories c ON c.id = d.category_id
    WHERE d.user_id = ${userId}::uuid
    ORDER BY d.created_at DESC`;
  res.json(rows);
});

requestsRouter.delete('/:id', async (req, res) => {
  const userId = currentUserId(res);
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'Request not found');
  const { count } = await prisma.demandRequest.deleteMany({ where: { id: id.data, userId } });
  if (count === 0) throw new HttpError(404, 'Request not found');
  res.status(204).end();
});
