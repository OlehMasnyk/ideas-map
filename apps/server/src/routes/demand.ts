import { Router } from 'express';
import { demandQuerySchema, pointQuerySchema } from '@ideas-map/shared';
import { getDemandCells, getPointDemand } from '../demand.js';

export const demandRouter = Router();

demandRouter.get('/', async (req, res) => {
  const { bbox, zoom, category } = demandQuerySchema.parse(req.query);
  res.json(await getDemandCells(bbox, zoom, category));
});

demandRouter.get('/point', async (req, res) => {
  const { lat, lng, category } = pointQuerySchema.parse(req.query);
  res.json(await getPointDemand(lat, lng, category));
});
