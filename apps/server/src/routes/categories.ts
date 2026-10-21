import { Router } from 'express';
import type { Category } from '@ideas-map/shared';
import { prisma } from '../db.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const categories: Category[] = await prisma.category.findMany({ orderBy: { id: 'asc' } });
  res.set('Cache-Control', 'public, max-age=300').json(categories);
});
